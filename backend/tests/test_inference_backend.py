"""Tests for the inference backend registry, interface, and readiness checks."""

from types import SimpleNamespace
from unittest import mock

import pytest
from app.inference.backends.gguf import GGUFBackend
from app.inference.backends.hf_local import HFLocalBackend
from app.inference.registry import registry


def test_registry_backends():
    backends = registry.list_backends()
    assert "hf_local" in backends
    assert "gguf" in backends


def test_get_backend():
    hf_backend = registry.get_backend("hf_local")
    assert isinstance(hf_backend, HFLocalBackend)

    gguf_backend = registry.get_backend("gguf")
    assert isinstance(gguf_backend, GGUFBackend)


def test_unknown_backend_raises_keyerror():
    with pytest.raises(KeyError):
        registry.get_backend("nonexistent_cloud_backend")


def test_hf_health_check_true_when_model_is_loaded():
    backend = HFLocalBackend(engine=SimpleNamespace(model=object()))

    assert backend.health_check() is True


def test_hf_health_check_false_when_model_is_not_loaded():
    backend = HFLocalBackend(engine=SimpleNamespace(model=None))

    assert backend.health_check() is False


def test_hf_health_check_respects_explicit_readiness_flag():
    backend = HFLocalBackend(
        engine=SimpleNamespace(is_loaded=False, model=object())
    )

    assert backend.health_check() is False


def test_hf_health_check_fails_closed_when_engine_unavailable():
    backend = HFLocalBackend()
    with mock.patch.object(backend, "_get_engine", side_effect=RuntimeError("unavailable")):
        assert backend.health_check() is False


def test_gguf_health_check_requires_loaded_context():
    backend = GGUFBackend()
    assert backend.health_check() is False

    backend._engine = SimpleNamespace(_llm=None)
    assert backend.health_check() is False

    backend._engine = SimpleNamespace(_llm=object())
    assert backend.health_check() is True
