"""Unit tests for SSRF protection in remote image loading (ENG-10)."""

import sys
import unittest.mock as mock
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Pre-mock heavy native deps before importing app.model
_HEAVY_MODS = [
    "torch", "torch.nn", "torch.nn.functional", "transformers", "sklearn", "sklearn.decomposition", "llama_cpp"
]
for _mod in _HEAVY_MODS:
    if _mod not in sys.modules:
        sys.modules[_mod] = mock.MagicMock()

import pytest
from app.model import ModelEngine


def test_ssrf_blocks_loopback_ip():
    with pytest.raises(ValueError, match="forbidden"):
        ModelEngine._load_image_bytes("http://127.0.0.1:8000/secret.png")


def test_ssrf_blocks_private_ip():
    with pytest.raises(ValueError, match="forbidden"):
        ModelEngine._load_image_bytes("http://10.0.0.1/internal.jpg")


def test_ssrf_blocks_aws_metadata_ip():
    with pytest.raises(ValueError, match="forbidden"):
        ModelEngine._load_image_bytes("http://169.254.169.254/latest/meta-data/")


def test_ssrf_blocks_localhost_domain():
    with pytest.raises(ValueError, match="forbidden"):
        ModelEngine._load_image_bytes("http://localhost:8000/admin")
