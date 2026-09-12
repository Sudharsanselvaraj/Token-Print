"""GGUF llama.cpp inference backend wrapper."""

from __future__ import annotations

from typing import Any

from app.inference.base import InferenceBackend
from app.inference.capabilities import BackendCapabilities
from app.schemas import AnalyzeResponse, ProvenanceInfo


class GGUFBackend(InferenceBackend):
    """InferenceBackend implementation for local quantized GGUF / llama.cpp execution."""

    name = "gguf"

    def __init__(self, gguf_path: str | None = None) -> None:
        self.gguf_path = gguf_path
        self._engine = None

    def _get_engine(self) -> Any:
        if self._engine is None and self.gguf_path:
            from app.gguf_engine import GGUFEngine
            self._engine = GGUFEngine(self.gguf_path)
        return self._engine

    async def load_model(self, model_id: str, **kwargs: Any) -> bool:
        self.gguf_path = model_id
        from app.gguf_engine import GGUFEngine
        self._engine = GGUFEngine(self.gguf_path)
        self._engine.ensure_loaded()
        return True

    async def unload_model(self) -> bool:
        self._engine = None
        return True

    async def tokenize(self, text: str) -> list[int]:
        eng = self._get_engine()
        if eng is None:
            raise RuntimeError("GGUF engine is not loaded.")
        eng.ensure_loaded()
        return eng._llm.tokenize(text.encode("utf-8"))

    async def forward(self, sentence: str, **kwargs: Any) -> dict[str, Any]:
        raise NotImplementedError("Raw forward pass is not exposed by llama.cpp bindings.")

    async def generate(self, prompt: str, **kwargs: Any) -> str:
        eng = self._get_engine()
        if eng is None:
            raise RuntimeError("GGUF engine is not loaded.")
        tokens = []
        for token in eng.generate_tokens(prompt, max_tokens=kwargs.get("max_tokens", 40)):
            tokens.append(token.get("text", ""))
        return "".join(tokens)

    async def analyze(self, sentence: str, **kwargs: Any) -> AnalyzeResponse:
        raise NotImplementedError(
            "Full activation analysis is not supported for GGUF models. "
            "Use generation endpoints for quantized GGUF models."
        )

    def get_capabilities(self, model_id: str | None = None) -> BackendCapabilities:
        return BackendCapabilities(
            backend_name="gguf",
            can_capture_attention=False,
            can_capture_hidden_states=False,
            can_ablate=False,
            can_patch=False,
            supports_streaming=True,
        )

    def health_check(self) -> bool:
        return True
