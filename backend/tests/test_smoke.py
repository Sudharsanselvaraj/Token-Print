"""FastAPI backend API smoke regression tests (ENG-21).

Tests core endpoints (/health, /model-info, /architecture, /analyze, /trace)
to verify endpoint liveness, schema compliance, and regression safety in CI.
"""

import sys
from pathlib import Path
from unittest import mock

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Pre-mock heavy native deps before importing app.main
_HEAVY_MODS = [
    "torch",
    "torch.nn",
    "torch.nn.functional",
    "transformers",
    "sklearn",
    "sklearn.decomposition",
    "llama_cpp",
]
for _mod in _HEAVY_MODS:
    if _mod not in sys.modules:
        sys.modules[_mod] = mock.MagicMock()

from fastapi.testclient import TestClient  # noqa: E402

# Setup mock ModelEngine
mock_engine = mock.MagicMock()
mock_engine.mode = "causal_lm"
mock_engine.model_type = "qwen2"
mock_engine.model_id = "Qwen/Qwen2.5-0.5B-Instruct"
mock_engine.device = "cpu"
mock_engine.num_layers = 24
mock_engine.num_heads = 14
mock_engine.hidden_size = 896
mock_engine.revision = "main"

mock_engine.info.return_value = {
    "model": "Qwen/Qwen2.5-0.5B-Instruct",
    "device": "cpu",
    "mode": "causal_lm",
    "model_type": "qwen2",
    "num_layers": 24,
    "num_heads": 14,
    "hidden_size": 896,
    "attn_implementation": "eager",
    "max_tokens": 512,
    "ready": True,
}

mock_engine.architecture.return_value = {
    "model": "Qwen/Qwen2.5-0.5B-Instruct",
    "mode": "causal_lm",
    "model_type": "qwen2",
    "num_layers": 24,
    "num_heads": 14,
    "hidden_size": 896,
    "tensors": [],
}

mock_engine.analyze.return_value = {
    "sentence": "Hello world",
    "model": "Qwen/Qwen2.5-0.5B-Instruct",
    "device": "cpu",
    "mode": "causal_lm",
    "model_type": "qwen2",
    "num_layers": 24,
    "num_heads": 14,
    "hidden_size": 896,
    "tokens": [{"index": 0, "id": 1, "piece": "Hello", "text": "Hello", "is_special": False}],
    "attention": [[[[0.5]]]],
    "embeddings_3d": [[0.1, 0.2, 0.3]],
    "hidden_states_3d": {"0": [[0.1, 0.2, 0.3]]},
    "embedding_norms": [1.0],
    "logit_lens": [],
    "capabilities": {
        "causal_generation": True,
        "logit_lens": True,
        "attention_maps": True,
        "sentence_pooling": False,
        "image_processing": False,
    },
}

with mock.patch("app.main.engine", mock_engine):
    from app.main import app

client = TestClient(app)


def test_smoke_health_endpoint():
    """Verify GET /health returns status ok and model liveness."""
    with mock.patch("app.main.engine", mock_engine):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["model_loaded"] is True
        assert data["mode"] == "causal_lm"


def test_smoke_model_info_endpoint():
    """Verify GET /model-info returns valid model metadata."""
    with mock.patch("app.main.engine", mock_engine):
        response = client.get("/model-info")
        assert response.status_code == 200
        data = response.json()
        assert data["model"] == "Qwen/Qwen2.5-0.5B-Instruct"
        assert data["num_layers"] == 24


def test_smoke_architecture_endpoint():
    """Verify GET /architecture returns model structural tensors."""
    with mock.patch("app.main.engine", mock_engine):
        response = client.get("/architecture")
        assert response.status_code == 200
        data = response.json()
        assert data["model"] == "Qwen/Qwen2.5-0.5B-Instruct"
        assert "tensors" in data


def test_smoke_analyze_endpoint():
    """Verify POST /analyze returns tokens, attention, and capabilities payload."""
    with mock.patch("app.main.engine", mock_engine):
        response = client.post("/analyze", json={"sentence": "Hello world"})
        assert response.status_code == 200
        data = response.json()
        assert data["sentence"] == "Hello world"
        assert "tokens" in data
        assert "attention" in data
        assert "capabilities" in data
        assert data["capabilities"]["causal_generation"] is True


def test_smoke_trace_endpoint():
    """Verify GET /trace returns valid HTTP response status."""
    response = client.get("/trace")
    assert response.status_code in (200, 404)
