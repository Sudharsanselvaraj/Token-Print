"""Standardized contract tests for all ModelAdapter implementations."""

import pytest
from app.inference.adapters.gemma import GemmaAdapter
from app.inference.adapters.generic import GenericCausalLMAdapter
from app.inference.adapters.gpt2 import GPT2Adapter
from app.inference.adapters.llama import LlamaAdapter
from app.inference.adapters.mistral import MistralAdapter
from app.inference.adapters.qwen import QwenAdapter


@pytest.mark.parametrize(
    "adapter",
    [
        QwenAdapter(),
        LlamaAdapter(),
        GPT2Adapter(),
        MistralAdapter(),
        GemmaAdapter(),
        GenericCausalLMAdapter(),
    ],
)
def test_adapter_contract_interface(adapter):
    dummy_config = {
        "model_type": adapter.family_name if adapter.family_name != "generic" else "unknown",
        "architectures": [f"{adapter.family_name.capitalize()}ForCausalLM"],
        "hidden_size": 2048,
        "num_hidden_layers": 24,
        "vocab_size": 32000,
    }

    capabilities = adapter.get_capabilities(dummy_config)

    assert hasattr(capabilities, "supports_attention")
    assert hasattr(capabilities, "supports_hidden_states")
    assert hasattr(capabilities, "supports_logit_lens")
    assert hasattr(capabilities, "supports_head_ablation")
    assert hasattr(capabilities, "supports_layer_ablation")
    assert hasattr(capabilities, "supports_activation_patch")

    assert capabilities.supports_attention.supported in (True, False)
    assert capabilities.supports_attention.confidence in ("high", "medium", "low", "approximate")
    assert isinstance(capabilities.supports_attention.reason, str)

    vram = adapter.estimate_vram(dummy_config)
    assert vram.estimated_vram_gb > 0.0
    assert isinstance(vram.estimation_basis, str)
