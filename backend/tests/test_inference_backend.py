"""Unit tests for InferenceBackend registry and interface."""

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
