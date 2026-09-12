"""Abstract base class for Hugging Face Model Adapters."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.inference.capabilities import ModelCapabilities, VRAMEstimate


class ModelAdapter(ABC):
    """Abstract interface for architecture-aware Hugging Face model capability adapters."""

    family_name: str = "generic"

    @abstractmethod
    def matches_config(self, config: dict[str, Any]) -> bool:
        """Return True if this adapter handles the given HF model config."""

    @abstractmethod
    def get_capabilities(self, config: dict[str, Any]) -> ModelCapabilities:
        """Inspect HF model config.json dictionary and compute ModelCapabilities matrix."""

    def estimate_vram(self, config: dict[str, Any]) -> VRAMEstimate:
        """Heuristic VRAM estimation based on parameter count & precision."""
        param_count = self._extract_param_count(config)
        if param_count is not None:
            # 2 bytes per param (FP16/BF16) + 20% runtime overhead
            est_gb = round((param_count * 2 * 1.2) / (1024**3), 2)
            return VRAMEstimate(
                estimated_vram_gb=est_gb,
                estimation_basis="params × 2 bytes (FP16) + 20% runtime overhead",
                confidence="approximate",
            )
        return VRAMEstimate(
            estimated_vram_gb=2.0,
            estimation_basis="default fallback estimate",
            confidence="approximate",
        )

    def _extract_param_count(self, config: dict[str, Any]) -> int | None:
        """Estimate or read total parameters from config dictionary."""
        if "num_parameters" in config:
            return int(config["num_parameters"])
        
        hidden_size = config.get("hidden_size") or config.get("n_embd") or config.get("d_model")
        num_layers = config.get("num_hidden_layers") or config.get("n_layer") or config.get("num_layers")
        vocab_size = config.get("vocab_size")

        if hidden_size and num_layers:
            # Approximate parameter count formula for transformer decoder blocks
            # 12 * h^2 per layer + vocab * h
            layer_params = 12 * (hidden_size**2) * num_layers
            embed_params = (vocab_size or 32000) * hidden_size
            return layer_params + embed_params
        return None
