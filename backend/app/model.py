"""Model engine: loads Qwen2.5-0.5B-Instruct once and exposes real forward-pass data.

Design decisions (see plan):
  * ``attn_implementation="eager"`` is MANDATORY — the default SDPA path returns
    ``None`` for attentions, which would leave us with no real data to show.
  * float32 on MPS avoids the subtle NaN / op-fallback issues seen with bf16/fp16
    on the eager MPS path. CPU is a guaranteed-correct fallback and is plenty fast
    at this model size / token count.
  * The model is loaded ONCE (in the FastAPI lifespan) and reused per request.
"""

from __future__ import annotations

import os
import threading
import time

# --- Environment guards (must be set BEFORE torch/transformers import) -------
# Safety net: if any single op is unimplemented on MPS, fall back to CPU for that
# op rather than crashing. Must be set before torch initializes the MPS backend.
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
# Avoid tokenizers fork/parallelism warnings under uvicorn's reloader.
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
# We use PyTorch ONLY. Force torch on and disable TensorFlow/Flax probing so
# transformers never tries to import them. This matters on machines whose system
# Python has a broken/mismatched TensorFlow (e.g. TF compiled against NumPy 1.x
# while NumPy 2.x is installed) — importing it would crash the whole service.
os.environ.setdefault("USE_TORCH", "1")
os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("USE_FLAX", "0")
os.environ.setdefault("TRANSFORMERS_NO_ADVISORY_WARNINGS", "1")

import torch  # noqa: E402
from transformers import AutoConfig, AutoModelForCausalLM, AutoTokenizer  # noqa: E402

from .debug import DebugCapture  # noqa: E402
from .reduce import explained_variance, project_3d  # noqa: E402

DEFAULT_MODEL_ID = os.environ.get("NEUROSCOPE_MODEL", "Qwen/Qwen2.5-0.5B-Instruct")
MAX_TOKENS = int(os.environ.get("NEUROSCOPE_MAX_TOKENS", "40"))

# Rounding / thresholding for the attention payload.
_ATTN_DECIMALS = 3
_ATTN_ZERO_BELOW = 0.01


def _pick_device() -> str:
    """Choose the compute device, honoring an explicit override."""
    override = os.environ.get("NEUROSCOPE_DEVICE")
    if override:
        return override
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


class TokenizedTooLong(ValueError):
    """Raised when the input exceeds the configured token cap."""

    def __init__(self, n_tokens: int, cap: int):
        self.n_tokens = n_tokens
        self.cap = cap
        super().__init__(
            f"Input is {n_tokens} tokens; the cap is {cap}. "
            "Send a shorter sentence."
        )


