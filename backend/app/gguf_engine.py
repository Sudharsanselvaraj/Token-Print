"""Real quantized GGUF generation through llama.cpp (issue #85).

The honest gap being closed: until now, GGUF files were only *parsed* for
structure while every generated token came from a full-precision PyTorch model.
This engine instead runs the actual quantized weights in the GGUF via
llama.cpp — same sampling path a local user would hit in LM Studio or Ollama —
and exposes the real per-token distribution the quantized model produced.

What is real here:
  - token ids, decoded text, and per-token top-k probabilities come from
    llama.cpp's own logits for the loaded quantized weights;
  - the KV cache accounting (n_positions / cache_len) mirrors the true context
    state inside the llama.cpp context;
  - sampler = llama.cpp's greedy decoder (temperature 0).

What is *not* available (and is never simulated):
  - per-layer activations / per-head attention matrices — llama.cpp's public
    binding does not expose them, so frames carry empty ``layer_stats`` and the
    meta frame says so explicitly.
"""
from __future__ import annotations

import math
import os
import threading
from pathlib import Path
from typing import Iterator, Optional

import logging

import numpy as np

logger = logging.getLogger(__name__)

_LOCK = threading.Lock()


def _decode_id(llm, tid: int) -> str:
    raw = llm.detokenize([int(tid)])
    if isinstance(raw, bytes):
        return raw.decode("utf-8", errors="replace")
    if isinstance(raw, str):
        return raw
    return str(raw)


def _tiny_softmax(logits):
    mx = np.max(logits)
    e = np.exp(logits - mx)
    return e / np.sum(e)


