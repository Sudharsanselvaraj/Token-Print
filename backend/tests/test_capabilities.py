"""Unit tests for capability calculations and intersection logic."""

from app.inference.capabilities import (
    BackendCapabilities,
    CapabilityStatus,
    ModelCapabilities,
    RuntimeCapabilities,
    calculate_effective_capabilities,
)


def test_calculate_effective_capabilities_high_compatibility():
    mod_caps = ModelCapabilities(
        supports_attention=CapabilityStatus(supported=True, confidence="high", reason="Native attention"),
        supports_hidden_states=CapabilityStatus(supported=True, confidence="high", reason="Hidden states"),
        supports_logit_lens=CapabilityStatus(supported=True, confidence="high", reason="Logit lens"),
        supports_head_ablation=CapabilityStatus(supported=True, confidence="high", reason="Head ablation"),
        supports_layer_ablation=CapabilityStatus(supported=True, confidence="high", reason="Layer ablation"),
        supports_activation_patch=CapabilityStatus(supported=True, confidence="high", reason="Patching"),
    )
    backend_caps = BackendCapabilities(
        backend_name="hf_local",
        can_capture_attention=True,
        can_capture_hidden_states=True,
        can_ablate=True,
        can_patch=True,
    )
    runtime_caps = RuntimeCapabilities(device="cpu")

    eff = calculate_effective_capabilities(mod_caps, backend_caps, runtime_caps)

    assert eff.compatibility_level == "High"
    assert eff.supports_attention.supported is True
    assert eff.supports_hidden_states.supported is True


def test_calculate_effective_capabilities_backend_limitation():
    mod_caps = ModelCapabilities(
        supports_attention=CapabilityStatus(supported=True, confidence="high", reason="Native attention"),
        supports_hidden_states=CapabilityStatus(supported=True, confidence="high", reason="Hidden states"),
        supports_logit_lens=CapabilityStatus(supported=True, confidence="high", reason="Logit lens"),
        supports_head_ablation=CapabilityStatus(supported=True, confidence="high", reason="Head ablation"),
        supports_layer_ablation=CapabilityStatus(supported=True, confidence="high", reason="Layer ablation"),
        supports_activation_patch=CapabilityStatus(supported=True, confidence="high", reason="Patching"),
    )
    # Backend that cannot capture attention or ablate (e.g. basic provider API)
    backend_caps = BackendCapabilities(
        backend_name="basic_provider",
        can_capture_attention=False,
        can_capture_hidden_states=False,
        can_ablate=False,
        can_patch=False,
    )
    runtime_caps = RuntimeCapabilities(device="cpu")

    eff = calculate_effective_capabilities(mod_caps, backend_caps, runtime_caps)

    assert eff.compatibility_level == "Unsupported"
    assert eff.supports_attention.supported is False
    assert "basic_provider" in eff.supports_attention.reason