class ModelEngine:
    """Holds the tokenizer + model and produces real inference data."""

    def __init__(self, model_id: str = DEFAULT_MODEL_ID, device: str | None = None):
        self.model_id = model_id
        self.device = device or _pick_device()
        self.attn_implementation = "eager"
        # A single model is not safe for concurrent forward passes; serialize them.
        self._lock = threading.Lock()

        self.tokenizer = AutoTokenizer.from_pretrained(model_id)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_id,
            attn_implementation=self.attn_implementation,  # REQUIRED for real attentions
            torch_dtype=torch.float32,
        )
        self.model.to(self.device)
        self.model.eval()

        cfg = self.model.config
        self.num_layers: int = cfg.num_hidden_layers
        self.num_heads: int = cfg.num_attention_heads
        self.hidden_size: int = cfg.hidden_size
        self._catalog: list | None = None  # cached op catalog (static per model)

        # --- Per-layer timing hooks (v0.4, issue #18) ----------------------
        # Registered once at load time; they write elapsed ms-per-layer into a
        # scratch dict each forward pass. `layer_elapsed` is consumed (and
        # cleared) by whoever ran the pass, so it never accumulates.
        self._layer_elapsed: dict[int, float] = {}
        self._layer_timing_lock = threading.Lock()
        self._timing_handles: list = []
        self._register_layer_timing_hooks()

    def _register_layer_timing_hooks(self) -> None:
        """Register pre/post hooks on each decoder layer writing ms timings."""
        layers = getattr(self.model.model, "layers", None)
        if layers is None:
            return

        for i, layer in enumerate(layers):
            marks = {"pre": None}

            def pre_hook(_mod, _in, _i=i, _marks=marks):
                _marks["pre"] = time.perf_counter()

            def post_hook(_mod, _in, _out, _i=i, _marks=marks):
                pre = _marks["pre"]
                if pre is not None:
                    elapsed_ms = (time.perf_counter() - pre) * 1000.0
                    with self._layer_timing_lock:
                        self._layer_elapsed[_i] = elapsed_ms

            self._timing_handles.append(layer.register_forward_pre_hook(pre_hook))
            self._timing_handles.append(layer.register_forward_hook(post_hook))

    def _last_layer_timings_ms(self) -> list[float]:
        """Snapshot and clear the per-layer ms timings from the last forward pass."""
        with self._layer_timing_lock:
            timings = [
                round(self._layer_elapsed.get(i, 0.0), 4)
                for i in range(self.num_layers)
            ]
            self._layer_elapsed.clear()
        return timings

    def release_timing_hooks(self) -> None:
        for h in self._timing_handles:
            h.remove()
        self._timing_handles.clear()

    # ------------------------------------------------------------------ #
    # MoE routing (issue #83)
    # ------------------------------------------------------------------ #
    def _detect_moe_blocks(self) -> list[dict]:
        """Find mixture-of-experts blocks and their router modules.

        Returns a list of ``{layer_index, path, gate, n_experts, used}`` dicts
        by scanning the decoder layers for submodules that contain an
        ``experts`` ModuleList plus a ``gate``/``router`` linear. Works across
        Qwen2Moe, Mixtral, DeepSeek, and similar architectures.
        """
        base = getattr(self.model, "model", self.model)
        layers = getattr(base, "layers", None)
        if layers is None:
            return []
        found: list[dict] = []
        for i, layer in enumerate(layers):
            for name, mod in layer.named_children():
                experts = None
                gate = None
                for child_name, child in mod.named_children():
                    if child_name in ("experts", "expert"):
                        experts = child
                    if child_name in ("gate", "router", "gate_proj"):
                        gate = child
                if experts is not None and gate is not None:
                    n_experts = len(experts)
                    used = getattr(
                        self.model.config,
                        "num_experts_per_tok",
                        getattr(self.model.config, "num_local_experts", 2),
                    )
                    found.append(
                        {
                            "layer": i,
                            "path": f"layers.{i}.{name}",
                            "gate": gate,
                            "n_experts": int(n_experts),
                            "used": int(used),
                        }
                    )
        return found

    def _capture_moe_routing(self, input_ids) -> dict | None:
        """Run a forward pass with router hooks; return per-layer routing.

        Returns None if the model has no MoE blocks. Otherwise returns
        ``{per_layer: [{layer, n_experts, used, routing: [{token, experts:
        [{idx, weight}]}]}]}`` with the top-``used`` experts per token.
        """
        blocks = self._detect_moe_blocks()
        if not blocks:
            return None

        captured: dict[int, "torch.Tensor"] = {}
        handles: list = []
        for b in blocks:
            gate = b["gate"]

            def make_hook(path: str, layer: int):
                def hook(_mod, _inp, out):
                    captured[layer] = out.detach().float().cpu()
                return hook

            handles.append(gate.register_forward_hook(make_hook(b["path"], b["layer"])))

        try:
            self.model(input_ids=input_ids)
        finally:
            for h in handles:
                h.remove()

        imports_ok = True
        try:
            import torch.nn.functional as F  # noqa: F401
        except Exception:
            imports_ok = False
        if not imports_ok:
            return None

        import torch.nn.functional as F

        per_layer: list[dict] = []
        for b in blocks:
            logits = captured.get(b["layer"])
            if logits is None:
                continue
            logits = logits[0]  # [seq, n_experts]
            probs = F.softmax(logits, dim=-1)
            k = min(b["used"], b["n_experts"])
            topk = torch.topk(probs, k, dim=-1)
            routing = []
            for t_idx in range(logits.shape[0]):
                experts = [
                    {"idx": int(e), "weight": round(float(w), 4)}
                    for e, w in zip(topk.indices[t_idx].tolist(), topk.values[t_idx].tolist())
                ]
                routing.append({"token": t_idx, "experts": experts})
            per_layer.append(
                {
                    "layer": b["layer"],
                    "n_experts": b["n_experts"],
                    "used": k,
                    "routing": routing,
                }
            )
        return {"per_layer": per_layer}

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    def _decode_piece(self, piece: str) -> str:
        """Turn a raw byte-level BPE piece (e.g. 'Ġcat') into readable text (' cat')."""
        return self.tokenizer.convert_tokens_to_string([piece])

    def _tokenize(self, sentence: str):
        """Raw tokenization (NO chat template) so the user sees their sentence's tokens."""
        enc = self.tokenizer(sentence, return_tensors="pt")
        ids = enc["input_ids"][0].tolist()
        if len(ids) > MAX_TOKENS:
            raise TokenizedTooLong(len(ids), MAX_TOKENS)
        pieces = self.tokenizer.convert_ids_to_tokens(ids)
        special_ids = set(self.tokenizer.all_special_ids)
        tokens = [
            {
                "index": i,
                "id": tid,
                "piece": piece,
                "text": self._decode_piece(piece),
                "is_special": tid in special_ids,
            }
            for i, (tid, piece) in enumerate(zip(ids, pieces))
        ]
        return enc, tokens

    # ------------------------------------------------------------------ #
    # Phase 1: attention
    # ------------------------------------------------------------------ #
    def analyze(self, sentence: str) -> dict:
        """Run one real forward pass and return tokens, attention, and geometry."""
        with self._lock:
            enc, tokens = self._tokenize(sentence)
            enc = {k: v.to(self.device) for k, v in enc.items()}

            with torch.no_grad():
                out = self.model(
                    **enc, output_attentions=True, output_hidden_states=True
                )

            # --- Phase 1: attention ----------------------------------------
            # tuple(len=num_layers) of [1, num_heads, seq, seq] -> [L, H, seq, seq]
            attn = torch.stack(out.attentions).squeeze(1).to("cpu").float()
            # Round to a few decimals and zero-out near-zero weights to shrink payload.
            attn = torch.round(attn * (10**_ATTN_DECIMALS)) / (10**_ATTN_DECIMALS)
            attn[attn < _ATTN_ZERO_BELOW] = 0.0
            attention = attn.tolist()  # [layer][head][from][to]

            # --- Phase 2: per-token geometry from real hidden states -------
            # out.hidden_states: tuple(len = num_layers + 1) of [1, seq, hidden].
            # index 0 = embedding output; index L = residual stream after layer L.
            hidden = [
                h.squeeze(0).to("cpu").float().numpy() for h in out.hidden_states
            ]
            # PCA-project each layer's residual stream to 3D (see reduce.py).
            hidden_states_3d = {str(i): project_3d(h) for i, h in enumerate(hidden)}
            embeddings_3d = hidden_states_3d["0"]  # layer 0 = token embeddings
            # Per-token embedding norm (L2), for optional node sizing.
            emb_norms = [round(float(v), 4) for v in (hidden[0] ** 2).sum(1) ** 0.5]

            # --- Phase 4: logit lens (v0.3) --------------------------------
            # Project each layer's residual stream through final_norm + lm_head
            # to get per-position top-5 vocabulary predictions.
            # logit_lens[layer][position] = [{text, token_id, prob}, ...]
            norm = getattr(self.model.model, "norm", None)
            if norm is None:
                norm = getattr(self.model.model, "final_layer_norm", None)
            lm_head = getattr(self.model, "lm_head", None)
            logit_lens: list[list[list[dict]]] = []
            if norm is not None and lm_head is not None:
                n_top = 5
                for h in out.hidden_states:
                    x = h.to(self.device)
                    x = norm(x)
                    logits = lm_head(x).float()  # [1, seq, vocab]
                    probs = logits.softmax(-1).squeeze(0)  # [seq, vocab]
                    pos_entries: list[list[dict]] = []
                    for pos in range(probs.shape[0]):
                        topk = probs[pos].topk(n_top)
                        entries = [
                            {
                                "text": self._decode_id(int(tid)),
                                "token_id": int(tid),
                                "prob": round(float(p), 6),
                            }
                            for tid, p in zip(topk.indices.tolist(), topk.values.tolist())
                        ]
                        pos_entries.append(entries)
                    logit_lens.append(pos_entries)

        return {
            "sentence": sentence,
            "model": self.model_id,
            "device": self.device,
            "num_layers": self.num_layers,
            "num_heads": self.num_heads,
            "hidden_size": self.hidden_size,
            "tokens": tokens,
            "attention": attention,
            "embeddings_3d": embeddings_3d,
            "hidden_states_3d": hidden_states_3d,
            "embedding_norms": emb_norms,
            "logit_lens": logit_lens,
            "projection": {
                "method": "PCA",
                "note": (
                    "3D PCA projection of 896-dim vectors; distances are "
                    "approximate, not the literal high-dimensional geometry."
                ),
                "embedding_explained_variance": explained_variance(hidden[0]),
            },
        }

    # ------------------------------------------------------------------ #
    # Phase 3: streaming generation (manual greedy decode loop)
    # ------------------------------------------------------------------ #
    def _decode_id(self, token_id: int) -> str:
        return self.tokenizer.convert_tokens_to_string(
            self.tokenizer.convert_ids_to_tokens([token_id])
        )

    # ------------------------------------------------------------------ #
    # Activation patching (issue #75)
    # ------------------------------------------------------------------ #
    def analyze_patched(
        self,
        sentence: str,
        source_sentence: str,
        patch_layers: list[int],
    ) -> dict:
        """Run the target sentence with residual states patched from the source.

        Returns ``analyze()``-shaped data for the patched run plus a ``patch``
        block describing what was replaced, plus ``analysis_clean`` (the
        unpatched target run) and ``analysis_source`` (the source run) so the
        frontend can compare before/after and visualize trajectories.
        """
        from .ablation import ActivationPatch

        with self._lock:
            patch = ActivationPatch(self.model.model, set(patch_layers))
            enc_src = self.tokenizer(source_sentence, return_tensors="pt").to(self.device)
            with torch.no_grad():
                source_states = patch.capture(
                    self.model,
                    enc_src["input_ids"],
                    attention_mask=enc_src.get("attention_mask"),
                )

            with torch.no_grad(), patch:
                data = self._analyze_forward_only(sentence)

            with torch.no_grad():
                clean = self._analyze_forward_only(sentence)
                source_data = self._analyze_forward_only(source_sentence)

        data["patch"] = {
            "source_sentence": source_sentence,
            "target_sentence": sentence,
            "patch_layers": sorted(patch_layers),
            "n_captured": len(source_states),
        }
        data["analysis_clean"] = clean
        data["analysis_source"] = source_data
        return data

    def _analyze_forward_only(self, sentence: str) -> dict:
        """Run one forward pass and return the analyze()-shaped result without
        taking the engine lock (callers hold it)."""
        enc, tokens = self._tokenize(sentence)
        enc = {k: v.to(self.device) for k, v in enc.items()}

        # Attach MoE router hooks if the model has any experts (issue #83).
        moe_blocks = self._detect_moe_blocks()
        moe_captured: dict[int, "torch.Tensor"] = {}
        moe_handles: list = []
        if moe_blocks:
            for b in moe_blocks:
                gate = b["gate"]

                def make_hook(layer: int):
                    def hook(_mod, _inp, out):
                        moe_captured[layer] = out.detach().float().cpu()
                    return hook

                moe_handles.append(gate.register_forward_hook(make_hook(b["layer"])))

        try:
            with torch.no_grad():
                out = self.model(
                    **enc, output_attentions=True, output_hidden_states=True
                )
        finally:
            for h in moe_handles:
                h.remove()

        attn = torch.stack(out.attentions).squeeze(1).to("cpu").float()
        attn = torch.round(attn * (10**_ATTN_DECIMALS)) / (10**_ATTN_DECIMALS)
        attn[attn < _ATTN_ZERO_BELOW] = 0.0
        attention = attn.tolist()

        hidden = [h.squeeze(0).to("cpu").float().numpy() for h in out.hidden_states]
        hidden_states_3d = {str(i): project_3d(h) for i, h in enumerate(hidden)}
        embeddings_3d = hidden_states_3d["0"]
        emb_norms = [round(float(v), 4) for v in (hidden[0] ** 2).sum(1) ** 0.5]

        norm = getattr(self.model.model, "norm", None)
        if norm is None:
            norm = getattr(self.model.model, "final_layer_norm", None)
        lm_head = getattr(self.model, "lm_head", None)
        logit_lens: list[list[list[dict]]] = []
        if norm is not None and lm_head is not None:
            n_top = 5
            for h in out.hidden_states:
                x = h.to(self.device)
                x = norm(x)
                logits = lm_head(x).float()
                probs = logits.softmax(-1).squeeze(0)
                pos_entries: list[list[dict]] = []
                for pos in range(probs.shape[0]):
                    topk = probs[pos].topk(n_top)
                    entries = [
                        {
                            "text": self._decode_id(int(tid)),
                            "token_id": int(tid),
                            "prob": round(float(p), 6),
                        }
                        for tid, p in zip(topk.indices.tolist(), topk.values.tolist())
                    ]
                    pos_entries.append(entries)
                logit_lens.append(pos_entries)

        result = {
            "sentence": sentence,
            "model": self.model_id,
            "device": self.device,
            "num_layers": self.num_layers,
            "num_heads": self.num_heads,
            "hidden_size": self.hidden_size,
            "tokens": tokens,
            "attention": attention,
            "embeddings_3d": embeddings_3d,
            "hidden_states_3d": hidden_states_3d,
            "embedding_norms": emb_norms,
            "logit_lens": logit_lens,
            "projection": {
                "method": "PCA",
                "note": (
                    "3D PCA projection of 896-dim vectors; distances are "
                    "approximate, not the literal high-dimensional geometry."
                ),
                "embedding_explained_variance": explained_variance(hidden[0]),
            },
        }

        # MoE routing (issue #83): build from router logits captured above.
        if moe_blocks:
            try:
                import torch.nn.functional as F
            except Exception:
                F = None
            if F is not None:
                per_layer: list[dict] = []
                for b in moe_blocks:
                    logits = moe_captured.get(b["layer"])
                    if logits is None:
                        continue
                    lg = logits[0]  # [seq, n_experts]
                    probs = F.softmax(lg, dim=-1)
                    k = min(b["used"], b["n_experts"])
                    topk = torch.topk(probs, k, dim=-1)
                    routing = [
                        {
                            "token": t_idx,
                            "experts": [
                                {"idx": int(e), "weight": round(float(w), 4)}
                                for e, w in zip(
                                    topk.indices[t_idx].tolist(),
                                    topk.values[t_idx].tolist(),
                                )
                            ],
                        }
                        for t_idx in range(lg.shape[0])
                    ]
                    per_layer.append(
                        {
                            "layer": b["layer"],
                            "n_experts": b["n_experts"],
                            "used": k,
                            "routing": routing,
                        }
                    )
                result["moe_routing"] = {"per_layer": per_layer}
        return result

    def _eos_ids(self) -> set[int]:
        eos: set[int] = set()
        gc = getattr(self.model, "generation_config", None)
        if gc is not None and gc.eos_token_id is not None:
            e = gc.eos_token_id
            eos.update(e if isinstance(e, list) else [e])
        if self.tokenizer.eos_token_id is not None:
            eos.add(self.tokenizer.eos_token_id)
        return eos

    def generate_steps(
        self,
        prompt: str,
        max_new_tokens: int = 40,
        top_k: int = 10,
        use_chat_template: bool = True,
        include_catalog: bool = False,
    ):
        """Yield one frame per generated token from a real greedy decode loop.

        We run the autoregressive loop by hand (model(...) step by step with
        past_key_values) rather than model.generate(), because that's the only
        way to capture — per step, with no post-hoc correlation — the chosen
        token, top-k probabilities, and per-layer activation stats. Greedy
        decoding makes the trace deterministic so the frontend can replay it.
        """
        max_new_tokens = max(1, min(int(max_new_tokens), 64))
        top_k = max(1, min(int(top_k), 20))

        with self._lock, torch.no_grad():
            # Build the prompt. The chat template makes the instruct model
            # actually respond (coherent generation); raw mode just continues text.
            if use_chat_template:
                enc = self.tokenizer.apply_chat_template(
                    [{"role": "user", "content": prompt}],
                    add_generation_prompt=True,
                    return_tensors="pt",
                    return_dict=True,
                )
            else:
                enc = self.tokenizer(prompt, return_tensors="pt")
            input_ids = enc["input_ids"].to(self.device)

            prompt_token_ids = input_ids[0].tolist()
            meta = {
                "type": "meta",
                "model": self.model_id,
                "device": self.device,
                "architecture": getattr(self.model.config, "model_type", "unknown"),
                # num_layers+1 stat values per step (embeddings + each layer).
                "num_layer_stats": self.num_layers + 1,
                "num_layers": self.num_layers,
                "prompt_tokens": [self._decode_id(t) for t in prompt_token_ids],
                "prompt_len": len(prompt_token_ids),
                "max_new_tokens": max_new_tokens,
                "top_k": top_k,
                "decoding": "greedy",
                # This decode loop genuinely uses a KV cache (use_cache=True with
                # past_key_values threaded step to step), so the frontend may show
                # the real prefill/decode distinction.
                "uses_kv_cache": True,
            }
            if include_catalog:
                meta["op_catalog"] = self._op_catalog()
            yield meta

            eos_ids = self._eos_ids()
            past = None
            cur = input_ids
            generated_ids: list[int] = []
            # Track KV-cache growth so each frame can report the REAL prefill vs
            # decode distinction: step 0 processes the whole prompt at once
            # (past is None -> a "prefill" pass building the cache); every later
            # step feeds a single new token and reuses the cached keys/values
            # ("decode"). positions_done is the cache length seen at a step's input.
            positions_done = 0

            for step in range(max_new_tokens):
                n_positions = int(cur.shape[1])  # tokens actually computed this step
                cache_len_in = positions_done    # cached positions reused this step
                phase = "prefill" if past is None else "decode"

                out = self.model(
                    input_ids=cur,
                    past_key_values=past,
                    use_cache=True,
                    output_hidden_states=True,
                )
                past = out.past_key_values
                positions_done += n_positions
                # Real per-layer ms from the timing hooks installed at load.
                layer_timings_ms = self._last_layer_timings_ms()

                logits = out.logits[:, -1, :]  # [1, vocab]
                probs = logits.softmax(-1)

                topk = probs.topk(top_k)
                top_ids = topk.indices[0].tolist()
                top_probs = topk.values[0].tolist()
                top_logits = logits[0, top_ids].tolist()

                # Real per-layer mean |activation| at the last position.
                layer_stats = [
                    round(float(h[0, -1].abs().mean()), 4) for h in out.hidden_states
                ]

                chosen_id = int(top_ids[0])  # greedy = argmax
                generated_ids.append(chosen_id)
                is_eos = chosen_id in eos_ids

                yield {
                    "type": "token",
                    "step": step,
                    "chosen": {
                        "id": chosen_id,
                        "text": self._decode_id(chosen_id),
                        "logprob": round(float(probs[0, chosen_id].log()), 4),
                    },
                    "topk": [
                        {
                            "id": int(i),
                            "text": self._decode_id(int(i)),
                            "logit": round(float(lg), 3),
                            "prob": round(float(p), 4),
                        }
                        for i, lg, p in zip(top_ids, top_logits, top_probs)
                    ],
                    "layer_stats": layer_stats,
                    # Real per-layer latency in milliseconds (issue #18).
                    "layer_timings_ms": layer_timings_ms,
                    "eos": is_eos,
                    # Real KV-cache accounting for this step (see loop comment).
                    "phase": phase,  # "prefill" | "decode"
                    "n_positions": n_positions,  # tokens computed this step
                    "cache_len": cache_len_in,  # cached positions reused this step
                }

                if is_eos:
                    break
                cur = torch.tensor([[chosen_id]], device=self.device)

            yield {
                "type": "done",
                "generated_text": self.tokenizer.decode(
                    generated_ids, skip_special_tokens=True
                ),
                "total_steps": len(generated_ids),
            }

    # ------------------------------------------------------------------ #
    # Operation catalog (Generation — real per-op params/weights/dims)
    # ------------------------------------------------------------------ #
    _OP_LABELS = {
        "embedding": "Token Embedding",
        "norm": "Layer Normalization",
        "attn.q": "Query Projection",
        "attn.k": "Key Projection",
        "attn.v": "Value Projection",
        "attention": "Multi-Head Self-Attention",
        "attn.o": "Output Projection",
        "mlp.gate": "Gate Projection",
        "mlp.up": "Up Projection",
        "mlp.down": "Down Projection",
        "output": "Vocabulary Unembedding",
    }

    def _op_catalog(self) -> list:
        """Ordered list of the forward-pass operations with REAL per-op params,
        weight slices, and dims. Order is the true execution order for this
        architecture; static per model, so it's built once and cached."""
        if self._catalog is not None:
            return self._catalog

        base = self.model.model  # Qwen2Model
        ops: list = []

        def add(module, op_key, layer):
            pc = sum(p.numel() for p in module.parameters())
            w = getattr(module, "weight", None)
            preview: list = []
            in_dim = out_dim = bias_dim = None
            if w is not None:
                if w.dim() == 2:
                    out_dim, in_dim = int(w.shape[0]), int(w.shape[1])
                    sl = w[:8, :8].detach().float().cpu()
                    preview = (torch.round(sl * 1000) / 1000).tolist()
                else:
                    out_dim = int(w.shape[0])
                    sl = w[:8].detach().float().cpu()
                    preview = [(torch.round(sl * 1000) / 1000).tolist()]
            b = getattr(module, "bias", None)
            if b is not None:
                bias_dim = int(b.numel())
            ops.append(
                {
                    "op_key": op_key,
                    "layer": layer,
                    "param_count": int(pc),
                    "in_dim": in_dim,
                    "out_dim": out_dim,
                    "bias_dim": bias_dim,
                    "weight_preview": preview,
                }
            )

        add(base.embed_tokens, "embedding", None)
        for i, layer in enumerate(base.layers):
            add(layer.input_layernorm, "norm", i)
            add(layer.self_attn.q_proj, "attn.q", i)
            add(layer.self_attn.k_proj, "attn.k", i)
            add(layer.self_attn.v_proj, "attn.v", i)
            ops.append(
                {
                    "op_key": "attention",
                    "layer": i,
                    "param_count": 0,  # compute op (params live in q/k/v/o)
                    "in_dim": None,
                    "out_dim": None,
                    "bias_dim": None,
                    "weight_preview": [],
                }
            )
            add(layer.self_attn.o_proj, "attn.o", i)
            add(layer.post_attention_layernorm, "norm", i)
            add(layer.mlp.gate_proj, "mlp.gate", i)
            add(layer.mlp.up_proj, "mlp.up", i)
            add(layer.mlp.down_proj, "mlp.down", i)
        add(base.norm, "norm", None)
        if getattr(self.model, "lm_head", None) is not None:
            add(self.model.lm_head, "output", None)

        cum = 0
        for idx, op in enumerate(ops):
            cum += op["param_count"]
            op["index"] = idx
            op["cumulative_params"] = cum
            op["label"] = self._OP_LABELS.get(op["op_key"], op["op_key"])
        self._catalog = ops
        return ops

    # ------------------------------------------------------------------ #
    # ------------------------------------------------------------------ #
    # Debug snapshot (v0.4)
    # ------------------------------------------------------------------ #
    def debug_analyze(self, sentence: str) -> dict:
        """Run a forward pass with all intermediate outputs captured.

        Returns the normal ``analyze()`` result plus a ``debug_snapshot`` dict
        mapping module paths to sampled float arrays of their outputs.
        """
        with self._lock:
            enc, tokens = self._tokenize(sentence)
            enc = {k: v.to(self.device) for k, v in enc.items()}

            cap = DebugCapture(self.model)

            with torch.no_grad():
                out = cap.timed_forward(
                    self.model,
                    **enc, output_attentions=True, output_hidden_states=True
                )

            raw = cap.pop_outputs()
            timings = cap.pop_timings()
            cap.remove_hooks()

            # Build the base result (same as analyze) — but reuse the forward
            # pass we already did.
            attn = torch.stack(out.attentions).squeeze(1).to("cpu").float()
            attn = torch.round(attn * (10**_ATTN_DECIMALS)) / (10**_ATTN_DECIMALS)
            attn[attn < _ATTN_ZERO_BELOW] = 0.0
            attention = attn.tolist()

            hidden = [
                h.squeeze(0).to("cpu").float().numpy() for h in out.hidden_states
            ]
            hidden_states_3d = {str(i): project_3d(h) for i, h in enumerate(hidden)}
            embeddings_3d = hidden_states_3d["0"]
            emb_norms = [round(float(v), 4) for v in (hidden[0] ** 2).sum(1) ** 0.5]

            # Logit lens
            norm = getattr(self.model.model, "norm", None)
            if norm is None:
                norm = getattr(self.model.model, "final_layer_norm", None)
            lm_head = getattr(self.model, "lm_head", None)
            logit_lens: list = []
            if norm is not None and lm_head is not None:
                for h in out.hidden_states:
                    x = h.to(self.device)
                    x = norm(x)
                    logits = lm_head(x).float().softmax(-1).squeeze(0)
                    pos_entries: list[list[dict]] = []
                    for pos in range(logits.shape[0]):
                        topk = logits[pos].topk(5)
                        pos_entries.append([
                            {"text": self._decode_id(int(tid)), "token_id": int(tid), "prob": round(float(p), 6)}
                            for tid, p in zip(topk.indices.tolist(), topk.values.tolist())
                        ])
                    logit_lens.append(pos_entries)

            # Build debug snapshot (bounded sampling)
            snapshot: dict[str, list] = {}
            for path, t in raw.items():
                if not isinstance(t, torch.Tensor):
                    continue
                arr = t.detach().float().cpu().numpy()
                flat = arr.ravel()
                step = max(1, flat.size // 1024)
                sampled = flat[::step][:1024].tolist()
                snapshot[path] = {
                    "shape": list(arr.shape),
                    "dtype": str(t.dtype).replace("torch.", ""),
                    "sample": sampled,
                    "n_elements": int(arr.size),
                }

        return {
            "sentence": sentence,
            "model": self.model_id,
            "device": self.device,
            "num_layers": self.num_layers,
            "num_heads": self.num_heads,
            "hidden_size": self.hidden_size,
            "tokens": tokens,
            "attention": attention,
            "embeddings_3d": embeddings_3d,
            "hidden_states_3d": hidden_states_3d,
            "embedding_norms": emb_norms,
            "logit_lens": logit_lens,
            "projection": {
                "method": "PCA",
                "note": (
                    "3D PCA projection of 896-dim vectors; distances are "
                    "approximate, not the literal high-dimensional geometry."
                ),
                "embedding_explained_variance": [],
            },
            "debug_snapshot": snapshot,
            "debug_timings": timings,
        }

    @property
    def debug_ops(self) -> list[dict]:
        ops: list[dict] = []
        for name, module in self.model.named_modules():
            if not list(module.named_children()):
                params = sum(p.numel() for p in module.parameters())
                ops.append({
                    "path": name,
                    "label": name.split(".")[-1],
                    "params": int(params),
                    "dtype": str(next(module.parameters()).dtype).replace("torch.", "") if params else None,
                })
        return ops

    # Architecture introspection (Explorer — no forward pass)
    # ------------------------------------------------------------------ #
    def architecture(self) -> dict:
        """Real architecture metadata + tensor list from the loaded model.

        Pure introspection of ``config`` and ``named_parameters()`` — no
        forward pass. This is the model-backed data source for the tensor
        point-cloud explorer, mirroring what a GGUF file's metadata + tensor
        info table provides.
        """
        cfg = self.model.config
        head_dim = getattr(
            cfg, "head_dim", cfg.hidden_size // cfg.num_attention_heads
        )
        total_params = sum(p.numel() for p in self.model.parameters())

        tensors = []
        for name, p in self.model.named_parameters():
            tensors.append(
                {
                    "name": name,
                    "shape": list(p.shape),
                    "dtype": str(p.dtype).replace("torch.", ""),
                    "n_params": int(p.numel()),
                }
            )

        return {
            "source": "model",
            "model": self.model_id,
            "device": self.device,
            "metadata": {
                "architecture": getattr(cfg, "model_type", "unknown"),
                "name": self.model_id.split("/")[-1],
                "total_params": int(total_params),
                "num_layers": cfg.num_hidden_layers,
                "hidden_size": cfg.hidden_size,
                "num_heads": cfg.num_attention_heads,
                "num_kv_heads": getattr(
                    cfg, "num_key_value_heads", cfg.num_attention_heads
                ),
                "head_dim": head_dim,
                "ffn_size": getattr(cfg, "intermediate_size", None),
                "vocab_size": cfg.vocab_size,
                "context_length": getattr(cfg, "max_position_embeddings", None),
                "rope_theta": getattr(cfg, "rope_theta", None),
                "tie_word_embeddings": getattr(cfg, "tie_word_embeddings", None),
                "torch_dtype": "float32",
            },
            "tensor_count": len(tensors),
            "tensors": tensors,
        }

    # ------------------------------------------------------------------ #
    # Metadata
    # ------------------------------------------------------------------ #
    def info(self) -> dict:
        return {
            "model": self.model_id,
            "device": self.device,
            "num_layers": self.num_layers,
            "num_heads": self.num_heads,
            "hidden_size": self.hidden_size,
            "attn_implementation": self.attn_implementation,
            "max_tokens": MAX_TOKENS,
            "ready": True,
        }

    # ------------------------------------------------------------------ #
    # Checkpoint loading (v0.6)
    # ------------------------------------------------------------------ #
    @staticmethod
    def checkpoint_architecture(model_id: str) -> dict:
        """Quickly load just the config for any HuggingFace model and return
        architecture metadata (no weights loaded)."""
        cfg = AutoConfig.from_pretrained(model_id)
        head_dim = getattr(
            cfg, "head_dim", cfg.hidden_size // cfg.num_attention_heads
        )
        return {
            "source": "model",
            "model": model_id,
            "device": "remote",
            "metadata": {
                "architecture": getattr(cfg, "model_type", "unknown"),
                "name": model_id.split("/")[-1],
                "total_params": 0,
                "num_layers": cfg.num_hidden_layers,
                "hidden_size": cfg.hidden_size,
                "num_heads": cfg.num_attention_heads,
                "num_kv_heads": getattr(
                    cfg, "num_key_value_heads", cfg.num_attention_heads
                ),
                "head_dim": head_dim,
                "ffn_size": getattr(cfg, "intermediate_size", None),
                "vocab_size": cfg.vocab_size,
                "context_length": getattr(cfg, "max_position_embeddings", None),
                "rope_theta": getattr(cfg, "rope_theta", None),
                "tie_word_embeddings": getattr(cfg, "tie_word_embeddings", None),
                "torch_dtype": str(getattr(cfg, "torch_dtype", "float32")),
            },
            "tensor_count": 0,
            "tensors": [],
        }
