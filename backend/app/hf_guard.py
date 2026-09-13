"""Hardening for outbound Hugging Face Hub requests.

Closes the CodeQL ``py/partial-ssrf`` (SSRF) and ``py/log-injection`` findings
reported on ``backend/app/main.py``:

* ``hf_request`` refuses any URL whose scheme/hostname is not a fixed allowlist
  entry and whose resolved address could target a private/internal network.
  Redirects are deliberately not followed, so a hostile ``model_id`` cannot
  smuggle the connection elsewhere.
* ``validate_model_id`` / ``validate_search_term`` are strict allowlist checks
  applied to user input *before* it reaches a URL.
* ``sanitize_log`` strips control characters so user input interpolated into a
  log line cannot forge new log records.
"""

import ipaddress
import re
import socket
import urllib.error
import urllib.parse
import urllib.request

HF_ALLOWED_HOSTS = frozenset({"huggingface.co"})

_SAFE_USER_AGENT = "TokenPrint/0.1.0 (https://github.com/Sudharsanselvaraj/Token-Print)"

# org/name, alphanumeric start, no "..", single separator forced by the two groups.
_MODEL_ID_RE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}/[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$")

# Search terms: printable ASCII only, bounded length (already capped at 200).
_SEARCH_TERM_RE = re.compile(r"^[A-Za-z0-9 _.,'+-]{1,200}$")

# Networks that must never be reachable from the hub endpoints.
_BLOCKED_NETS = tuple(
    ipaddress.ip_network(net)
    for net in (
        "10.0.0.0/8",
        "100.64.0.0/10",
        "127.0.0.0/8",
        "169.254.0.0/16",
        "172.16.0.0/12",
        "192.0.0.0/24",
        "192.0.2.0/24",
        "192.168.0.0/16",
        "198.18.0.0/15",
        "198.51.100.0/24",
        "203.0.113.0/24",
        "::1/128",
        "fc00::/7",
        "fe80::/10",
        "ff00::/8",
    )
)


def validate_model_id(model_id: str) -> bool:
    """Return True only for a well-formed ``owner/name`` Hugging Face model id."""
    return bool(_MODEL_ID_RE.match(model_id or ""))


def validate_search_term(query: str) -> bool:
    """Return True only for a bounded, print-printable HF search term."""
    return bool(_SEARCH_TERM_RE.match(query or ""))


def sanitize_log(value: object) -> str:
    """Return a log-safe rendering of ``value`` with control characters stripped."""
    text = str(value)
    return "".join(ch if ch.isprintable() else "?" for ch in text)


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(
            req.full_url, code, "redirects disabled by TokenPrint security policy", headers, fp
        )


def safe_urlopen(url: str, timeout: float = 10.0):
    """Open ``url`` after verifying host + resolved address against the allowlist.

    Raises :class:`HTTPException` (400) or :class:`ValueError` if the request
    could target anything other than a public Hugging Face endpoint.
    """
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("https",):
        raise ValueError(f"Only https is allowed, got scheme '{parsed.scheme}'")
    if parsed.hostname not in HF_ALLOWED_HOSTS:
        raise ValueError(f"Host '{parsed.hostname}' is not in the allowed allowlist")

    try:
        addrinfos = socket.getaddrinfo(parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM)
    except OSError as exc:
        raise ValueError(f"Could not resolve host '{parsed.hostname}': {exc}") from exc
    seen = set()
    for addr in addrinfos:
        ip = ipaddress.ip_address(addr[4][0])
        seen.add(str(ip))
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
            raise ValueError(f"Resolved address {ip} is not a public address")
        if any(ip in net for net in _BLOCKED_NETS):
            raise ValueError(f"Resolved address {ip} is in a blocked network")
    if not seen:
        raise ValueError(f"Could not resolve any address for '{parsed.hostname}'")

    opener = urllib.request.build_opener(_NoRedirect)
    req = urllib.request.Request(url, headers={"User-Agent": _SAFE_USER_AGENT})
    return opener.open(req, timeout=timeout)