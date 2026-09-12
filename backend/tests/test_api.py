"""End-to-end FastAPI integration tests using TestClient (ENG-08).

Tests cover:
  * GET /health — liveness status & engine state
  * GET /model-info — model metadata endpoint
  * GET /architecture — architecture details & HF lookup
  * POST /analyze — forward pass attention analysis payload
  * POST /debug/analyze — debug snapshot endpoint
  * GET /trace & POST /trace/replay — trace recording & replay endpoints
"""

import sys
from pathlib import Path
from unittest import mock

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Pre-mock heavy native deps before importing app.main
_HEAVY_MODS = [
    "torch", "torch.nn", "torch.nn.functional", "transformers", "sklearn", "sklearn.decomposition", "llama_cpp"
]
for _mod in _HEAVY_MODS:
    if _mod not in sys.modules:
        sys.modules[_mod] = mock.MagicMock()

from fastapi.testclient import TestClient

# Mock ModelEngine before importing app.main so engine is populated
mock_engine = mock.MagicMock()
mock_engine.mode = "causal_lm"
mock_engine.model_type = "qwen2"
mock_engine.model_id = "Qwen/Qwen2.5-0.5B-Instruct"
mock_engine.device = "cpu"
mock_engine.num_layers = 24
mock_engine.num_heads = 14
mock_engine.hidden_size = 896

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
    "source": "model",
    "model": "Qwen/Qwen2.5-0.5B-Instruct",
    "device": "cpu",
    "metadata": {
        "architecture": "qwen2",
        "num_layers": 24,
        "hidden_size": 896,
        "num_heads": 14,
    },
    "tensor_count": 0,
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
    "tokens": [
        {"index": 0, "text": "Hello", "piece": "Hello", "id": 9707, "is_special": False},
        {"index": 1, "text": "world", "piece": "world", "id": 1879, "is_special": False},
    ],
    "attention": [[[[0.5, 0.5], [0.5, 0.5]]]],
    "embeddings_3d": [[0.0, 0.0, 0.0], [1.0, 1.0, 1.0]],
    "hidden_states_3d": {"0": [[0.0, 0.0, 0.0], [1.0, 1.0, 1.0]]},
    "embedding_norms": [1.0, 1.0],
}

mock_engine.debug_analyze.return_value = {
    "sentence": "Debug test",
    "debug_snapshot": {"model.layers.0": [[0.1, 0.2, 0.3]]},
}

with mock.patch("app.main.engine", mock_engine):
    from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify GET /health endpoint status and engine presence."""
    with mock.patch("app.main.engine", mock_engine):
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["model_loaded"] is True


def test_model_info_endpoint():
    """Verify GET /model-info metadata endpoint."""
    with mock.patch("app.main.engine", mock_engine):
        res = client.get("/model-info")
        assert res.status_code == 200
        data = res.json()
        assert data["model"] == "Qwen/Qwen2.5-0.5B-Instruct"
        assert data["num_layers"] == 24


def test_architecture_endpoint():
    """Verify GET /architecture endpoint response."""
    with mock.patch("app.main.engine", mock_engine):
        res = client.get("/architecture")
        assert res.status_code == 200
        data = res.json()
        assert data["source"] == "model"
        assert data["metadata"]["architecture"] == "qwen2"


def test_analyze_endpoint():
    """Verify POST /analyze forward pass endpoint payload."""
    with mock.patch("app.main.engine", mock_engine):
        res = client.post("/analyze", json={"sentence": "Hello world"})
        assert res.status_code == 200
        data = res.json()
        assert data["sentence"] == "Hello world"
        assert len(data["tokens"]) == 2


def test_analyze_endpoint_validation():
    """Verify POST /analyze rejects empty sentences with 422 Unprocessable Entity."""
    res = client.post("/analyze", json={"sentence": ""})
    assert res.status_code == 422


def test_debug_analyze_endpoint():
    """Verify POST /debug/analyze endpoint debug snapshot."""
    with mock.patch("app.main.engine", mock_engine):
        res = client.post("/debug/analyze", json={"sentence": "Debug test"})
        assert res.status_code == 200
        data = res.json()
        assert "debug_snapshot" in data


def test_trace_download_404_when_empty():
    """Verify GET /trace returns 404 when no trace has been recorded yet."""
    with mock.patch("app.main._last_trace", None):
        res = client.get("/trace")
        assert res.status_code == 404


def test_trace_replay_endpoint():
    """Verify POST /trace/replay parses and returns valid trace payload."""
    mock_trace = {
        "trace_version": 1,
        "meta": {"prompt": "Test prompt", "model": "Qwen/Qwen2.5-0.5B-Instruct"},
        "frames": [{"type": "token", "token": "Hello"}],
    }
    with mock.patch("app.main.parse_trace", return_value=mock_trace):
        res = client.post("/trace/replay", json=mock_trace)
        assert res.status_code == 200
        data = res.json()
        assert data["meta"]["prompt"] == "Test prompt"
