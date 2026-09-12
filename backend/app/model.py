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

import io
import os
import threading
import time
from typing import ClassVar

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

import torch
from transformers import (
    AutoConfig,
    AutoModel,
    AutoModelForCausalLM,
    AutoTokenizer,
    DynamicCache,
)

from .debug import DebugCapture
from .reduce import explained_variance, project_3d

DEFAULT_MODEL_ID = os.environ.get("NEUROSCOPE_MODEL", "Qwen/Qwen2.5-0.5B-Instruct")
MAX_TOKENS = int(os.environ.get("NEUROSCOPE_MAX_TOKENS", "40"))

# Rounding / thresholding for the attention payload.
_ATTN_DECIMALS = 3
_ATTN_ZERO_BELOW = 0.01

# Model-family classification (issue #87): the engine supports decoder-only
# causal LMs, encoder-only embedding models, and vision transformers.
_CAUSAL_LM_TYPES = {
    "qwen2", "llama", "gemma", "gemma2", "gpt2", "gptj", "gpt_neox",
    "mistral", "mixtral", "phi", "phi3", "falcon", "opt", "bloom",
    "starcoder2", "qwen2_moe", "codegen", "gpt_bigcode", "baichuan",
    "internlm", "xglm", "mpt",
}
_ENCODER_TYPES = {
    "bert", "roberta", "electra", "distilbert", "albert", "deberta",
    "deberta-v2", "layoutlm", "camembert", "xlm-roberta", "mpnet",
    "mobilebert", "longformer", "ibert", "data2vec-text",
}
_VISION_TYPES = {
    "vit", "deit", "swin", "convnext", "clip", "siglip", "blip",
    "levit", "segformer", "beit", "poolformer", "vit_mae", "imagegpt",
    "donut-swin",
}


