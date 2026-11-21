"""Tests for Hugging Face Hub search and discovery endpoints.

Verifies:
- Hub search for 'llama'
- Hub search for 'qwen'
- Exact repository ID search
- Non-existent query handling
- Invalid search term rejection
- Sorting and pagination
- /api/hf/search backward compatibility
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import (
    _hf_inspect_cache,
    _hf_search_cache,
    _hub_compat_cache,
    _hub_search_cache,
    app,
)

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


def test_hub_search_llama() -> None:
    """Test searching for llama on /api/hub/models."""
    res = client.get("/api/hub/models?search=llama&limit=5&sort=downloads")
    assert res.status_code == 200
    data = res.json()
    assert data["query"] == "llama"
    assert data["limit"] == 5
    assert len(data["models"]) > 0
    first = data["models"][0]
    assert "llama" in first["id"].lower()
    assert first["downloads"] >= 0
    assert first["likes"] >= 0
    assert "compatibility_level" in first


def test_hub_search_qwen() -> None:
    """Test searching for qwen on /api/hub/models."""
    res = client.get("/api/hub/models?search=qwen&limit=5&sort=downloads")
    assert res.status_code == 200
    data = res.json()
    assert data["query"] == "qwen"
    assert len(data["models"]) > 0
    assert any("qwen" in m["id"].lower() for m in data["models"])


def test_hub_search_exact_repo_id() -> None:
    """Test searching with an exact repo ID (e.g. Qwen/Qwen2.5-0.5B-Instruct)."""
    exact_id = "Qwen/Qwen2.5-0.5B-Instruct"
    res = client.get(f"/api/hub/models?search={exact_id}&limit=5")
    assert res.status_code == 200
    data = res.json()
    assert len(data["models"]) > 0
    # Exact model should appear at the top
    assert data["models"][0]["id"] == exact_id


def test_hub_search_nonexistent_returns_empty() -> None:
    """Test searching for a non-existent query returns empty list without error."""
    res = client.get("/api/hub/models?search=nonexistent-model-xyz-123456789&limit=5")
    assert res.status_code == 200
    data = res.json()
    assert data["models"] == []


def test_hub_search_invalid_characters() -> None:
    """Test non-printable or suspicious characters are safely rejected with empty results."""
    res = client.get("/api/hub/models?search=%00badterm%0A&limit=5")
    assert res.status_code == 200
    data = res.json()
    assert data["models"] == []


def test_hub_search_sorting() -> None:
    """Test sorting parameter handling."""
    res_downloads = client.get("/api/hub/models?search=llama&limit=3&sort=downloads")
    assert res_downloads.status_code == 200
    res_likes = client.get("/api/hub/models?search=llama&limit=3&sort=likes")
    assert res_likes.status_code == 200


def test_hub_search_pagination() -> None:
    """Test pagination with page 1 and page 2."""
    p1 = client.get("/api/hub/models?search=llama&limit=2&page=1")
    assert p1.status_code == 200
    p2 = client.get("/api/hub/models?search=llama&limit=2&page=2")
    assert p2.status_code == 200
    m1 = [m["id"] for m in p1.json()["models"]]
    m2 = [m["id"] for m in p2.json()["models"]]
    # Page 1 and Page 2 should not be completely identical if results > 2
    if len(m1) == 2 and len(m2) == 2:
        assert m1[0] != m2[0]


def test_legacy_hf_search_backward_compatible() -> None:
    """Test that /api/hf/search continues to work identically for existing frontend."""
    res = client.get("/api/hf/search?query=llama&limit=5")
    assert res.status_code == 200
    data = res.json()
    assert data["query"] == "llama"
    assert data["limit"] == 5
    assert len(data["models"]) > 0
    assert "id" in data["models"][0]
