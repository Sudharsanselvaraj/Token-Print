"""Abstract base class for all TokenPrint inference backends."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.schemas import AnalyzeResponse


class InferenceBackend(ABC):
    """Abstract base class defining the provider-agnostic inference backend contract.

    Phase 0 implementations (HFLocalBackend, GGUFBackend) implement analyze(),
    get_capabilities(), and health_check(). Future phases implement interactive load,
    tokenize, forward, and generate streaming primitives.
    """

    name: str = "base"

    @abstractmethod
    async def load_model(self, model_id: str, **kwargs: Any) -> bool:
        """Load a model into memory / prepare compute allocation."""
        raise NotImplementedError("load_model is not implemented for this backend.")

    @abstractmethod
    async def unload_model(self) -> bool:
        """Unload the active model from memory."""
        raise NotImplementedError("unload_model is not implemented for this backend.")

    @abstractmethod
    async def tokenize(self, text: str) -> list[int]:
        """Convert raw text into token IDs."""
        raise NotImplementedError("tokenize is not implemented for this backend.")

    @abstractmethod
    async def forward(self, sentence: str, **kwargs: Any) -> dict[str, Any]:
        """Perform a single forward pass returning raw activation dictionary."""
        raise NotImplementedError("forward is not implemented for this backend.")

    @abstractmethod
    async def generate(self, prompt: str, **kwargs: Any) -> str:
        """Generate text completions."""
        raise NotImplementedError("generate is not implemented for this backend.")

    @abstractmethod
    async def analyze(self, sentence: str, **kwargs: Any) -> AnalyzeResponse:
        """Run full forward pass analysis returning unified Trace payload."""

    @abstractmethod
    def get_capabilities(self, model_id: str | None = None) -> Any:
        """Return backend capability flags and constraints."""

    @abstractmethod
    def health_check(self) -> bool:
        """Return True if backend is healthy and ready for inference."""
