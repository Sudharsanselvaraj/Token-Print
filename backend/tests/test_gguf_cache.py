"""Tests for GGUF engine cache eviction, LRU lifecycle, and memory deallocation (Issue #279).

Tests both unit-level behavior of GGUFEngineCache and end-to-end FastAPI endpoint
integration (/gguf/open, /gguf/unload, /gguf/list, /gguf/cache).
"""

from __future__ import annotations

import sys
import threading
from pathlib import Path
from unittest import mock

# ---------------------------------------------------------------------------
# Pre-mock native deps ONLY IF not already installed
# ---------------------------------------------------------------------------
_HEAVY_MODS = [
    "torch", "torch.nn", "torch.nn.functional",
    "transformers", "transformers.modeling_outputs",
    "llama_cpp",
    "PIL", "PIL.Image",
    "sklearn", "sklearn.decomposition",
]
for _mod in _HEAVY_MODS:
    try:
        __import__(_mod)
    except (ImportError, ModuleNotFoundError):
        sys.modules.setdefault(_mod, mock.MagicMock())

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.main as _main_module
import pytest
from app.gguf_cache import DEFAULT_MAX_GGUF_ENGINES, GGUFEngineCache
from app.main import GGUF_DIR, app
from starlette.testclient import TestClient

# ---------------------------------------------------------------------------
# Helpers & Mocks
# ---------------------------------------------------------------------------

class FakeEngine:
    """Mock GGUFEngine that tracks lifecycle calls."""

    def __init__(self, path: str) -> None:
        self.path = str(path)
        self.closed = False
        self.close_call_count = 0

    def metadata(self) -> dict:
        return {"name": Path(self.path).name, "architecture": "test", "n_ctx": 512}

    def close(self) -> None:
        self.closed = True
        self.close_call_count += 1


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def client():
    """TestClient with ModelEngine stubbed so PyTorch is not downloaded/initialized."""
    mock_engine = mock.MagicMock()
    mock_engine.model_id = "test-model"
    mock_engine.device = "cpu"
    mock_engine.num_layers = 2
    mock_engine.num_heads = 2
    mock_engine.hidden_size = 16
    mock_engine.mode = "text"
    mock_engine.model_type = "gpt2"

    with mock.patch.object(_main_module, "ModelEngine", return_value=mock_engine), TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _clean_environment():
    """Clean up GGUF_DIR and reset _gguf_cache before/after tests."""
    for p in GGUF_DIR.glob("*.gguf"):
        p.unlink(missing_ok=True)
    _main_module._gguf_cache.clear()
    yield
    for p in GGUF_DIR.glob("*.gguf"):
        p.unlink(missing_ok=True)
    _main_module._gguf_cache.clear()


# ---------------------------------------------------------------------------
# Unit Tests: GGUFEngineCache
# ---------------------------------------------------------------------------

