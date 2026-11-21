import types
import unittest
from itertools import pairwise
from unittest.mock import MagicMock

import torch
from torch import nn

from app.model import ActivationEngine, GenerationState, ModelEngine


class DummyCache:
    """Mock DynamicCache for unit testing KV cache truncation."""
    def __init__(self, seq_len: int = 20, num_layers: int = 2):
        self.key_cache = [torch.randn(1, 4, seq_len, 16) for _ in range(num_layers)]
        self.value_cache = [torch.randn(1, 4, seq_len, 16) for _ in range(num_layers)]
        self._seen_tokens = seq_len


class TestGenerationState(unittest.TestCase):
    def test_initialization(self):
        state = GenerationState()
        self.assertIsNone(state.past_key_values)
        self.assertEqual(state.positions_done, 0)

    def test_trim_dummy_cache(self):
        cache = DummyCache(seq_len=20)
        state = GenerationState(past_key_values=cache, positions_done=20)

        # Trim to keep last 10 positions
        state.trim_cache(10)
        self.assertIsNotNone(state.past_key_values)
        self.assertEqual(state.past_key_values.key_cache[0].shape[-2], 10)
        self.assertEqual(state.past_key_values.value_cache[0].shape[-2], 10)

    def test_trim_tuple_cache(self):
        # Tuple format: tuple of (key, value) per layer
        layer1_k = torch.randn(1, 4, 15, 16)
        layer1_v = torch.randn(1, 4, 15, 16)
        layer2_k = torch.randn(1, 4, 15, 16)
        layer2_v = torch.randn(1, 4, 15, 16)
        tuple_cache = ((layer1_k, layer1_v), (layer2_k, layer2_v))

        state = GenerationState(past_key_values=tuple_cache, positions_done=15)
        state.trim_cache(8)

        self.assertEqual(state.past_key_values[0][0].shape[-2], 8)
        self.assertEqual(state.past_key_values[0][1].shape[-2], 8)
        self.assertEqual(state.past_key_values[1][0].shape[-2], 8)

    def test_rollback_speculative_drafts(self):
        cache = DummyCache(seq_len=20)
        # 16 prompt/pre-draft tokens + 4 draft tokens evaluated = 20 total
        state = GenerationState(past_key_values=cache, positions_done=20)

        # 1 draft token accepted out of gamma=4 (3 rejected)
        state.rollback_speculative_drafts(accepted_k=1, draft_gamma=4)

        # Target length should be 20 - (4 - 1) = 17 positions
        self.assertEqual(state.positions_done, 17)
        self.assertEqual(state.past_key_values.key_cache[0].shape[-2], 17)
        self.assertEqual(state.past_key_values.value_cache[0].shape[-2], 17)

    def test_rollback_all_accepted(self):
        cache = DummyCache(seq_len=20)
        state = GenerationState(past_key_values=cache, positions_done=20)

        # All 4 drafts accepted -> no rollback required
        state.rollback_speculative_drafts(accepted_k=4, draft_gamma=4)
        self.assertEqual(state.positions_done, 20)
        self.assertEqual(state.past_key_values.key_cache[0].shape[-2], 20)


# ---------------------------------------------------------------------------
# Regression: Issue #281 — cache_len must track positions_done, not logits.shape[1]
#
# Before commit b394f2f, cache_len was incorrectly derived from logits.shape[1].
# During a speculative step the draft-verification forward pass emits logits with
# shape [1, gamma, vocab], so logits.shape[1] == gamma (e.g. 3). This caused
# cache_len to jump to 3 rather than reflect the real number of cached KV
# positions (e.g. 6 prompt + 3 previously generated = 9).
#
# The fix: cache_len_in is set to state.positions_done before every token is
# emitted, so it always equals the sequential KV-position count regardless of
# the batch size used by the speculative verify pass.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Minimal synthetic model that correctly simulates speculative decoding output
# shapes (batch size can be 1 or gamma depending on call site).
# ---------------------------------------------------------------------------

