"""LRU cache and lifecycle manager for resident GGUF inference engines (Issue #279).

Prevents unbounded memory growth / OOM crashes by maintaining a bounded set of
resident GGUFEngine instances, closing and garbage-collecting evicted models in LRU
order, and exposing explicit unload functionality.
"""

from __future__ import annotations

import gc
import logging
import os
import threading
from collections import OrderedDict
from collections.abc import Callable
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.gguf_engine import GGUFEngine

logger = logging.getLogger("uvicorn.error")

# Default number of resident GGUF models kept in memory before evicting LRU.
# Can be overridden via the MAX_GGUF_ENGINES environment variable.
DEFAULT_MAX_GGUF_ENGINES = 2


class GGUFEngineCache:
    """Thread-safe LRU cache for GGUFEngine instances."""

    def __init__(self, max_engines: int | None = None) -> None:
        if max_engines is None:
            env_val = os.getenv("MAX_GGUF_ENGINES")
            try:
                max_engines = int(env_val) if env_val is not None else DEFAULT_MAX_GGUF_ENGINES
            except ValueError:
                logger.warning(
                    "Invalid MAX_GGUF_ENGINES '%s'; falling back to default %d",
                    env_val,
                    DEFAULT_MAX_GGUF_ENGINES,
                )
                max_engines = DEFAULT_MAX_GGUF_ENGINES
        self.max_engines = max(1, int(max_engines))
        self._cache: OrderedDict[str, GGUFEngine] = OrderedDict()
        self._lock = threading.RLock()

    def _safe_close(self, engine: object) -> None:
        """Safely invoke close() on an engine and log any unexpected exceptions."""
        close_fn = getattr(engine, "close", None)
        if callable(close_fn):
            try:
                close_fn()
            except Exception as exc:  # noqa: BLE001
                logger.warning("Error closing evicted GGUF engine: %s", exc)

    def get(self, resolved_path: str) -> GGUFEngine | None:
        """Retrieve an engine if currently resident and promote it to MRU."""
        with self._lock:
            if resolved_path in self._cache:
                self._cache.move_to_end(resolved_path)
                return self._cache[resolved_path]
            return None

    def get_or_create(
        self,
        resolved_path: str,
        factory: Callable[[str], GGUFEngine] | None = None,
    ) -> GGUFEngine:
        """Return the resident engine for resolved_path, creating and caching it if absent.

        If the cache is full, the least-recently used engine is closed, evicted,
        and garbage-collected before the new engine is stored.
        """
        with self._lock:
            if resolved_path in self._cache:
                self._cache.move_to_end(resolved_path)
                return self._cache[resolved_path]

            # Evict LRU items until room is made
            while len(self._cache) >= self.max_engines and self._cache:
                evicted_path, evicted_engine = self._cache.popitem(last=False)
                logger.info(
                    "Evicting GGUF engine %s (LRU capacity %d exceeded)",
                    evicted_path,
                    self.max_engines,
                )
                self._safe_close(evicted_engine)
                del evicted_engine
                gc.collect()

            if factory is None:
                from app.gguf_engine import GGUFEngine

                engine = GGUFEngine(resolved_path)
            else:
                engine = factory(resolved_path)

            self._cache[resolved_path] = engine
            return engine

    def unload(self, resolved_path: str) -> bool:
        """Explicitly evict and close a resident engine.

        Returns True if the engine was resident and unloaded, False otherwise.
        """
        with self._lock:
            engine = self._cache.pop(resolved_path, None)
            if engine is not None:
                logger.info("Explicitly unloading GGUF engine: %s", resolved_path)
                self._safe_close(engine)
                del engine
                gc.collect()
                return True
            return False

    def clear(self) -> None:
        """Close all resident engines and empty the cache (e.g. on server shutdown)."""
        with self._lock:
            for path, engine in list(self._cache.items()):
                logger.info("Closing resident GGUF engine on shutdown: %s", path)
                self._safe_close(engine)
            self._cache.clear()
            gc.collect()

    def __contains__(self, resolved_path: str) -> bool:
        with self._lock:
            return resolved_path in self._cache

    def __len__(self) -> int:
        with self._lock:
            return len(self._cache)

    def stats(self) -> dict:
        """Return diagnostic statistics about resident models."""
        with self._lock:
            return {
                "resident_count": len(self._cache),
                "max_engines": self.max_engines,
                "resident_paths": list(self._cache.keys()),
            }
