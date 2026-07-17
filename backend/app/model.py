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
from transformers import AutoModelForCausalLM, AutoTokenizer  # noqa: E402

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
            }
            if include_catalog:
                meta["op_catalog"] = self._op_catalog()
            yield meta

            eos_ids = self._eos_ids()
            past = None
            cur = input_ids
            generated_ids: list[int] = []

            for step in range(max_new_tokens):
                out = self.model(
                    input_ids=cur,
                    past_key_values=past,
                    use_cache=True,
                    output_hidden_states=True,
                )
                past = out.past_key_values
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
                    "eos": is_eos,
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
