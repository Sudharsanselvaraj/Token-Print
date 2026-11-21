"""Tests for the Model Compatibility Registry."""

from __future__ import annotations

from app.inference.compatibility_registry import (
    get_model_verification,
    list_compatibility_records,
)


def test_registry_contains_initial_candidates():
    candidates = [
        "Qwen/Qwen2.5-0.5B-Instruct",
        "gpt2",
        "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
    ]
    for cid in candidates:
        rec = get_model_verification(cid)
        assert rec is not None, f"Candidate checkpoint '{cid}' must be in registry"
        assert rec.architecture_recognized is True
        assert rec.model_load_tested is True
        assert rec.forward_pass_tested is True
        assert rec.attention_extraction_tested is True
        assert rec.full_interpretability_tested is True
        assert rec.hf_space_deployment_verified is True
        assert rec.status == "fully_operational"


def test_unsupported_models_not_claimed_as_operational():
    unsupported = [
        "mistralai/Mistral-7B-v0.1",
        "deepseek-ai/DeepSeek-V3",
    ]
    for uid in unsupported:
        rec = get_model_verification(uid)
        assert rec is not None
        assert rec.status in ("unsupported", "partially_supported")
        assert rec.model_load_tested is False
        assert rec.hf_space_deployment_verified is False
        assert len(rec.limitations) > 0


def test_list_compatibility_records():
    records = list_compatibility_records()
    assert len(records) >= 3
    ids = [r.model_id for r in records]
    assert "Qwen/Qwen2.5-0.5B-Instruct" in ids
    assert "gpt2" in ids
