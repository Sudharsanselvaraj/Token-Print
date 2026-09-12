"""HF Local PyTorch inference backend wrapper."""

from __future__ import annotations

from typing import Any

from app.inference.base import InferenceBackend
from app.inference.capabilities import BackendCapabilities
from app.schemas import AnalyzeResponse, ProvenanceInfo


class HFLocalBackend(InferenceBackend):
    """InferenceBackend implementation for local PyTorch / Transformers execution."""

    name = "hf_local"

    def __init__(self, engine: Any = None) -> None:
        self._engine = engine

    def _get_engine(self) -> Any:
        if self._engine is None:
            from app.main import _require_engine
            return _require_engine()
        return self._engine

    async def load_model(self, model_id: str, **kwargs: Any) -> bool:
        eng = self._get_engine()
        eng.load()
        return True

    async def unload_model(self) -> bool:
        eng = self._get_engine()
        eng.unload()
        return True

    async def tokenize(self, text: str) -> list[int]:
        eng = self._get_engine()
        if eng.tokenizer is None:
            eng.load()
        return eng.tokenizer.encode(text)

    async def forward(self, sentence: str, **kwargs: Any) -> dict[str, Any]:
        eng = self._get_engine()
        return eng.analyze(sentence).model_dump()

    async def generate(self, prompt: str, **kwargs: Any) -> str:
        eng = self._get_engine()
        return eng.generate(prompt, **kwargs)

    async def analyze(self, sentence: str, **kwargs: Any) -> AnalyzeResponse:
        eng = self._get_engine()
        raw = eng.analyze(sentence)
        resp = AnalyzeResponse(**raw) if isinstance(raw, dict) else raw

        # Attach explicit Phase 0 ProvenanceInfo if not already populated
        if resp.provenance is None:
            resp.provenance = ProvenanceInfo(
                source_type="REAL",
                backend="hf_local",
                device=resp.device or "cpu",
                model_id=resp.model,
                model_revision=getattr(eng, "revision", None) or "local_weights",
                notes="Executed on local PyTorch instrumentation engine.",
            )

        return resp

    def get_capabilities(self, model_id: str | None = None) -> BackendCapabilities:
        return BackendCapabilities(
            backend_name="hf_local",
            can_capture_attention=True,
            can_capture_hidden_states=True,
            can_ablate=True,
            can_patch=True,
            supports_streaming=False,
        )

    def health_check(self) -> bool:
        eng = self._get_engine()
        return eng.is_loaded or True
