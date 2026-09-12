"""Generic Causal LM model family capability fallback adapter."""

from __future__ import annotations

from typing import Any

from app.inference.adapters.base import ModelAdapter
from app.inference.capabilities import CapabilityStatus, ModelCapabilities


class GenericCausalLMAdapter(ModelAdapter):
    """Fallback adapter for unrecognized or generic causal language model architectures."""

    family_name = "generic"

    def matches_config(self, config: dict[str, Any]) -> bool:
        # Fallback adapter matches any dictionary
        return True

    def get_capabilities(self, config: dict[str, Any]) -> ModelCapabilities:
        param_count = self._extract_param_count(config)
        vram_est = self.estimate_vram(config)
        max_ctx = config.get("max_position_embeddings") or config.get("n_ctx") or 2048
        arch_name = config.get("architectures", ["CausalLM"])[0] if config.get("architectures") else "CausalLM"

        return ModelCapabilities(
            supports_attention=CapabilityStatus(
                supported=True,
                confidence="medium",
                reason=f"Architecture '{arch_name}' recognized as Causal LM; attention extraction attempted via output_attentions=True.",
            ),
            supports_hidden_states=CapabilityStatus(
                supported=True,
                confidence="medium",
                reason=f"Architecture '{arch_name}' hidden states extracted via output_hidden_states=True.",
            ),
            supports_logit_lens=CapabilityStatus(
                supported=False,
                confidence="medium",
                reason=f"Logit lens mapping for unknown architecture '{arch_name}' is not pre-validated.",
            ),
            supports_head_ablation=CapabilityStatus(
                supported=False,
                confidence="low",
                reason=f"Head layout for unknown architecture '{arch_name}' is not validated for head zeroing.",
            ),
            supports_layer_ablation=CapabilityStatus(
                supported=True,
                confidence="medium",
                reason="Layer forward pass bypass supported for standard sequential modules.",
            ),
            supports_activation_patch=CapabilityStatus(
                supported=False,
                confidence="low",
                reason=f"Activation patching for unknown architecture '{arch_name}' is disabled.",
            ),
            max_context_length=max_ctx,
            parameter_count=param_count,
            architecture=arch_name,
            vram_estimate=vram_est,
        )
