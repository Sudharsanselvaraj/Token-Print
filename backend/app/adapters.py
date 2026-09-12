"""Model Capability Adapter abstraction (ENG-14).

Provides an extensible ModelAdapter interface and concrete adapter implementations
for Causal LMs, Encoder embedding models, and Vision Transformers.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class ModelAdapter(ABC):
    """Abstract base class defining the capabilities and contracts for model architectures."""

    mode: str = "generic"

    @abstractmethod
    def capabilities(self) -> dict[str, bool]:
        """Return boolean feature capability flags supported by this model architecture."""
        ...

    def process_analysis(self, raw_output: dict[str, Any]) -> dict[str, Any]:
        """Format and augment standard analysis payload with adapter capabilities."""
        payload = dict(raw_output)
        payload["capabilities"] = self.capabilities()
        return payload


class CausalLMAdapter(ModelAdapter):
    """Adapter for decoder-only Causal Language Models (Qwen, Llama, Gemma, GPT-2)."""

    mode: str = "causal_lm"

    def capabilities(self) -> dict[str, bool]:
        return {
            "causal_generation": True,
            "logit_lens": True,
            "attention_maps": True,
            "sentence_pooling": False,
            "image_processing": False,
        }


class EncoderAdapter(ModelAdapter):
    """Adapter for encoder-only embedding models (BERT, RoBERTa)."""

    mode: str = "encoder"

    def capabilities(self) -> dict[str, bool]:
        return {
            "causal_generation": False,
            "logit_lens": False,
            "attention_maps": True,
            "sentence_pooling": True,
            "image_processing": False,
        }


class VisionAdapter(ModelAdapter):
    """Adapter for Vision Transformers (ViT, CLIP)."""

    mode: str = "vision"

    def capabilities(self) -> dict[str, bool]:
        return {
            "causal_generation": False,
            "logit_lens": False,
            "attention_maps": True,
            "sentence_pooling": False,
            "image_processing": True,
        }


def get_model_adapter(mode: str) -> ModelAdapter:
    """Factory function returning the appropriate ModelAdapter for a given mode string."""
    adapters: dict[str, type[ModelAdapter]] = {
        "causal_lm": CausalLMAdapter,
        "encoder": EncoderAdapter,
        "vision": VisionAdapter,
    }
    adapter_cls = adapters.get(mode, CausalLMAdapter)
    return adapter_cls()
