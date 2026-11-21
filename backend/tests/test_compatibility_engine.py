"""Tests for Model Compatibility Engine.

Verifies:
- 4 capability levels (Discoverable, Loadable, Instrumented, Advanced)
- 12 individual capabilities
- Hardware feasibility analysis (ZeroGPU and CPU)
- Gating and weight formats detection
- /api/hub/models/{model_id}/compatibility endpoint
- /api/hf/inspect backward compatibility
"""

from __future__ import annotations

import pytest
from app.inference.compatibility_engine import (
    calculate_vram_estimate,
    evaluate_hardware_feasibility,
    evaluate_model_compatibility,
    extract_parameter_count,
)
from app.main import (
    _hf_inspect_cache,
    _hf_search_cache,
    _hub_compat_cache,
    _hub_search_cache,
    app,
)
from fastapi.testclient import TestClient

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clear_cache_fixture() -> None:
    _hf_inspect_cache.clear()
    _hf_search_cache.clear()
    _hub_compat_cache.clear()
    _hub_search_cache.clear()
    yield
    _hf_inspect_cache.clear()
    _hf_search_cache.clear()
    _hub_compat_cache.clear()
    _hub_search_cache.clear()


def test_extract_parameter_count() -> None:
    """Test parameter extraction from config dictionary."""
    config_explicit = {"num_parameters": 500_000_000}
    assert extract_parameter_count(config_explicit) == 500_000_000

    config_computed = {
        "hidden_size": 1024,
        "num_hidden_layers": 24,
        "vocab_size": 32000,
    }
    expected = 12 * (1024**2) * 24 + 32000 * 1024
    assert extract_parameter_count(config_computed) == expected


def test_vram_and_hardware_feasibility() -> None:
    """Test VRAM estimation and hardware feasibility evaluation."""
    vram = calculate_vram_estimate(500_000_000, "float16")
    assert vram.estimated_vram_gb > 0
    hw = evaluate_hardware_feasibility(500_000_000, vram.estimated_vram_gb)
    assert hw.zerogpu_feasible is True
    assert hw.cpu_feasible is True

    # 70B parameter model
    vram_70b = calculate_vram_estimate(70_000_000_000, "float16")
    hw_70b = evaluate_hardware_feasibility(70_000_000_000, vram_70b.estimated_vram_gb)
    assert hw_70b.zerogpu_feasible is False
    assert hw_70b.cpu_feasible is False


def test_qwen_level_4_compatibility() -> None:
    """Test that Qwen2 model reaches Level 4 Advanced Interpretability."""
    config = {
        "architectures": ["Qwen2ForCausalLM"],
        "model_type": "qwen2",
        "num_hidden_layers": 24,
        "hidden_size": 896,
        "vocab_size": 151936,
    }
    report = evaluate_model_compatibility("Qwen/Qwen2.5-0.5B-Instruct", config)
    assert report.level_number == 4
    assert report.level_name == "ADVANCED"
    assert report.compatibility_level == "High"
    assert report.capabilities.supports_attention.supported is True
    assert report.capabilities.supports_hidden_states.supported is True
    assert report.capabilities.supports_logit_lens.supported is True
    assert report.capabilities.supports_head_ablation.supported is True
    assert report.capabilities.supports_layer_ablation.supported is True
    assert report.capabilities.supports_activation_patch.supported is True
    assert report.capabilities.supports_residual_stream.supported is True
    assert report.capabilities.supports_moe_routing.supported is False


def test_mixtral_moe_routing_support() -> None:
    """Test that Mixtral architecture detects MoE routing capability."""
    config = {
        "architectures": ["MixtralForCausalLM"],
        "model_type": "mixtral",
        "num_hidden_layers": 32,
        "hidden_size": 4096,
        "num_local_experts": 8,
    }
    report = evaluate_model_compatibility("mistralai/Mixtral-8x7B-v0.1", config)
    assert report.capabilities.supports_moe_routing.supported is True


def test_api_compatibility_endpoint() -> None:
    """Test /api/hub/models/{model_id}/compatibility with Qwen2.5-0.5B."""
    res = client.get("/api/hub/models/Qwen/Qwen2.5-0.5B-Instruct/compatibility")
    assert res.status_code == 200
    data = res.json()
    assert data["model_id"] == "Qwen/Qwen2.5-0.5B-Instruct"
    assert data["level_number"] == 4
    assert data["level_name"] == "ADVANCED"
    assert "capabilities" in data
    assert data["capabilities"]["supports_attention"]["supported"] is True


def test_api_hf_inspect_backward_compatible() -> None:
    """Test /api/hf/inspect with Qwen2.5-0.5B."""
    res = client.get("/api/hf/inspect?model_id=Qwen/Qwen2.5-0.5B-Instruct")
    assert res.status_code == 200
    data = res.json()
    assert data["model_id"] == "Qwen/Qwen2.5-0.5B-Instruct"
    assert data["compatibility_level"] == "High"
    assert "capabilities" in data