class _SyntheticSpecModel(nn.Module):
    """Lightweight causal-LM double for speculative-decoding regression tests.

    The forward() method accepts arbitrary-length input_ids and returns
    matching logits, plus a fake KV cache object whose seq-dim grows
    monotonically — mirroring HuggingFace cache behaviour.
    """
    def __init__(self, vocab_size: int = 64, hidden_size: int = 16):
        super().__init__()
        self.config = types.SimpleNamespace(
            vocab_size=vocab_size,
            hidden_size=hidden_size,
            is_encoder_decoder=False,
            model_type="llama",
        )
        self.embed = nn.Embedding(vocab_size, hidden_size)
        self.proj = nn.Linear(hidden_size, hidden_size)
        self.lm_head = nn.Linear(hidden_size, vocab_size, bias=False)

    def forward(
        self,
        input_ids: torch.Tensor,
        past_key_values=None,
        use_cache: bool = True,
        output_hidden_states: bool = True,
    ):
        x = self.embed(input_ids)            # [1, seq, hidden]
        x = self.proj(x)
        logits = self.lm_head(x)             # [1, seq, vocab]

        # Deterministic peak on token 0: the next-token distribution is
        # effectively one-hot, so every sampled draft equals the argmax and
        # speculative acceptance is predictable (k == draft_gamma). Without a
        # peaked distribution the multinomial draft draws would be random and
        # tests could not assert exact emitted-token counts.
        logits[..., 0] = logits[..., 0] + 50.0

        seq = input_ids.shape[1]
        prior = past_key_values[0][0].shape[2] if past_key_values is not None else 0
        total = prior + seq

        # Grow a fake cache by the number of new positions consumed.
        new_cache = (
            (
                torch.zeros(1, 1, total, 4),
                torch.zeros(1, 1, total, 4),
            ),
        )

        return types.SimpleNamespace(
            logits=logits,
            past_key_values=new_cache,
            hidden_states=(x,),
        )


def _make_spec_service(model: nn.Module, prompt_len: int = 5) -> ModelEngine:
    """Build a minimal ModelEngine instance wired to *model* without loading weights.

    ``prompt_len`` is how many token ids the tokenizer stub reports for every
    prompt (the sliding-window tests need a prompt at least as long as the
    clamped window floor of 16, see ``model.py: window_size = max(16, ...)``).
    """
    import threading

    svc = ModelEngine.__new__(ModelEngine)
    svc.model = model
    svc.device = "cpu"
    svc.model_id = "test-spec-model"
    svc.mode = "causal_lm"
    svc._lock = threading.Lock()
    svc.num_layers = 1
    svc.num_heads = 1
    svc.hidden_size = model.config.hidden_size
    svc.revision = "test"
    svc.activation_engine = ActivationEngine()
    svc._layer_elapsed = {}
    svc._layer_timing_lock = threading.Lock()

    ids = [i % 63 + 1 for i in range(prompt_len)]
    tok = MagicMock()
    tok.side_effect = lambda prompt, **kw: {"input_ids": torch.tensor([ids])}
    tok.encode.return_value = list(ids)
    tok.decode.side_effect = lambda ids, **kw: f"t{ids[0] if ids else 0}"
    tok.eos_token_id = 9999
    svc.tokenizer = tok
    svc._catalog = None
    return svc


