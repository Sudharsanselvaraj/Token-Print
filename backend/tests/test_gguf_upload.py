"""Tests for GGUF upload size-limit enforcement and temp-file cleanup (ENG-09).

These tests mock heavy native dependencies (torch, sklearn, llama_cpp) so they
run without a GPU or PyTorch install.  The model lifespan is also stubbed so no
model is downloaded.
"""

from __future__ import annotations

import sys
import types
import unittest.mock as mock
from io import BytesIO
from pathlib import Path

# ---------------------------------------------------------------------------
# Pre-mock all native deps BEFORE importing anything from app.*
# (same technique as test_rag_patching.py which adds backend to sys.path)
# ---------------------------------------------------------------------------
_HEAVY_MODS = [
    "torch", "torch.nn", "torch.nn.functional",
    "transformers", "transformers.modeling_outputs",
    "llama_cpp",
    "PIL", "PIL.Image",
    "sklearn", "sklearn.decomposition",
]
for _mod in _HEAVY_MODS:
    sys.modules.setdefault(_mod, mock.MagicMock())

# Add backend directory to sys.path (matches existing test pattern).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from starlette.testclient import TestClient

import app.main as main_module
from app.main import GGUF_DIR, app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _upload_bytes(client: TestClient, data: bytes, filename: str = "model.gguf") -> object:
    """POST `data` to /gguf/upload as a multipart file."""
    return client.post(
        "/gguf/upload",
        files={"file": (filename, BytesIO(data), "application/octet-stream")},
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def client():
    """TestClient with the model lifespan stubbed out (no PyTorch needed)."""
    mock_engine = mock.MagicMock()
    mock_engine.model_id = "test-model"
    mock_engine.device = "cpu"
    mock_engine.num_layers = 2
    mock_engine.num_heads = 2
    mock_engine.hidden_size = 16
    mock_engine.mode = "text"
    mock_engine.model_type = "gpt2"

    with mock.patch.object(main_module, "ModelEngine", return_value=mock_engine):
        with TestClient(app) as c:
            yield c


@pytest.fixture(autouse=True)
def _cleanup_gguf_dir():
    """Remove any .gguf test artefacts from GGUF_DIR before and after each test."""
    for p in GGUF_DIR.glob("*.gguf"):
        p.unlink(missing_ok=True)
    yield
    for p in GGUF_DIR.glob("*.gguf"):
        p.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestGgufUploadSizeLimit:
    """Size-limit enforcement and cleanup (ENG-09)."""

    def test_oversized_upload_rejected_with_413(self, client: TestClient):
        """Uploading a file larger than MAX_GGUF_BYTES returns HTTP 413."""
        with mock.patch.object(main_module, "MAX_GGUF_BYTES", 10):
            payload = b"X" * 20  # 20 bytes > 10-byte limit
            resp = _upload_bytes(client, payload)

        assert resp.status_code == 413, (
            f"Expected 413, got {resp.status_code}: {resp.text}"
        )
        assert "limit" in resp.json()["detail"].lower()

    def test_oversized_upload_leaves_no_temp_file(self, client: TestClient):
        """A rejected oversized upload must not leave a partial file in GGUF_DIR."""
        filename = "oversized_test.gguf"
        dest = GGUF_DIR / filename

        assert not dest.exists(), "Pre-condition: file must not exist before upload"

        with mock.patch.object(main_module, "MAX_GGUF_BYTES", 10):
            payload = b"X" * 20
            resp = _upload_bytes(client, payload, filename=filename)

        assert resp.status_code == 413
        assert not dest.exists(), (
            f"Partial temp file was left behind at {dest}"
        )

    def test_valid_upload_within_limit_succeeds(self, client: TestClient):
        """A file within the limit is accepted, saved to GGUF_DIR, and returns 200."""
        filename = "small_valid.gguf"
        dest = GGUF_DIR / filename
        payload = b"GGUF" + b"\x00" * 16  # tiny but named .gguf

        resp = _upload_bytes(client, payload, filename=filename)

        assert resp.status_code == 200, (
            f"Expected 200, got {resp.status_code}: {resp.text}"
        )
        body = resp.json()
        assert body["name"] == filename
        assert body["size_bytes"] == len(payload)
        assert dest.exists(), "Uploaded file should exist in GGUF_DIR after success"

    def test_valid_upload_file_persists_after_success(self, client: TestClient):
        """The destination file is NOT deleted after a successful upload."""
        filename = "persist_check.gguf"
        dest = GGUF_DIR / filename
        payload = b"GGUF" + b"\x00" * 8

        resp = _upload_bytes(client, payload, filename=filename)
        assert resp.status_code == 200
        assert dest.exists()
        assert dest.stat().st_size == len(payload)
