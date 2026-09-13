"""Unit tests for the outbound HF request guard (SEC-01).

Covers the SSRF + log-injection hardening applied in ``app/hf_guard.py``.
No network access is required (all refusal paths fail before any connection,
and DNS resolution is mocked where needed).
"""

import socket
import sys
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.hf_guard import (
    safe_urlopen,
    sanitize_log,
    validate_model_id,
    validate_search_term,
)


class TestValidateModelId:
    def test_valid_ids(self):
        for model_id in (
            "Qwen/Qwen2.5-0.5B-Instruct",
            "openai/gpt-3",
            "meta-llama/Llama-3.1-8B",
            "a/b",
        ):
            assert validate_model_id(model_id), model_id

    def test_invalid_ids(self):
        for model_id in (
            "",
            "..",
            "a",
            "a/b/c",
            "a//b",
            "a/b/../c",
            "../secrets",
            "a b/c",
            "a/../../etc/passwd",
            "//host",
            "a/b\\c",
        ):
            assert not validate_model_id(model_id), model_id


class TestValidateSearchTerm:
    def test_valid_terms(self):
        for term in ("qwen", "mistral 7b", "llama-2", "a,b.c", "transformers + models"):
            assert validate_search_term(term), term

    def test_invalid_terms(self):
        for term in ("", "a\nb", "a\rb", "a\x1bb", "a\0b", "a\t\tb"):
            assert not validate_search_term(term), term


class TestSanitizeLog:
    def test_strips_control_characters(self):
        assert "\n" not in sanitize_log("user\nEVIL=1")
        assert "\r" not in sanitize_log("user\revil")
        assert sanitize_log("safe text") == "safe text"
        assert sanitize_log(None) == "None"

    def test_no_newline_can_smuggle_log_lines(self):
        joined = "\n".join(sanitize_log(line) for line in ["good", "evil"])
        assert joined.count("\n") == 1  # only the deliberate join, never a smuggled one


class TestSafeUrlopenRefusals:
    def test_rejects_non_https(self):
        with mock.patch("socket.getaddrinfo") as mock_gai:
            mock_gai.return_value = []
            try:
                safe_urlopen("http://huggingface.co/api/models")
            except ValueError as exc:
                assert "Only https" in str(exc)
            else:
                raise AssertionError("expected ValueError for http scheme")

    def test_rejects_non_allowlisted_host(self):
        # Host check runs before any DNS lookup, so no network needed.
        try:
            safe_urlopen("https://127.0.0.1/api/models?x=1")
        except ValueError as exc:
            assert "not in the allowed allowlist" in str(exc)
        else:
            raise AssertionError("expected ValueError for non-allowlisted host")

        for host in ("example.com", "evil.local", "10.0.0.1"):
            try:
                safe_urlopen(f"https://{host}/x")
            except ValueError:
                pass
            else:
                raise AssertionError(f"expected ValueError for host {host}")

    def test_rejects_private_resolution(self):
        with mock.patch("socket.getaddrinfo") as mock_gai:
            mock_gai.return_value = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.0.0.5", 443))]
            try:
                safe_urlopen("https://huggingface.co/api/models")
            except ValueError as exc:
                assert "10.0.0.5" in str(exc)
            else:
                raise AssertionError("expected ValueError for private resolved address")