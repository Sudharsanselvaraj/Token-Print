"""Mistral model family capability adapter."""

from __future__ import annotations

from typing import Any

from app.inference.adapters.base import ModelAdapter
from app.inference.capabilities import CapabilityStatus, ModelCapabilities


class MistralAdapter(ModelAdapter):
    family_name = "mistral"

    def matches_config(self, config: dict[str, Any]) -> bool:
        model_type = str(config.get("model_type", "")).lower()
        architectures = [str(a).lower() for a in config.get("architectures", [])]
        return "mistral" in model_type or any("mistral" in a for a in architectures)

    def get_capabilities(self, config: dict[str, Any]) -> ModelCapabilities:
        param_count = self._extract_param_count(config)
        vram_est = self.estimate_vram(config)
        max_ctx = config.get("max_position_embeddings") or 8192

        return ModelCapabilities(
            supports_attention=CapabilityStatus(
                supported=True,
                confidence="high",
                reason="Native sliding window attention weights exposed.",
            ),
            supports_hidden_states=CapabilityStatus(
                supported=True,
                confidence="high",
                reason="Intermediate residual stream states accessible.",
            ),
            supports_logit_lens=CapabilityStatus(
                supported=True,
                confidence="high",
                reason="RMSNorm + lm_head supported.",
            ),
            supports_head_ablation=CapabilityStatus(
                supported=True,
                confidence="high",
                reason="Attention head zeroing supported.",
            ),
            supports_layer_ablation=CapabilityStatus(
                supported=True,
                confidence="high",
                reason="Layer bypass supported.",
            ),
            supports_activation_patch=CapabilityStatus(
                supported=True,
                confidence="high",
                reason="Residual stream state injection supported.",
            ),
            max_context_length=max_ctx,
            parameter_count=param_count,
            architecture="MistralForCausalLM",
            vram_estimate=vram_est,
        )
