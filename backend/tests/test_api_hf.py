"""Integration tests for Hugging Face discovery and inspection endpoints using TestClient."""

from unittest.mock import MagicMock, patch

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_api_hf_curated():
    response = client.get("/api/hf/curated")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert len(data["models"]) > 0
    first_model = data["models"][0]
    assert "id" in first_model
    assert "family" in first_model
    assert "capabilities_preview" in first_model


@patch("urllib.request.urlopen")
def test_api_hf_search(mock_urlopen):
    mock_resp = MagicMock()
    mock_resp.status = 200
    mock_resp.read.return_value = b"""[
        {
            "id": "Qwen/Qwen2.5-0.5B-Instruct",
            "author": "Qwen",
            "downloads": 50000,
            "likes": 1200,
            "tags": ["text-generation"],
            "pipeline_tag": "text-generation",
            "lastModified": "2024-09-01T00:00:00Z",
            "private": false
        }
    ]"""
    mock_urlopen.return_value.__enter__.return_value = mock_resp

    response = client.get("/api/hf/search?query=qwen&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "qwen"
    assert data["limit"] == 5
    assert len(data["models"]) == 1
    assert data["models"][0]["id"] == "Qwen/Qwen2.5-0.5B-Instruct"


@patch("urllib.request.urlopen")
def test_api_hf_inspect(mock_urlopen):
    # Mock response for sha metadata request
    mock_sha_resp = MagicMock()
    mock_sha_resp.status = 200
    mock_sha_resp.read.return_value = b'{"sha": "abc123commitsha"}'

    # Mock response for config.json request
    mock_cfg_resp = MagicMock()
    mock_cfg_resp.status = 200
    mock_cfg_resp.read.return_value = b"""{
        "model_type": "qwen2",
        "architectures": ["Qwen2ForCausalLM"],
        "num_hidden_layers": 24,
        "hidden_size": 896,
        "vocab_size": 151936,
        "max_position_embeddings": 32768
    }"""

    mock_urlopen.side_effect = [
        MagicMock(__enter__=MagicMock(return_value=mock_sha_resp)),
        MagicMock(__enter__=MagicMock(return_value=mock_cfg_resp)),
    ]

    response = client.get("/api/hf/inspect?model_id=Qwen/Qwen2.5-0.5B-Instruct")
    assert response.status_code == 200
    data = response.json()
    assert data["model_id"] == "Qwen/Qwen2.5-0.5B-Instruct"
    assert data["revision"] == "abc123commitsha"
    assert data["architecture"] == "Qwen2ForCausalLM"
    assert data["compatibility_level"] == "High"
    assert "capabilities" in data
    assert data["capabilities"]["supports_attention"]["supported"] is True
