"""Trace format: serialize a full generation session to a single JSON file.

A trace captures everything needed to replay a generation in the UI without
a running backend — prompt, model metadata, per-token frames, op catalog,
and timing.  The schema is versioned from day one (``trace_version: 1``)
so the frontend can validate and migrate if the format ever changes.

Usage (backend):
    recorder = TraceRecorder(meta_frame)
    recorder.add_frame(token_frame)
    recorder.finalize(done_frame)
    trace = recorder.build()
    json_bytes = serialize_trace(trace)
"""

from __future__ import annotations

import json
import time
from typing import Any

TRACE_VERSION = 1


def _now_iso() -> str:
    """UTC ISO-8601 timestamp."""
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


class TraceRecorder:
    """Accumulates frames from a ``generate_steps`` session into a trace dict."""

    def __init__(self, meta: dict[str, Any]):
        self._meta = meta
        self._frames: list[dict[str, Any]] = []
        self._done: dict[str, Any] | None = None

    def add_frame(self, frame: dict[str, Any]) -> None:
        """Append a token frame (``type: "token"``)."""
        if frame.get("type") == "token":
            self._frames.append(frame)

    def finalize(self, done: dict[str, Any]) -> None:
        """Set the done frame (``type: "done"``)."""
        self._done = done

    @property
    def prompt(self) -> str:
        return str(self._meta.get("prompt", ""))

    @property
    def model(self) -> str:
        return str(self._meta.get("model", ""))

    def build(self) -> dict[str, Any]:
        """Return the complete trace dictionary."""
        return {
            "trace_version": TRACE_VERSION,
            "created_at": _now_iso(),
            "model": self.model,
            "meta": self._meta,
            "frames": self._frames,
            "done": self._done,
        }


def serialize_trace(trace: dict[str, Any]) -> bytes:
    """Encode a trace dict to compact UTF-8 JSON bytes."""
    return json.dumps(trace, ensure_ascii=False, separators=(",", ":")).encode()


def parse_trace(raw: dict[str, Any]) -> dict[str, Any]:
    """Validate the supported trace version and required trace structure.

    Raises ``ValueError`` for unsupported versions or malformed trace data.
    Validation is intentionally structural: tensor values and optional frame
    fields remain backend-defined and are preserved without normalization.
    """
    if not isinstance(raw, dict):
        raise TypeError("Trace must be a JSON object")

    version = raw.get("trace_version")
    if version is None:
        raise ValueError("Missing trace_version field")
    # bool is a subclass of int in Python, but True is not trace version 1.
    if isinstance(version, bool) or not isinstance(version, int) or version != TRACE_VERSION:
        raise ValueError(
            f"Unsupported trace_version: {version!r}; expected {TRACE_VERSION}"
        )

    for key in ("meta", "frames", "done"):
        if key not in raw:
            raise ValueError(f"Missing required field: {key}")

    if not isinstance(raw["meta"], dict):
        raise TypeError("Trace field 'meta' must be an object")
    if not isinstance(raw["frames"], list):
        raise TypeError("Trace field 'frames' must be an array")
    if not isinstance(raw["done"], dict):
        raise TypeError("Trace field 'done' must be an object")

    for index, frame in enumerate(raw["frames"]):
        if not isinstance(frame, dict):
            raise TypeError(f"Trace frame {index} must be an object")
        if frame.get("type") != "token":
            raise ValueError(f"Trace frame {index} must have type 'token'")

    if raw["done"].get("type") != "done":
        raise ValueError("Trace field 'done' must have type 'done'")

    return raw


def download_filename(trace: dict[str, Any]) -> str:
    """Suggest a filename for a trace download, e.g. ``tokenprint-abc123.json``."""
    prompt = trace.get("meta", {}).get("prompt_tokens", [])
    slug = "".join(prompt)[:32].replace(" ", "-").lower() or "trace"
    return f"tokenprint-{slug}.json"
