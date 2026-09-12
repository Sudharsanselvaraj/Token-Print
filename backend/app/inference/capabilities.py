"""Model, Backend, Runtime, and Effective Capability schemas and intersection logic."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class CapabilityStatus(BaseModel):
    """Detailed status of a specific capability with confidence rating and explanation."""

    supported: bool = Field(..., description="Whether the capability is enabled/supported.")
    confidence: Literal["high", "medium", "low", "approximate"] = Field(
        default="high", description="Confidence level of this capability assessment."
    )
    reason: str = Field(..., description="Human-readable explanation of capability status.")


class VRAMEstimate(BaseModel):
    """Heuristic VRAM memory estimate."""

    estimated_vram_gb: float = Field(..., description="Estimated VRAM consumption in GB.")
    estimation_basis: str = Field(..., description="Calculation methodology/formula.")
    confidence: Literal["high", "medium", "low", "approximate"] = Field(
        default="approximate", description="Confidence level of VRAM estimate."
    )


class ModelCapabilities(BaseModel):
    """Capabilities intrinsic to a transformer model architecture."""

    supports_attention: CapabilityStatus
    supports_hidden_states: CapabilityStatus
    supports_logit_lens: CapabilityStatus
    supports_head_ablation: CapabilityStatus
    supports_layer_ablation: CapabilityStatus
    supports_activation_patch: CapabilityStatus
    max_context_length: int = 2048
    parameter_count: int | None = None
    architecture: str = "Unknown"
    vram_estimate: VRAMEstimate | None = None


class BackendCapabilities(BaseModel):
    """Capabilities provided by an inference backend (e.g. PyTorch Local vs Hosted API)."""

    backend_name: str
    can_capture_attention: bool = True
    can_capture_hidden_states: bool = True
    can_ablate: bool = True
    can_patch: bool = True
    supports_streaming: bool = False


class RuntimeCapabilities(BaseModel):
    """Capabilities available in the current runtime environment (hardware, VRAM, device)."""

    device: str = "cpu"
    available_vram_gb: float | None = None
    cuda_available: bool = False
    mps_available: bool = False


class EffectiveCapabilities(BaseModel):
    """Effective capability matrix derived from intersecting Model, Backend, and Runtime capabilities."""

    compatibility_level: Literal["High", "Partial", "Basic", "Unsupported"] = "High"
    compatibility_reason: str = ""

    supports_attention: CapabilityStatus
    supports_hidden_states: CapabilityStatus
    supports_logit_lens: CapabilityStatus
    supports_head_ablation: CapabilityStatus
    supports_layer_ablation: CapabilityStatus
    supports_activation_patch: CapabilityStatus

    vram_estimate: VRAMEstimate | None = None


def calculate_effective_capabilities(
    model_caps: ModelCapabilities,
    backend_caps: BackendCapabilities,
    runtime_caps: RuntimeCapabilities,
) -> EffectiveCapabilities:
    """Calculate effective capability by intersecting model, backend, and runtime capabilities."""

    def _intersect(
        mod_cap: CapabilityStatus, backend_flag: bool, cap_name: str
    ) -> CapabilityStatus:
        if not mod_cap.supported:
            return mod_cap
        if not backend_flag:
            return CapabilityStatus(
                supported=False,
                confidence="high",
                reason=f"Model supports {cap_name}, but backend '{backend_caps.backend_name}' does not expose raw activations.",
            )
        return mod_cap

    attn = _intersect(model_caps.supports_attention, backend_caps.can_capture_attention, "attention")
    hidden = _intersect(model_caps.supports_hidden_states, backend_caps.can_capture_hidden_states, "hidden states")
    logit = _intersect(model_caps.supports_logit_lens, backend_caps.can_capture_hidden_states, "logit lens")
    head_abl = _intersect(model_caps.supports_head_ablation, backend_caps.can_ablate, "head ablation")
    layer_abl = _intersect(model_caps.supports_layer_ablation, backend_caps.can_ablate, "layer ablation")
    patch = _intersect(model_caps.supports_activation_patch, backend_caps.can_patch, "activation patching")

    # Determine overall compatibility level
    supported_count = sum(1 for c in [attn, hidden, logit, head_abl] if c.supported)
    if supported_count == 4:
        level: Literal["High", "Partial", "Basic", "Unsupported"] = "High"
        reason = "Full native instrumentation available (Attention, Hidden States, Logit Lens, Ablation)."
    elif supported_count >= 2:
        level = "Partial"
        reason = "Partial instrumentation available."
    elif supported_count >= 1:
        level = "Basic"
        reason = "Basic inference / limited activation extraction."
    else:
        level = "Unsupported"
        reason = "Model architecture or backend does not support activation extraction."

    return EffectiveCapabilities(
        compatibility_level=level,
        compatibility_reason=reason,
        supports_attention=attn,
        supports_hidden_states=hidden,
        supports_logit_lens=logit,
        supports_head_ablation=head_abl,
        supports_layer_ablation=layer_abl,
        supports_activation_patch=patch,
        vram_estimate=model_caps.vram_estimate,
    )
