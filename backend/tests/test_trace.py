"""Tests for strict, versioned trace parsing."""

import pytest

from app.trace import TRACE_VERSION, parse_trace


def _valid_trace():
    return {
        "trace_version": TRACE_VERSION,
        "created_at": "2026-10-21T00:00:00Z",
        "model": "tiny-test-model",
        "meta": {"type": "meta", "prompt": "hello", "model": "tiny-test-model"},
        "frames": [{"type": "token", "step": 0, "chosen": {"id": 1, "text": "x"}}],
        "done": {"type": "done", "generated_text": "x", "total_steps": 1},
    }


def test_parse_trace_accepts_valid_v1_trace():
    trace = _valid_trace()
    assert parse_trace(trace) is trace


@pytest.mark.parametrize("version", [0, 2, None])
def test_parse_trace_rejects_missing_or_unsupported_version(version):
    trace = _valid_trace()
    trace["trace_version"] = version
    with pytest.raises(ValueError, match="trace_version"):
        parse_trace(trace)


@pytest.mark.parametrize("version", [1.0, True, "1"])
def test_parse_trace_rejects_non_integer_version(version):
    trace = _valid_trace()
    trace["trace_version"] = version
    with pytest.raises(TypeError, match="trace_version must be an integer"):
        parse_trace(trace)


def test_parse_trace_rejects_non_object_input():
    with pytest.raises(TypeError, match="JSON object"):
        parse_trace([])  # type: ignore[arg-type]


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("meta", [], "meta.*object"),
        ("frames", {}, "frames.*array"),
        ("done", None, "done.*object"),
    ],
)
def test_parse_trace_rejects_malformed_top_level_fields(field, value, message):
    trace = _valid_trace()
    trace[field] = value
    with pytest.raises(TypeError, match=message):
        parse_trace(trace)


def test_parse_trace_rejects_non_object_frames():
    trace = _valid_trace()
    trace["frames"] = ["not a frame"]
    with pytest.raises(TypeError, match="frame 0 must be an object"):
        parse_trace(trace)


def test_parse_trace_rejects_non_token_frames():
    trace = _valid_trace()
    trace["frames"] = [{"type": "meta"}]
    with pytest.raises(ValueError, match="type 'token'"):
        parse_trace(trace)


def test_parse_trace_rejects_invalid_done_type():
    trace = _valid_trace()
    trace["done"] = {"type": "token"}
    with pytest.raises(ValueError, match="type 'done'"):
        parse_trace(trace)


def test_replay_endpoint_returns_400_for_malformed_nested_field():
    from fastapi.testclient import TestClient

    from app.main import app

    trace = _valid_trace()
    trace["meta"] = []

    response = TestClient(app).post("/trace/replay", json=trace)

    assert response.status_code == 400
    assert "meta" in response.json()["detail"]
