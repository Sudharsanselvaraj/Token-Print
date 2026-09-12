"""Inference backend registry for provider-agnostic dispatch."""

from __future__ import annotations

import logging

from app.inference.backends.gguf import GGUFBackend
from app.inference.backends.hf_local import HFLocalBackend
from app.inference.base import InferenceBackend

logger = logging.getLogger(__name__)


class InferenceBackendRegistry:
    """Registry maintaining active and registered inference backends."""

    def __init__(self) -> None:
        self._backends: dict[str, InferenceBackend] = {}
        # Register Phase 0 default backends
        self.register(HFLocalBackend())
        self.register(GGUFBackend())

    def register(self, backend: InferenceBackend) -> None:
        """Register a backend instance under backend.name."""
        self._backends[backend.name] = backend
        logger.info(f"Registered inference backend: '{backend.name}'")

    def get_backend(self, name: str = "hf_local") -> InferenceBackend:
        """Fetch a registered backend by name."""
        if name not in self._backends:
            raise KeyError(
                f"Unknown inference backend '{name}'. Available backends: {list(self._backends.keys())}"
            )
        return self._backends[name]

    def list_backends(self) -> list[str]:
        """Return list of all registered backend names."""
        return list(self._backends.keys())


# Global backend registry instance
registry = InferenceBackendRegistry()
