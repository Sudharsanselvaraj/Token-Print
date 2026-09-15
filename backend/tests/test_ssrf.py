"""Unit tests for SSRF protection in remote image loading (ENG-10)."""

import sys
from pathlib import Path
from unittest import mock

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Pre-mock heavy native deps only if they are not installed
_HEAVY_MODS = [
    "torch", "torch.nn", "torch.nn.functional", "transformers", "sklearn", "sklearn.decomposition", "llama_cpp"
]
for _mod in _HEAVY_MODS:
    try:
        __import__(_mod)
    except (ImportError, ModuleNotFoundError):
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


# --- Regression tests for #278: CGNAT and carrier/test-grade nets ---

def test_ssrf_blocks_cgnat_100_64():
    """CGNAT 100.64.0.0/10 was not blocked by is_* flags alone (fixes #278)."""
    with pytest.raises(ValueError, match="forbidden"), mock.patch(
        "socket.getaddrinfo", return_value=[(None, None, None, None, ("100.64.1.1", 0))]
    ):
        ModelEngine._validate_url_ssrf("http://example-cgnat.internal/")


def test_ssrf_blocks_carrier_grade_198_18():
    """198.18.0.0/15 benchmark-test net must be blocked (fixes #278)."""
    with pytest.raises(ValueError, match="forbidden"), mock.patch(
        "socket.getaddrinfo", return_value=[(None, None, None, None, ("198.18.0.1", 0))]
    ):
        ModelEngine._validate_url_ssrf("http://example-carrier.internal/")


def test_ssrf_blocks_iana_192_0_0():
    """192.0.0.0/24 IANA special-use net must be blocked (fixes #278)."""
    with pytest.raises(ValueError, match="forbidden"), mock.patch(
        "socket.getaddrinfo", return_value=[(None, None, None, None, ("192.0.0.1", 0))]
    ):
        ModelEngine._validate_url_ssrf("http://example-special.internal/")