class TestCacheLenTracksPositionsDone(unittest.TestCase):
    """Regression tests for issue #281 (cache_len fix, commit b394f2f).

    Verify that every emitted token frame carries cache_len == the sequential
    KV-position count (state.positions_done), and never == logits.shape[1].
    """

    def _collect_token_frames(self, frames):
        return [f for f in frames if f.get("type") == "token"]

    def test_greedy_cache_len_increments_monotonically(self):
        """Baseline: greedy decode — cache_len should increment by 1 each step."""
        model = _SyntheticSpecModel()
        svc = _make_spec_service(model)

        n_tokens = 4
        frames = list(
            svc.generate_steps(
                prompt="hello",
                max_new_tokens=n_tokens,
                top_k=5,
                use_chat_template=False,
                include_catalog=False,
                decoding_mode="greedy",
            )
        )
        token_frames = self._collect_token_frames(frames)
        self.assertEqual(len(token_frames), n_tokens)

        # Exact expectations (no wiggle room): frame 0 is the prefill pass over
        # an empty cache → 0; frame s (s >= 1) reports the positions already fed
        # BEFORE its forward pass, i.e. prompt_len + s - 1. A stale value (for
        # example logits.shape[1] == top_k/gamma) fails here outright.
        prompt_len = 5
        cache_lens = []
        for f in token_frames:
            step = f["step"]
            expected = 0 if step == 0 else prompt_len + step - 1
            self.assertIsInstance(f["cache_len"], int)
            self.assertEqual(
                f["cache_len"],
                expected,
                msg=(f"frame step={step}: cache_len={f['cache_len']} but the fed "
                     f"cache held {expected} positions"),
            )
            cache_lens.append(f["cache_len"])

        # Strictly increasing. (The prefill → decode boundary jumps from 0 to
        # prompt_len; every later pair advances by exactly one, which the exact
        # per-frame assertions above already pin down.)
        for a, b in pairwise(cache_lens):
            self.assertGreater(b, a, msg="cache_len must never repeat or drop")

        # Greedy runs never touch the sliding-window trim path.
        for f in token_frames:
            self.assertFalse(f["cache_trimmed"])

    def test_speculative_cache_len_tracks_positions_done(self):
        """Core regression: cache_len must equal the sequential KV-position count.

        Before the fix, cache_len was taken from ``logits.shape[1]``. On a
        speculative step the verify forward pass returns logits of shape
        ``[1, gamma, vocab]``, so that formula yielded ``gamma`` (3 here) on
        every speculative frame instead of the real cache length.

        The prompt stub is 5 tokens, so every frame has an exact expectation:
        step 0 (prefill) reports 0 cached positions, every later step reports
        ``prompt_len + step - 1``. Before the fix this formula was violated on
        every speculative frame because ``logits.shape[1] == gamma`` (3 here)
        leaked into ``cache_len``.
        """
        model = _SyntheticSpecModel()
        svc = _make_spec_service(model)

        prompt_len = 5           # tokenizer stub always returns 5 ids
        draft_gamma = 3
        n_tokens = 6

        frames = list(
            svc.generate_steps(
                prompt="hello",
                max_new_tokens=n_tokens,
                top_k=5,
                use_chat_template=False,
                include_catalog=False,
                decoding_mode="speculative",
                draft_gamma=draft_gamma,
            )
        )
        token_frames = self._collect_token_frames(frames)
        self.assertGreater(len(token_frames), 0)

        # At least one frame must actually come from the speculative branch,
        # otherwise this test would silently pass without exercising the code.
        self.assertTrue(
            any(f.get("accepted_drafts") for f in token_frames),
            "no speculative frames emitted — the regression path was not exercised",
        )

        for f in token_frames:
            step = f["step"]
            cache_len = f["cache_len"]
            expected = 0 if step == 0 else prompt_len + step - 1
            self.assertIsInstance(cache_len, int)
            self.assertEqual(
                cache_len,
                expected,
                msg=(
                    f"Frame step={step}: cache_len={cache_len}, expected "
                    f"{expected} (prompt_len {prompt_len} + step - 1). A value "
                    f"of exactly {draft_gamma} means logits.shape[1] was used "
                    "instead of state.positions_done."
                ),
            )

    def test_speculative_cache_len_monotonically_non_decreasing(self):
        """cache_len must never go backwards across frames in speculative mode."""
        model = _SyntheticSpecModel()
        svc = _make_spec_service(model)

        frames = list(
            svc.generate_steps(
                prompt="hello world",
                max_new_tokens=6,
                top_k=5,
                use_chat_template=False,
                include_catalog=False,
                decoding_mode="speculative",
                draft_gamma=2,
            )
        )
        token_frames = self._collect_token_frames(frames)
        cache_lens = [f["cache_len"] for f in token_frames]
        for idx, (a, b) in enumerate(pairwise(cache_lens)):
            self.assertGreater(
                b,
                a,
                msg=(
                    f"cache_len went from {a} to {b} between frames "
                    f"{idx} and {idx + 1}; it must advance on every frame."
                ),
            )

    # ------------------------------------------------------------------ #
    # Issue #297 — decode-mode surface regression tests
    # ------------------------------------------------------------------ #

    def test_single_draft_gamma_still_runs_speculation(self):
        """draft_gamma == 1 must take the speculative branch (review fix).

        The UI exposes a minimum of 1 draft. The old ``draft_gamma > 1`` guard
        silently fell back to plain decoding, so the run reported
        ``decoding_mode == "speculative"`` with zero proposals, zero accepted
        frames and an acceptance rate of 0.
        """
        model = _SyntheticSpecModel()
        svc = _make_spec_service(model)

        frames = list(
            svc.generate_steps(
                prompt="hello",
                max_new_tokens=5,
                top_k=5,
                use_chat_template=False,
                include_catalog=False,
                decoding_mode="speculative",
                draft_gamma=1,
            )
        )
        token_frames = self._collect_token_frames(frames)
        done = next(f for f in frames if f.get("type") == "done")

        self.assertTrue(
            any(f.get("accepted_drafts") for f in token_frames),
            "draft_gamma=1 produced no speculative frames at all",
        )
        self.assertGreater(done["draft_batches"], 0)
        self.assertEqual(done["drafts_proposed"], done["draft_batches"])
        self.assertGreater(done["drafts_accepted"], 0)
        self.assertEqual(
            done["drafts_rejected"], done["drafts_proposed"] - done["drafts_accepted"]
        )

    def test_generation_never_exceeds_max_new_tokens(self):
        """k accepted drafts + 1 continuation must respect the token budget.

        A speculative step can emit up to ``draft_gamma + 1`` tokens while the
        branch guard only checked ``step + draft_gamma <= max_new_tokens``, so a
        full batch could push the run one token past the requested budget.
        """
        model = _SyntheticSpecModel()
        svc = _make_spec_service(model)

        max_new_tokens = 4
        frames = list(
            svc.generate_steps(
                prompt="hello",
                max_new_tokens=max_new_tokens,
                top_k=5,
                use_chat_template=False,
                include_catalog=False,
                decoding_mode="speculative",
                draft_gamma=3,
            )
        )
        token_frames = self._collect_token_frames(frames)
        self.assertEqual(len(token_frames), max_new_tokens)
        # The run must still have exercised the speculative branch.
        self.assertTrue(any(f.get("accepted_drafts") for f in token_frames))

    def test_cache_trimmed_only_when_the_window_was_actually_trimmed(self):
        """``cache_trimmed`` marks real trims; a full window is not a trim.

        window_size == prompt_len makes the cache exactly full on the first
        decode step (positions_done == window_size, the backend's trim test is
        strict ``>``), which is precisely the state the UI used to mislabel as
        "trimming oldest". Later steps do trim and must be flagged.
        """
        model = _SyntheticSpecModel()
        svc = _make_spec_service(model, prompt_len=16)

        prompt_len = 16
        # generate_steps clamps window_size into [16, 4096], so 16 is the
        # smallest window that can be exercised end to end.
        window_size = 16
        frames = list(
            svc.generate_steps(
                prompt="hello",
                max_new_tokens=6,
                top_k=5,
                use_chat_template=False,
                include_catalog=False,
                decoding_mode="sliding_window",
                window_size=window_size,
            )
        )
        token_frames = self._collect_token_frames(frames)

        for f in token_frames:
            step = f["step"]
            if step == 0:
                # Prefill: nothing cached yet, nothing to trim.
                self.assertEqual(f["cache_len"], 0)
                self.assertFalse(f["cache_trimmed"])
            elif step == 1:
                # Exactly full (prompt_len == window_size) but NOT trimmed.
                self.assertEqual(f["cache_len"], window_size)
                self.assertFalse(
                    f["cache_trimmed"],
                    "a full cache must not be reported as trimmed",
                )
            else:
                # positions_done > window_size from here on → real trims.
                self.assertEqual(f["cache_len"], window_size)
                self.assertTrue(
                    f["cache_trimmed"],
                    "frames past the window must report the trim that happened",
                )
        self.assertEqual(prompt_len, window_size)