class TestGGUFEngineCacheUnit:
    """Test pure caching, LRU eviction, and deallocation logic."""

    def test_default_capacity_and_env_override(self):
        """Cache honors default capacity and environment variable configuration."""
        cache = GGUFEngineCache()
        assert cache.max_engines == DEFAULT_MAX_GGUF_ENGINES

        with mock.patch.dict("os.environ", {"MAX_GGUF_ENGINES": "5"}):
            cache_custom = GGUFEngineCache()
            assert cache_custom.max_engines == 5

        with mock.patch.dict("os.environ", {"MAX_GGUF_ENGINES": "invalid"}):
            cache_fallback = GGUFEngineCache()
            assert cache_fallback.max_engines == DEFAULT_MAX_GGUF_ENGINES

    def test_get_or_create_caches_and_evicts_lru(self):
        """When capacity is exceeded, least-recently-used engine is closed and evicted."""
        cache = GGUFEngineCache(max_engines=2)
        created_engines: dict[str, FakeEngine] = {}

        def factory(path: str) -> FakeEngine:
            eng = FakeEngine(path)
            created_engines[path] = eng
            return eng

        with mock.patch("gc.collect") as mock_gc:
            eng1 = cache.get_or_create("/path/model1.gguf", factory=factory)
            eng2 = cache.get_or_create("/path/model2.gguf", factory=factory)

            assert len(cache) == 2
            assert "/path/model1.gguf" in cache
            assert "/path/model2.gguf" in cache
            assert not eng1.closed
            assert not eng2.closed

            # Adding a 3rd engine should evict the oldest (model1)
            eng3 = cache.get_or_create("/path/model3.gguf", factory=factory)

            assert len(cache) == 2
            assert "/path/model1.gguf" not in cache
            assert "/path/model2.gguf" in cache
            assert "/path/model3.gguf" in cache

            # Model 1 was closed and garbage collection invoked
            assert eng1.closed
            assert eng1.close_call_count == 1
            assert not eng2.closed
            assert not eng3.closed
            assert mock_gc.called

    def test_recency_promotion_prevents_eviction_of_active_model(self):
        """Accessing an engine marks it as recently used, preserving it from eviction."""
        cache = GGUFEngineCache(max_engines=2)
        engines: dict[str, FakeEngine] = {}

        def factory(path: str) -> FakeEngine:
            eng = FakeEngine(path)
            engines[path] = eng
            return eng

        cache.get_or_create("model1.gguf", factory=factory)
        cache.get_or_create("model2.gguf", factory=factory)

        # Access model1 again, making model2 the LRU
        cache.get("model1.gguf")

        # Now loading model3 should evict model2, NOT model1
        cache.get_or_create("model3.gguf", factory=factory)

        assert "model1.gguf" in cache
        assert "model2.gguf" not in cache
        assert "model3.gguf" in cache
        assert engines["model2.gguf"].closed
        assert not engines["model1.gguf"].closed

    def test_explicit_unload(self):
        """Unload removes model, invokes close() and gc.collect()."""
        cache = GGUFEngineCache(max_engines=2)
        eng = FakeEngine("model1.gguf")
        cache.get_or_create("model1.gguf", factory=lambda p: eng)

        with mock.patch("gc.collect") as mock_gc:
            assert cache.unload("model1.gguf") is True
            assert eng.closed
            assert "model1.gguf" not in cache
            assert mock_gc.called

            # Unloading again returns False
            assert cache.unload("model1.gguf") is False

    def test_clear_closes_all_resident_engines(self):
        """clear() releases all resident engines on shutdown."""
        cache = GGUFEngineCache(max_engines=5)
        eng1 = FakeEngine("m1.gguf")
        eng2 = FakeEngine("m2.gguf")
        cache.get_or_create("m1.gguf", factory=lambda p: eng1)
        cache.get_or_create("m2.gguf", factory=lambda p: eng2)

        with mock.patch("gc.collect") as mock_gc:
            cache.clear()
            assert eng1.closed
            assert eng2.closed
            assert len(cache) == 0
            assert mock_gc.called

    def test_thread_safety(self):
        """Concurrent cache access and eviction runs without race conditions."""
        cache = GGUFEngineCache(max_engines=3)

        def worker(thread_id: int):
            for i in range(15):
                path = f"model_{(thread_id + i) % 6}.gguf"
                cache.get_or_create(path, factory=FakeEngine)
                cache.get(path)

        threads = [threading.Thread(target=worker, args=(t,)) for t in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(cache) <= 3


# ---------------------------------------------------------------------------
# API Integration Tests
# ---------------------------------------------------------------------------

class TestGGUFApiCacheIntegration:
    """Test FastAPI endpoints for GGUF caching, eviction, and unload."""

    def _create_dummy_gguf(self, name: str) -> Path:
        p = GGUF_DIR / name
        p.write_bytes(b"GGUF\x00\x00\x00\x00")
        return p

    def test_open_evicts_lru_and_updates_list(self, client: TestClient):
        """Opening models beyond max_engines updates /gguf/list 'loaded' flag correctly."""
        self._create_dummy_gguf("alpha.gguf")
        self._create_dummy_gguf("beta.gguf")
        self._create_dummy_gguf("gamma.gguf")

        with mock.patch.object(_main_module._gguf_cache, "max_engines", 2), \
             mock.patch("app.gguf_cache.GGUFEngineCache._safe_close") as mock_close, \
             mock.patch.object(_main_module, "GGUFEngine", side_effect=FakeEngine):

            # Open alpha
            r1 = client.post("/gguf/open", json={"path": "alpha.gguf"})
            assert r1.status_code == 200

            # Open beta
            r2 = client.post("/gguf/open", json={"path": "beta.gguf"})
            assert r2.status_code == 200

            # Both alpha and beta are loaded
            list_res = client.get("/gguf/list").json()["files"]
            loaded_map = {item["name"]: item["loaded"] for item in list_res}
            assert loaded_map["alpha.gguf"] is True
            assert loaded_map["beta.gguf"] is True
            assert loaded_map["gamma.gguf"] is False

            # Open gamma -> alpha (LRU) must be evicted and closed
            r3 = client.post("/gguf/open", json={"path": "gamma.gguf"})
            assert r3.status_code == 200
            assert mock_close.called

            list_res2 = client.get("/gguf/list").json()["files"]
            loaded_map2 = {item["name"]: item["loaded"] for item in list_res2}
            assert loaded_map2["alpha.gguf"] is False  # Evicted!
            assert loaded_map2["beta.gguf"] is True
            assert loaded_map2["gamma.gguf"] is True

    def test_explicit_unload_endpoint(self, client: TestClient):
        """POST /gguf/unload frees the target model and reflects in /gguf/list."""
        self._create_dummy_gguf("model_to_unload.gguf")

        with mock.patch.object(_main_module, "GGUFEngine", side_effect=FakeEngine):
            # Open model
            open_res = client.post("/gguf/open", json={"path": "model_to_unload.gguf"})
            assert open_res.status_code == 200

            # Verify it is reported as loaded
            res = client.get("/gguf/list").json()["files"]
            assert any(f["name"] == "model_to_unload.gguf" and f["loaded"] for f in res)

            # Unload model
            unload_res = client.post("/gguf/unload", json={"path": "model_to_unload.gguf"})
            assert unload_res.status_code == 200
            data = unload_res.json()
            assert data["ok"] is True
            assert data["name"] == "model_to_unload.gguf"
            assert data["unloaded"] is True

            # Verify it is now unloaded in /gguf/list
            res_after = client.get("/gguf/list").json()["files"]
            assert any(f["name"] == "model_to_unload.gguf" and not f["loaded"] for f in res_after)

            # Second unload call succeeds but reports unloaded=False (idempotent)
            unload_again = client.post("/gguf/unload", json={"path": "model_to_unload.gguf"})
            assert unload_again.status_code == 200
            assert unload_again.json()["unloaded"] is False

    def test_unload_rejects_path_traversal(self, client: TestClient):
        """POST /gguf/unload guards against directory traversal attempts."""
        res = client.post("/gguf/unload", json={"path": "../../etc/passwd"})
        assert res.status_code == 404

    def test_unload_rejects_missing_path(self, client: TestClient):
        """POST /gguf/unload requires a valid path."""
        res = client.post("/gguf/unload", json={})
        assert res.status_code == 400

    def test_cache_stats_endpoint(self, client: TestClient):
        """GET /gguf/cache returns cache metrics and limits."""
        res = client.get("/gguf/cache")
        assert res.status_code == 200
        data = res.json()
        assert "resident_count" in data
        assert "max_engines" in data
        assert "resident_paths" in data
