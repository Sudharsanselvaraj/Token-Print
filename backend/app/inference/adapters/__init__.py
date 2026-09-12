"""Model Adapters registry and deterministic selection engine."""

from __future__ import annotations

from typing import Any

from app.inference.adapters.base import ModelAdapter
from app.inference.adapters.gemma import GemmaAdapter
from app.inference.adapters.generic import GenericCausalLMAdapter
from app.inference.adapters.gpt2 import GPT2Adapter
from app.inference.adapters.llama import LlamaAdapter
from app.inference.adapters.mistral import MistralAdapter
from app.inference.adapters.qwen import QwenAdapter

# Priority list of specific model adapters
SPECIFIC_ADAPTERS: list[ModelAdapter] = [
    QwenAdapter(),
    LlamaAdapter(),
    GPT2Adapter(),
    MistralAdapter(),
    GemmaAdapter(),
]

FALLBACK_ADAPTER: ModelAdapter = GenericCausalLMAdapter()


def select_model_adapter(config: dict[str, Any]) -> ModelAdapter:
    """Deterministically select a model adapter based on config.architectures and config.model_type.

    Selection sequence:
    1. Inspect config.architectures list against registered adapters.
    2. Inspect config.model_type string against registered adapters.
    3. Fallback to GenericCausalLMAdapter if no specific adapter matches.
    """
    for adapter in SPECIFIC_ADAPTERS:
        if adapter.matches_config(config):
            return adapter
    return FALLBACK_ADAPTER