class GGUFEngine:
    """Wrap a llama.cpp model file (server-side path) for honest generation."""

    def __init__(self, path: str, n_ctx: int = 1024) -> None:
        self.path = str(path)
        self.n_ctx = int(n_ctx)
        self._llm = None  # lazy: opening holds ~6s + several hundred MB RAM
        self._meta_cache: Optional[dict] = None
        self._load_lock = threading.Lock()

    # -- lifecycle ---------------------------------------------------------- //
    def close(self) -> None:
        with _LOCK:
            if self._llm is not None:
                try:
                    self._llm.close()
                except Exception:
                    pass
            self._llm = None
            self._meta_cache = None

    def _ensure_loaded(self):
        if self._llm is not None:
            return self._llm
        with self._load_lock:
            if self._llm is not None:
                return self._llm
            try:
                from llama_cpp import Llama
            except ImportError as exc:  # pragma: no cover - optional dependency
                raise RuntimeError(
                    "llama-cpp-python is not installed — install it to run "
                    "quantized GGUF generation."
                ) from exc
            if not Path(self.path).is_file():
                raise FileNotFoundError(f"GGUF file not found: {self.path}")
            self._llm = Llama(
                model_path=self.path,
                n_ctx=self.n_ctx,
                n_threads=max(1, (os.cpu_count() or 4) - 1),
                verbose=False,
                logits_all=True,  # keeps per-position logits in .scores
            )
        return self._llm

    # -- metadata ----------------------------------------------------------- //
    def metadata(self) -> dict:
        if self._meta_cache is not None:
            return self._meta_cache
        llm = self._ensure_loaded()
        meta: dict = dict(llm.metadata or {})
        # Filename is the most reliable quant identifier; GGUF's numeric
        # general.file_type enum has churned across llama.cpp versions.
        quant = None
        stem = Path(self.path).stem.upper()
        for token in ("Q8_0", "Q6_K", "Q5_K_M", "Q5_K_S", "Q5_0", "Q4_K_M", "Q4_K_S", "Q4_0", "Q3_K_M", "Q3_K_S", "Q3_K", "Q2_K", "IQ3", "IQ2", "IQ1", "F16", "FP16", "F32", "FP32", "BF16"):
            if token in stem:
                quant = token
                break
        if not quant:
            for key in ("general.file_type", "general.quantization_version"):
                if meta.get(key):
                    quant = str(meta[key])
                    break
        if not quant:
            for key in ("general.name", "general.finetune"):
                if meta.get(key):
                    quant = str(meta[key])
                    break
        self._meta_cache = {
            "path": self.path,
            "name": meta.get("general.name")
            or meta.get("general.finetune")
            or Path(self.path).stem,
            "architecture": (meta.get("general.architecture") or "unknown"),
            "quant": quant or "unknown",
            "n_vocab": int(llm.n_vocab()),
            "n_ctx": int(llm.n_ctx()),
            "size_bytes": int(Path(self.path).stat().st_size),
        }
        return self._meta_cache

    # -- prompt tokenization ------------------------------------------------ //
    def prompt_tokens(self, prompt: str) -> list[dict]:
        llm = self._ensure_loaded()
        return [{"id": t, "text": _decode_id(llm, t)} for t in llm.tokenize(prompt.encode("utf-8"), add_bos=True)]

    # -- generation ---------------------------------------------------------- //
    def generate(
        self,
        prompt: str,
        max_new_tokens: int = 40,
        top_k: int = 10,
    ) -> Iterator[dict]:
        """Stream frames shaped like `generate_steps` (meta / token / done).

        Only greedy decoding is offered here: llama.cpp's KV cache is a single
        context, not the multi-mode mechanism of the PyTorch engine, so
        sliding-window and speculative modes remain PyTorch-only and the meta
        frame says so plainly.
        """
        llm = self._ensure_loaded()
        meta = self.metadata()

        yield {
            "type": "meta",
            "model": meta["name"],
            "device": "llama.cpp (CPU)",
            "architecture": meta["architecture"],
            "quant": meta["quant"],
            "num_layer_stats": 0,
            "num_layers": 0,
            "prompt_tokens": [t["text"] for t in self.prompt_tokens(prompt)],
            "prompt_len": len(self.prompt_tokens(prompt)),
            "max_new_tokens": int(max_new_tokens),
            "top_k": int(top_k),
            "decoding": "greedy",
            "decoding_params": {},
            "uses_kv_cache": True,
            "source": "llama.cpp (GGUF quantized)",
            "honesty_notes": [
                "token ids + top-k probabilities come from the real quantized "
                "weights (llama.cpp logits)",
                "per-layer activations and per-head attention are not exposed "
                "by llama.cpp — layer_stats/timings are omitted, never simulated",
                "this backend runs greedy sampling; sliding-window and "
                "speculative decode are PyTorch-only",
            ],
        }

        with _LOCK:
            llm.reset()
            init_ids = llm.tokenize(prompt.encode("utf-8"), add_bos=True)
            theta = int(max_new_tokens)
            prompt_len = len(init_ids)
            llm.eval(init_ids)

            eos_text = _decode_id(llm, int(llm.token_eos()))

            step = 0
            emitted_text: list[str] = []
            while step < theta:
                logits = np.asarray(llm.scores)[llm.n_tokens - 1]
                probs = _tiny_softmax(logits)
                k = max(1, min(int(top_k), int(llm.n_vocab())))
                top_idx = np.argsort(-logits)[:k]
                chosen = int(llm.sample(temp=0.0, top_k=40, top_p=1.0, min_p=0.0, repeat_penalty=1.0, penalize_nl=False))
                chosen_text = _decode_id(llm, chosen)
                eos = chosen_text == eos_text or chosen == int(llm.token_eos())
                # KV-cache accounting: after prefill the next token reuses the
                # whole prompt cache and computes exactly one new position.
                n_positions = prompt_len if step == 0 else 1
                cache_len = 0 if step == 0 else llm.n_tokens - 1

                frame = {
                    "type": "token",
                    "step": step,
                    "chosen": {
                        "id": chosen,
                        "text": chosen_text,
                        "logprob": round(float(math.log(max(float(probs[chosen]), 1e-9))), 4),
                    },
                    "topk": [
                        {
                            "id": int(i),
                            "text": _decode_id(llm, int(i)),
                            "logit": round(float(logits[int(i)]), 3),
                            "prob": round(float(probs[int(i)]), 4),
                        }
                        for i in top_idx
                    ],
                    "layer_stats": [],      # honest: llama.cpp exposes no per-layer activations
                    "layer_timings_ms": [],
                    "eos": eos,
                    "phase": "prefill" if step == 0 else "decode",
                    "n_positions": n_positions,
                    "cache_len": cache_len,
                    "source": "llama.cpp",
                }
                yield frame
                emitted_text.append(chosen_text)
                step += 1
                if eos:
                    break
                llm.eval([chosen])

        yield {
            "type": "done",
            "generated_text": "".join(emitted_text),
            "total_steps": step,
            "decoding_mode": "greedy",
            "source": "llama.cpp",
            "quant": meta["quant"],
        }