def _classify_model_type(model_type: str) -> str:
    """Map a HF ``model_type`` to one of ``causal_lm`` / ``encoder`` / ``vision``."""
    model_type = str(model_type or "").lower()
    if model_type in _CAUSAL_LM_TYPES:
        return "causal_lm"
    if model_type in _ENCODER_TYPES:
        return "encoder"
    if model_type in _VISION_TYPES:
        return "vision"
    # Unknown: default to causal LM (backward compatible) but never claim it.
    return "causal_lm"


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

        # Detect the model family up front (issue #87): decoder-only causal
        # LMs, encoder-only embedding models, and vision transformers load
        # through the appropriate Auto class and run through matching pipelines.
        probe_cfg = AutoConfig.from_pretrained(model_id)
        self.model_type: str = str(getattr(probe_cfg, "model_type", "unknown"))
        self.mode: str = _classify_model_type(self.model_type)

        self.tokenizer: AutoTokenizer | None = None
        self.image_processor = None
        if self.mode == "encoder":
            self.tokenizer = AutoTokenizer.from_pretrained(model_id)
            self.model = AutoModel.from_pretrained(
                model_id,
                attn_implementation=self.attn_implementation,
                torch_dtype=torch.float32,
            )
        elif self.mode == "vision":
            # Vision transformers have no text tokenizer; the image processor
            # is built lazily on first use (it can encode user-provided images).
            self.model = AutoModel.from_pretrained(
                model_id,
                attn_implementation=self.attn_implementation,
                torch_dtype=torch.float32,
            )
        else:
            self.tokenizer = AutoTokenizer.from_pretrained(model_id)
            self.model = AutoModelForCausalLM.from_pretrained(
                model_id,
                attn_implementation=self.attn_implementation,  # REQUIRED for real attentions
                torch_dtype=torch.float32,
            )
        self.model.to(self.device)
        self.model.eval()

        cfg = probe_cfg
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

    def _layer_list(self):
        """Return the ModuleList of transformer layers regardless of mode."""
        if self.mode == "encoder":
            base = getattr(self.model, "encoder", self.model)
            return (
                getattr(base, "layer", None)
                or getattr(base, "layers", None)
                or getattr(base, "blocks", None)
            )
        base = getattr(self.model, "model", self.model)
        return (
            getattr(base, "layers", None)
            or getattr(base, "layer", None)
            or getattr(base, "blocks", None)
        )

    def _register_layer_timing_hooks(self) -> None:
        """Register pre/post hooks on each transformer layer writing ms timings."""
        layers = self._layer_list()
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

        captured: dict[int, torch.Tensor] = {}
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
            import torch.nn.functional as F
        except Exception:  # noqa: BLE001
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
        """Run one real forward pass and return tokens, attention, and geometry.

        Dispatches by the loaded model's family (issue #87): decoder-only
        causal LMs keep the logit-lens path; encoder-only models return real
        token embeddings + attention + a pooled sentence vector; vision
        transformers must be inspected through ``analyze_image``.
        """
        if self.mode == "vision":
            raise ValueError(
                "Vision transformers process images, not sentences — "
                "use POST /analyze/image."
            )
        if self.mode == "encoder":
            return self._analyze_encoder(sentence)
        return self._analyze_causal_lm(sentence)

    def _analyze_causal_lm(self, sentence: str) -> dict:
        """Decoder-only causal LM forward pass (tokens, attention, geometry)."""
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
            "mode": self.mode,
            "model_type": self.model_type,
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
    # Encoder-only embedding models (issue #87)
    # ------------------------------------------------------------------ #
    def _analyze_encoder(self, sentence: str) -> dict:
        """Real forward pass through a BERT-style encoder.

        Returns the same shape as the causal pipeline — real tokens, per-layer
        hidden states (PCA-projected), real attention maps, per-token embedding
        norms, plus a ``pooled_vector`` (the model's own pooled sentence
        embedding) and ``pooling_note`` describing exactly which rule produced
        it. Logit lens is N/A for encoder-only models and left empty.
        """
        with self._lock:
            enc, tokens = self._tokenize(sentence)
            enc = {k: v.to(self.device) for k, v in enc.items()}

            with torch.no_grad():
                out = self.model(
                    **enc, output_attentions=True, output_hidden_states=True
                )
            attn = torch.stack(out.attentions).squeeze(1).to("cpu").float()
            attn = torch.round(attn * (10**_ATTN_DECIMALS)) / (10**_ATTN_DECIMALS)
            attn[attn < _ATTN_ZERO_BELOW] = 0.0
            attention = attn.tolist()

            hidden = [h.squeeze(0).to("cpu").float().numpy() for h in out.hidden_states]
            hidden_states_3d = {str(i): project_3d(h) for i, h in enumerate(hidden)}
            embeddings_3d = hidden_states_3d["0"]
            emb_norms = [round(float(v), 4) for v in (hidden[0] ** 2).sum(1) ** 0.5]

            # Pooled sentence embedding — the model's own pooler (dense+tanh)
            # when present, otherwise an explicit mean-pool of the last layer
            # over non-pad tokens. The rule is reported, never guessed.
            last = out.hidden_states[-1][0]  # [seq, hidden]
            mask = enc.get("attention_mask", torch.ones_like(enc["input_ids"]))[0]
            pooled: torch.Tensor | None = None
            pooling_note = ""
            pooler = getattr(self.model, "pooler", None)
            if pooler is not None and out.pooler_output is not None:
                pooled = out.pooler_output[0].float().cpu()
                pooling_note = "model's own pooler (dense + tanh on [CLS])"
            else:
                pooled = (last * mask.unsqueeze(-1)).sum(0) / mask.sum().clamp(min=1)
                pooled = pooled.float().cpu()
                pooling_note = "mean-pool of the last hidden layer over non-pad tokens"

        return {
            "sentence": sentence,
            "model": self.model_id,
            "device": self.device,
            "mode": self.mode,
            "model_type": self.model_type,
            "num_layers": self.num_layers,
            "num_heads": self.num_heads,
            "hidden_size": self.hidden_size,
            "tokens": tokens,
            "attention": attention,
            "embeddings_3d": embeddings_3d,
            "hidden_states_3d": hidden_states_3d,
            "embedding_norms": emb_norms,
            "logit_lens": [],
            "pooled_vector": [round(float(v), 5) for v in pooled.tolist()],
            "pooling_note": pooling_note,
            "projection": {
                "method": "PCA",
                "note": (
                    "3D PCA projection of real encoder hidden states; distances "
                    "are approximate."
                ),
                "embedding_explained_variance": explained_variance(hidden[0]),
            },
        }

    # ------------------------------------------------------------------ #
    # Vision transformers (issue #87) — patches as tokens
    # ------------------------------------------------------------------ #
    def _vision_processor(self):
        """Lazily build the AutoImageProcessor for the loaded vision model."""
        if self.image_processor is None:
            from transformers import AutoImageProcessor

            self.image_processor = AutoImageProcessor.from_pretrained(self.model_id)
        return self.image_processor

    @staticmethod
    def _load_image_bytes(image: str) -> torch.Tensor | bytes:
        """Turn an image payload (base64 data URL or http(s) URL) into bytes.

        Returns the decoded bytes; raises ValueError for anything unsupported.
        """
        if image.startswith("data:image/"):
            import base64
            import binascii

            try:
                _, payload = image.split(",", 1)
                return base64.b64decode(payload)
            except (binascii.Error, ValueError) as exc:
                raise ValueError("Malformed base64 image payload.") from exc
        if image.startswith(("http://", "https://")):
            import urllib.request

            try:
                with urllib.request.urlopen(image, timeout=30) as resp:
                    return resp.read()
            except Exception as exc:
                raise ValueError(f"Could not fetch image URL: {exc}") from exc
        raise ValueError(
            "Unsupported image payload — pass a base64 data:image/... URL or an http(s) URL."
        )

    def analyze_image(self, image: str) -> dict:
        """Run one real forward pass on an image through the loaded vision model.

        Image patches are surfaced as "tokens" (including the [CLS] patch), each
        with real patch embeddings and real attention from the forward pass. The
        check/patch-resolution is reported in ``image_meta``.
        """
        from PIL import Image

        if self.mode != "vision":
            raise ValueError(
                f"Loaded model ({self.mode}) is not a vision transformer."
            )
        with self._lock:
            raw = self._load_image_bytes(image)
            img_src = Image.open(io.BytesIO(raw))
            img_format = img_src.format
            img = img_src.convert("RGB")
            processor = self._vision_processor()
            inputs = processor(images=img, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            with torch.no_grad():
                out = self.model(
                    **inputs, output_attentions=True, output_hidden_states=True
                )
                last = out.last_hidden_state[0]  # [n_patches, hidden]

            attn = torch.stack(out.attentions).squeeze(1).to("cpu").float()
            attn = torch.round(attn * (10**_ATTN_DECIMALS)) / (10**_ATTN_DECIMALS)
            attn[attn < _ATTN_ZERO_BELOW] = 0.0
            attention = attn.tolist()

            hidden = [h.squeeze(0).to("cpu").float().numpy() for h in out.hidden_states]
            hidden_states_3d = {str(i): project_3d(h) for i, h in enumerate(hidden)}
            embeddings_3d = hidden_states_3d["0"]
            emb_norms = [round(float(v), 4) for v in (hidden[0] ** 2).sum(1) ** 0.5]
            pooled = last[0].float().cpu().tolist()

            # Patch grid layout so the scene can name each "token".
            n_patches = last.shape[0]
            try:
                grid_n = (
                    int(getattr(self.model.config, "image_size", 0)
                        // getattr(self.model.config, "patch_size", 16))
                ) or round(n_patches ** 0.5)
            except Exception:  # noqa: BLE001
                grid_n = round(n_patches ** 0.5)
            grid_n = max(1, grid_n)
            tokens = []
            for i in range(n_patches):
                if i == 0:
                    text = "[CLS]"
                    is_special = True
                else:
                    pr = i - 1
                    r = pr // grid_n
                    c = pr % grid_n
                    text = f"patch {r}×{c}"
                    is_special = False
                tokens.append(
                    {
                        "index": i,
                        "id": i,
                        "piece": text,
                        "text": text,
                        "is_special": is_special,
                    }
                )

        return {
            "sentence": f"image → {grid_n}×{grid_n} patches",
            "model": self.model_id,
            "device": self.device,
            "mode": self.mode,
            "model_type": self.model_type,
            "num_layers": self.num_layers,
            "num_heads": self.num_heads,
            "hidden_size": self.hidden_size,
            "tokens": tokens[:256],
            "attention": attention,
            "embeddings_3d": embeddings_3d,
            "hidden_states_3d": hidden_states_3d,
            "embedding_norms": emb_norms,
            "logit_lens": [],
            "pooled_vector": [round(float(v), 5) for v in pooled],
            "pooling_note": "vision [CLS] patch embedding",
            "image_meta": {
                "n_patches": n_patches,
                "grid_n": grid_n,
                "format": img_format,
                "mode": img.mode,
            },
            "projection": {
                "method": "PCA",
                "note": (
                    "3D PCA projection of real patch embeddings; distances are "
                    "approximate."
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
    # Activation patching (issue #75, issue #115)
    # ------------------------------------------------------------------ #
    def analyze_patched(
        self,
        sentence: str,
        source_sentence: str,
        patch_layers: list[int],
        patch_spans: list[tuple[int, int]] | tuple[int, int] | None = None,
        source_spans: list[tuple[int, int]] | tuple[int, int] | None = None,
        mode: str = "replace",
    ) -> dict:
        """Run the target sentence with residual states patched from the source.

        Returns ``analyze()``-shaped data for the patched run plus a ``patch``
        block describing what was replaced, plus ``analysis_clean`` (the
        unpatched target run) and ``analysis_source`` (the source run) so the
        frontend can compare before/after and visualize trajectories.

        Supports position-aware patching via ``patch_spans`` (issue #115).
        """
        from .ablation import ActivationPatch

        if self.mode != "causal_lm":
            raise ValueError(
                "Activation patching is only supported for decoder-only causal LMs."
            )
        with self._lock:
            patch = ActivationPatch(
                self.model.model,
                set(patch_layers),
                patch_spans=patch_spans,
                source_spans=source_spans,
                mode=mode,
            )
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
            "patch_spans": patch._patch_spans,
            "mode": mode,
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
        moe_captured: dict[int, torch.Tensor] = {}
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
            except Exception:  # noqa: BLE001
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
        decoding_mode: str = "greedy",
        window_size: int = 512,
        draft_gamma: int = 4,
        needle: str | None = None,
    ):
        """Yield one frame per generated token from a real autoregressive loop.

        Decoding modes (issue #86):
          * ``greedy`` — classic one-token-per-step argmax.
          * ``sliding_window`` — the KV cache is trimmed to the last
            ``window_size`` positions each decode step, so the model genuinely
            recomputes with a reduced visual context (real, not fake).
          * ``speculative`` — self-speculative "blockwise" decoding: draft
            ``draft_gamma`` candidate tokens cheaply from the last distribution,
            verify ALL of them in one batched forward pass, then accept the
            longest matching prefix (a real appraise-accept step).

        When ``needle`` is set, the text is injected as a "memory" sentence at the
        start of the prompt and the done frame reports whether the model recalls
        it verbatim in its output — a long-context needle test.
        """
        max_new_tokens = max(1, min(int(max_new_tokens), 64))
        top_k = max(1, min(int(top_k), 20))
        window_size = max(16, min(int(window_size), 4096))
        draft_gamma = max(1, min(int(draft_gamma), 8))
        decoding_mode = decoding_mode if decoding_mode in ("greedy", "sliding_window", "speculative") else "greedy"
        if self.mode != "causal_lm":
            raise ValueError(
                f"{self.mode} models do not generate text — decoding is only "
                "available for decoder-only causal LMs."
            )

        needle_report: dict | None = None
        if needle:
            needle = str(needle).strip()
            if needle:
                prompt = f'[MEMORY] {needle}\n\n[QUERY] {prompt}'

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
                "decoding": decoding_mode,
                "decoding_params": {
                    "window_size": window_size,
                    "draft_gamma": draft_gamma,
                    "needle": needle or None,
                },
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
            positions_done = 0
            drafts_accepted = 0
            draft_batches = 0

            def trim_cache(past_ckv, keep: int):
                """Keep only the last ``keep`` positions of a KV cache."""
                if past_ckv is None:
                    return past_ckv
                if isinstance(past_ckv, DynamicCache) and past_ckv.key_cache:
                    nk = int(past_ckv.key_cache[0].shape[-2])
                    if nk <= keep:
                        return past_ckv
                    dyn = DynamicCache()
                    dyn.key_cache = [t[..., -keep:, :] for t in past_ckv.key_cache]
                    dyn.value_cache = [t[..., -keep:, :] for t in past_ckv.value_cache]
                    dyn._seen_tokens = keep
                    return dyn
                if (
                    isinstance(past_ckv, tuple)
                    and past_ckv
                    and isinstance(past_ckv[0], tuple)
                ):
                    return tuple(
                        tuple(v[..., -keep:, :] if v is not None else v for v in t)
                        for t in past_ckv
                    )
                return past_ckv

            def emit_frame(step, chosen_id, probs, logits, hidden_states,
                           phase, n_positions, cache_len_in, extra: dict | None = None):
                topk = probs.topk(top_k)
                top_ids = topk.indices[0].tolist()
                top_probs = topk.values[0].tolist()
                top_logits = logits[0, top_ids].tolist()
                layer_stats = [
                    round(float(h[0, -1].abs().mean()), 4) for h in hidden_states
                ]
                frame = {
                    "type": "token",
                    "step": step,
                    "chosen": {
                        "id": chosen_id,
                        "text": self._decode_id(chosen_id),
                        "logprob": round(float(probs[0, chosen_id].log()), 4),
                    },
                    "topk": [
                        {"id": int(i), "text": self._decode_id(int(i)),
                         "logit": round(float(lg), 3), "prob": round(float(p), 4)}
                        for i, lg, p in zip(top_ids, top_logits, top_probs)
                    ],
                    "layer_stats": layer_stats,
                    "layer_timings_ms": self._last_layer_timings_ms(),
                    "eos": chosen_id in eos_ids,
                    "phase": phase,
                    "n_positions": n_positions,
                    "cache_len": cache_len_in,
                }
                if extra:
                    frame.update(extra)
                return frame

            step = 0
            while step < max_new_tokens:
                n_positions = int(cur.shape[1])
                cache_len_in = positions_done
                phase = "prefill" if past is None else "decode"

                if decoding_mode == "sliding_window" and past is not None and positions_done > window_size:
                    past = trim_cache(past, window_size)
                    cache_len_in = positions_done - window_size

                out = self.model(
                    input_ids=cur,
                    past_key_values=past,
                    use_cache=True,
                    output_hidden_states=True,
                )
                past = out.past_key_values
                positions_done += n_positions

                logits = out.logits[:, -1, :]
                probs = logits.softmax(-1)

                if decoding_mode == "speculative" and phase == "decode" and draft_gamma > 1 and step + draft_gamma <= max_new_tokens:
                    # --- Self-speculative pass: draft + verify in one batch. ---
                    draft_batches += 1
                    # The draft distribution is the model's own next-token
                    # distribution sharpened (temperature 0.6) — a cheap,
                    # confident draft. torch.multinomial segfaults on MPS, so
                    # we sample on CPU (one small vocab-vector copy).
                    draft_probs = (logits / 0.6).softmax(-1)[0].float().cpu()
                    draft_ids = torch.multinomial(
                        draft_probs, draft_gamma, replacement=True
                    )
                    draft_seq = [int(d) for d in draft_ids.tolist()]
                    draft_tokens = torch.tensor([draft_seq], device=self.device)
                    vout = self.model(
                        input_ids=draft_tokens,
                        past_key_values=past,
                        use_cache=True,
                        output_hidden_states=True,
                    )
                    vlogits = vout.logits  # [1, gamma, vocab]
                    vprobs = vlogits.softmax(-1)

                    # Acceptance prefix. Draft token 0 is checked against the
                    # pre-draft decode distribution; draft token g (>=1) against
                    # the verify row g-1 (the prediction made after reading the
                    # earlier drafts). That row *is* the single-step forward the
                    # verify pass reuses — the batched count of 1.
                    k = 0
                    if draft_seq[0] == int(probs.argmax().item()):
                        k = 1
                        for g in range(1, draft_gamma):
                            if draft_seq[g] == int(vprobs[0, g - 1].argmax().item()):
                                k += 1
                            else:
                                break
                    drafts_accepted += k

                    # Tokens to emit this step: k accepted drafts + 1 target
                    # continuation token (the model's own greedy next token).
                    if k == draft_gamma:
                        cont = int(vprobs[0, draft_gamma - 1].argmax().item())
                    elif k >= 1:
                        cont = int(vprobs[0, k - 1].argmax().item())
                    else:
                        cont = int(probs.argmax().item())
                    emit_ids = draft_seq[:k] + [cont]

                    for g, cid in enumerate(emit_ids):
                        if g == 0:
                            row_probs, row_logits = probs, logits
                            row_hs = out.hidden_states
                        else:
                            r = max(0, min(g - 1, draft_gamma - 1))
                            row_probs = vprobs[:, r:r + 1, :].squeeze(1)
                            row_logits = vlogits[:, r:r + 1, :].squeeze(1)
                            row_hs = [h[:, r:r + 1, :] for h in vout.hidden_states]
                        generated_ids.append(cid)
                        yield emit_frame(
                            step, cid, row_probs, row_logits, row_hs,
                            phase, n_positions, cache_len_in,
                            {
                                "accepted_drafts": True,
                                "draft_batch": True,
                                "n_accepted": k,
                                "draft_pos": g,
                                "spec_cont": g >= k,
                            },
                        )
                        step += 1
                        cache_len_in += 1
                        if cid in eos_ids:
                            break
                    past = vout.past_key_values
                    positions_done += len(emit_ids)
                    chosen_id = generated_ids[-1]
                    if chosen_id in eos_ids:
                        break
                    cur = torch.tensor([[chosen_id]], device=self.device)
                    continue
                else:
                    chosen_id = int(probs.argmax().item())
                    generated_ids.append(chosen_id)
                    yield emit_frame(step, chosen_id, probs, logits, out.hidden_states,
                                     phase, n_positions, cache_len_in)
                    step += 1
                    if chosen_id in eos_ids:
                        break
                    cur = torch.tensor([[chosen_id]], device=self.device)

            # Needle recall report.
            if needle:
                gen_text = self.tokenizer.decode(generated_ids, skip_special_tokens=True)
                gen_lower = gen_text.lower()
                # The model rarely returns the full needle verbatim; recall means
                # it surfaced at least one distinctive needle word in its output.
                significant = [
                    w.strip(".,;:!?") for w in str(needle).lower().split()
                    if len(w.strip(".,;:!?")) > 3
                ]
                recalled = bool(significant) and any(w in gen_lower for w in significant)
                needle_report = {
                    "needle": needle,
                    "recalled": recalled,
                    "response": gen_text,
                }

            done = {
                "type": "done",
                "generated_text": self.tokenizer.decode(
                    generated_ids, skip_special_tokens=True
                ),
                "total_steps": len(generated_ids),
            }
            if decoding_mode != "greedy":
                done["decoding_mode"] = decoding_mode
            if decoding_mode == "speculative":
                done["draft_batches"] = draft_batches
                done["drafts_accepted"] = drafts_accepted
                done["acceptance_rate"] = round(
                    drafts_accepted / max(draft_batches * draft_gamma, 1), 4
                )
            if needle_report:
                done["needle_report"] = needle_report
            yield done

    # ------------------------------------------------------------------ #
    # Operation catalog (Generation — real per-op params/weights/dims)
    # ------------------------------------------------------------------ #
    _OP_LABELS: ClassVar[dict[str, str]] = {
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
            "mode": self.mode,
            "model_type": self.model_type,
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
