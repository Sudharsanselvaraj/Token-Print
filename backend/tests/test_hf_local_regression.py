"""Regression tests for HFLocalBackend ZeroGPU path, CPU fallback, and health check."""

from __future__ import annotations

import sys
from unittest.mock import MagicMock

import pytest

from app.inference.backends.hf_local import HFLocalBackend
from app.schemas import AnalyzeResponse


@pytest.fixture
def mock_engine():
    eng = MagicMock()
    eng.is_loaded = True
    eng.model = MagicMock()
    eng.tokenizer = MagicMock()
    eng.device = "cpu"
    eng.revision = "test_rev"
    eng.model_id = "Qwen/Qwen2.5-0.5B-Instruct"
    eng.mode = "causal_lm"
    return eng


def _valid_analyze_dict(sentence: str, device: str = "cpu") -> dict:
    return {
        "sentence": sentence,
        "tokens": [
            {"index": 0, "text": "Hello", "piece": "Hello", "id": 15496, "is_special": False, "top_k": []},
            {"index": 1, "text": "world", "piece": "world", "id": 995, "is_special": False, "top_k": []},
        ],
        "attention": [],
        "geometry": {},
        "num_layers": 24,
        "num_heads": 14,
        "hidden_size": 896,
        "device": device,
        "model": "Qwen/Qwen2.5-0.5B-Instruct",
        "mode": "causal_lm",
    }


@pytest.mark.asyncio
async def test_analyze_zerogpu_runner_success_no_unbound_local(mock_engine, monkeypatch):
    """Verify that when ZeroGPU runner succeeds, no UnboundLocalError occurs (Issue 1)."""
    backend = HFLocalBackend()
    backend._engine = mock_engine

    sample_output = _valid_analyze_dict("Hello world", device="cuda")

    # Mock top-level module runner
    main_mod = sys.modules.get("__main__")
    monkeypatch.setattr(main_mod, "hf_space_analyze", lambda s: sample_output, raising=False)

    res = await backend.analyze("Hello world")
    assert isinstance(res, AnalyzeResponse)
    assert res.provenance is not None
    assert res.provenance.backend == "hf_local"
    assert res.sentence == "Hello world"
    assert res.device == "cuda"


@pytest.mark.asyncio
async def test_analyze_zerogpu_runner_fallback_on_quota(mock_engine, monkeypatch):
    """Verify that when ZeroGPU runner raises quota exceeded, CPU fallback is invoked."""
    backend = HFLocalBackend()
    backend._engine = mock_engine

    mock_engine.analyze_cpu_fallback.return_value = _valid_analyze_dict("Fallback test", device="cpu")

    main_mod = sys.modules.get("__main__")

    def failing_runner(s):
        raise RuntimeError("You have exceeded your ZeroGPU runs limit")

    monkeypatch.setattr(main_mod, "hf_space_analyze", failing_runner, raising=False)

    res = await backend.analyze("Fallback test")
    assert isinstance(res, AnalyzeResponse)
    assert mock_engine.analyze_cpu_fallback.called
    assert res.sentence == "Fallback test"


@pytest.mark.asyncio
async def test_analyze_zerogpu_runner_does_not_mask_validation_error(mock_engine, monkeypatch):
    """Verify that non-GPU exceptions (e.g. ValueError) are re-raised and not caught as GPU errors."""
    backend = HFLocalBackend()
    backend._engine = mock_engine

    main_mod = sys.modules.get("__main__")

    def failing_runner(s):
        raise ValueError("Invalid sentence characters")

    monkeypatch.setattr(main_mod, "hf_space_analyze", failing_runner, raising=False)

    with pytest.raises(ValueError, match="Invalid sentence characters"):
        await backend.analyze("Invalid sentence")


def test_health_check_ready(mock_engine):
    backend = HFLocalBackend()
    backend._engine = mock_engine
    assert backend.health_check() is True


def test_health_check_not_ready():
    backend = HFLocalBackend()
    eng = MagicMock()
    eng.is_loaded = False
    eng.model = None
    backend._engine = eng
    assert backend.health_check() is False
