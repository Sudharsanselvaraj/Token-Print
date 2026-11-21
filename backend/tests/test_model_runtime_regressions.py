"""Regression tests for device selection and request-local sampling RNG."""

from __future__ import annotations

import threading
from types import SimpleNamespace

import torch
from torch import nn

from app.model import ActivationEngine, ModelEngine, _pick_device


class _TinyTokenizer:
    """Tokenizer stub sufficient for the generation loop's public contract."""

    eos_token_id = 999
    chat_template = None

    def __call__(self, _prompt: str, **_kwargs):
        return {"input_ids": torch.tensor([[1, 2]], dtype=torch.long)}

    def convert_ids_to_tokens(self, token_ids):
        return [str(token_id) for token_id in token_ids]

    def convert_tokens_to_string(self, tokens):
        return " ".join(tokens)

    def decode(self, token_ids, skip_special_tokens=True):
        return " ".join(str(token_id) for token_id in token_ids if token_id != 999)


class _TinyCausalModel(nn.Module):
    """Small deterministic model double with flat logits for sampling tests."""

    def __init__(self, vocab_size: int = 8):
        super().__init__()
        self.config = SimpleNamespace(
            model_type="tiny-test-model",
            hidden_size=4,
            vocab_size=vocab_size,
        )
        self.generation_config = SimpleNamespace(eos_token_id=None)

    def forward(
        self,
        input_ids,
        past_key_values=None,
        use_cache=True,
        output_hidden_states=True,
        output_attentions=False,
    ):
        batch_size, seq_len = input_ids.shape
        vocab_size = self.config.vocab_size
        # Equal logits make the sampling distribution easy to reason about.
        logits = torch.zeros(batch_size, seq_len, vocab_size, device=input_ids.device)
        hidden = torch.zeros(
            batch_size, seq_len, self.config.hidden_size, device=input_ids.device
        )
        prior_len = (
            int(past_key_values[0][0].shape[-2]) if past_key_values is not None else 0
        )
        total_len = prior_len + seq_len
        cache = ((
            torch.zeros(1, 1, total_len, 1, device=input_ids.device),
            torch.zeros(1, 1, total_len, 1, device=input_ids.device),
        ),)
        return SimpleNamespace(
            logits=logits,
            past_key_values=cache,
            hidden_states=(hidden,),
            attentions=None,
        )


def _make_tiny_engine() -> ModelEngine:
    """Build a ModelEngine without downloading or loading real model weights."""
    service = ModelEngine.__new__(ModelEngine)
    service.model = _TinyCausalModel()
    service.tokenizer = _TinyTokenizer()
    service.device = "cpu"
    service.model_id = "tiny-test-model"
    service.mode = "causal_lm"
    service.revision = "test-revision"
    service.num_layers = 0
    service.num_heads = 1
    service.hidden_size = 4
    service._lock = threading.Lock()
    service.activation_engine = ActivationEngine()
    service._layer_elapsed = {}
    service._layer_timing_lock = threading.Lock()
    service._catalog = None
    return service


def _generated_ids(seed: int) -> list[int]:
    frames = list(
        _make_tiny_engine().generate_steps(
            prompt="test",
            max_new_tokens=8,
            top_k=5,
            use_chat_template=False,
            decoding_mode="sampling",
            temperature=1.0,
            top_p=1.0,
            seed=seed,
        )
    )
    return [frame["chosen"]["id"] for frame in frames if frame.get("type") == "token"]


def test_pick_device_prefers_cuda_when_available(monkeypatch):
    monkeypatch.delenv("TOKENPRINT_DEVICE", raising=False)
    monkeypatch.setattr(torch.cuda, "is_available", lambda: True)
    monkeypatch.setattr(torch.backends.mps, "is_available", lambda: True)

    assert _pick_device() == "cuda"


def test_pick_device_falls_back_to_mps_then_cpu(monkeypatch):
    monkeypatch.delenv("TOKENPRINT_DEVICE", raising=False)
    monkeypatch.setattr(torch.cuda, "is_available", lambda: False)
    monkeypatch.setattr(torch.backends.mps, "is_available", lambda: True)
    assert _pick_device() == "mps"

    monkeypatch.setattr(torch.backends.mps, "is_available", lambda: False)
    assert _pick_device() == "cpu"


def test_pick_device_respects_explicit_override(monkeypatch):
    monkeypatch.setenv("TOKENPRINT_DEVICE", "cpu")
    monkeypatch.setattr(torch.cuda, "is_available", lambda: True)
    monkeypatch.setattr(torch.backends.mps, "is_available", lambda: True)

    assert _pick_device() == "cpu"


def test_seeded_sampling_is_reproducible_across_the_whole_generation():
    first = _generated_ids(seed=1)
    second = _generated_ids(seed=1)

    assert first == second
    assert len(first) == 8
    # With a flat distribution and one advancing RNG stream, sampling should
    # not repeatedly select the same token due to resetting the seed per step.
    assert len(set(first)) > 1


def test_seeded_sampling_does_not_mutate_global_torch_rng_state():
    torch.manual_seed(12345)
    before = torch.random.get_rng_state().clone()

    _generated_ids(seed=7)

    after = torch.random.get_rng_state()
    assert torch.equal(before, after)
