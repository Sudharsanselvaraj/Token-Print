"""Unit tests for CodeQL security alert fixes (SEC-01).

Verifies SSRF URL validation and log injection sanitization in backend/app/main.py.
"""

from unittest import mock
import pytest
from fastapi import HTTPException

from app.main import _sanitize_log_str, _validate_ssrf_target_url


def test_sanitize_log_str_removes_crlf():
    """Verify _sanitize_log_str removes carriage returns and newlines."""
    malicious_input = "query\r\nINFO:fake_user logged in\n"
    sanitized = _sanitize_log_str(malicious_input)
    assert "\r" not in sanitized
    assert "\n" not in sanitized
    assert sanitized == "queryINFO:fake_user logged in"


def test_validate_ssrf_target_url_valid_hf():
    """Verify valid HuggingFace URLs pass validation."""
    valid_url = "https://huggingface.co/api/models?limit=10"
    with mock.patch("socket.getaddrinfo") as mock_dns:
        # Mock public IP address (e.g. 54.235.210.123)
        mock_dns.return_value = [(None, None, None, None, ("54.235.210.123", 443))]
        res = _validate_ssrf_target_url(valid_url)
        assert res == valid_url


def test_validate_ssrf_target_url_blocks_http():
    """Verify non-HTTPS URLs are rejected."""
    with pytest.raises(HTTPException) as exc_info:
        _validate_ssrf_target_url("http://huggingface.co/api/models")
    assert exc_info.value.status_code == 400


def test_validate_ssrf_target_url_blocks_unauthorized_domain():
    """Verify non-HuggingFace domains are rejected."""
    with pytest.raises(HTTPException) as exc_info:
        _validate_ssrf_target_url("https://malicious-site.com/api/models")
    assert exc_info.value.status_code == 400


def test_validate_ssrf_target_url_blocks_private_ip():
    """Verify URLs resolving to private or loopback IPs are blocked."""
    with mock.patch("socket.getaddrinfo") as mock_dns:
        # Mock internal loopback IP 127.0.0.1
        mock_dns.return_value = [(None, None, None, None, ("127.0.0.1", 443))]
        with pytest.raises(HTTPException) as exc_info:
            _validate_ssrf_target_url("https://huggingface.co/api/models")
        assert exc_info.value.status_code == 403
