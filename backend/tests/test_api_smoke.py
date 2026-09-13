"""Hermetic API smoke tests for the FastAPI app (ENG-21).

Goal: a PR-CI + nightly guard that fails if any core route returns a 5xx.
All tests here avoid the real network and the live model engine:

* ``app.hf_guard.safe_urlopen`` is patched so HF discovery endpoints are hermetic.
* ``/analyze`` and ``/api/model/capabilities`` are exercised without a loaded
  model, asserting they fail cleanly (503) rather than crash (5xx).
"""

import sys
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from app.main import _hf_inspect_cache, _hf_search_cache, app
from fastapi.testclient import TestClient

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clear_hf_caches():
    # The HF endpoints keep a module-level TTL cache; clear it between tests so
    # tests never observe another test's cached response.
    _hf_search_cache.clear()
    _hf_inspect_cache.clear()
    yield
    _hf_search_cache.clear()
    _hf_inspect_cache.clear()


class _FakeResp:
    def __init__(self, body: bytes, status: int = 200):
        self._body = body
        self.status = status

    def read(self, _limit: int) -> bytes:
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def test_health_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_hf_curated_ok():
    resp = client.get("/api/hf/curated")
    assert resp.status_code == 200
    assert "models" in resp.json()


def test_hf_search_rejects_control_chars_without_network():
    url_open = mock.MagicMock()
    with mock.patch("app.hf_guard.safe_urlopen", url_open):
        resp = client.get("/api/hf/search", params={"query": "line\nbreak"})
    assert resp.status_code == 200
    assert resp.json()["models"] == []
    url_open.assert_not_called()  # rejected before any request


def test_hf_search_ok_with_mock_backend():
    url_open = mock.MagicMock(return_value=_FakeResp(b"[]"))
    with mock.patch("app.hf_guard.safe_urlopen", url_open):
        resp = client.get("/api/hf/search", params={"query": "qwen", "limit": 5})
    assert resp.status_code == 200
    assert resp.json()["query"] == "qwen"
    assert resp.json()["models"] == []
    url_open.assert_called_once()


def test_hf_inspect_invalid_id_is_400():
    for bad_id in ("", "..", "a", "a/b/c", "a/../../etc", "not-an-id"):
        resp = client.get("/api/hf/inspect", params={"model_id": bad_id})
        assert resp.status_code == 400, f"expected 400 for {bad_id!r}, got {resp.status_code}"


def test_hf_inspect_ok_with_mock_backend():
    url_open = mock.MagicMock(
        side_effect=[
            _FakeResp(b'{"sha": "abc123commitsha"}'),
            _FakeResp(
                b"""{
                    "model_type": "qwen2",
                    "architectures": ["Qwen2ForCausalLM"],
                    "num_hidden_layers": 2,
                    "hidden_size": 64,
                    "vocab_size": 1000,
                    "max_position_embeddings": 512
                }"""
            ),
        ]
    )
    with mock.patch("app.hf_guard.safe_urlopen", url_open):
        resp = client.get("/api/hf/inspect", params={"model_id": "Qwen/Qwen2.5-0.5B-Instruct"})
    assert resp.status_code == 200
    assert resp.json()["model_id"] == "Qwen/Qwen2.5-0.5B-Instruct"
    assert resp.json()["revision"] == "abc123commitsha"


def test_analyze_without_model_fails_cleanly_not_5xx():
    resp = client.post("/analyze", json={"sentence": "hello"})
    # Without a loaded engine the endpoint answers 503; it must never crash with 5xx.
    assert resp.status_code == 503, f"expected 503 without a loaded model, got {resp.status_code}"


def test_capabilities_without_model_fails_cleanly_not_5xx():
    resp = client.get("/api/model/capabilities")
    assert resp.status_code == 503, f"expected 503 without a loaded model, got {resp.status_code}"