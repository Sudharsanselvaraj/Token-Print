"""Verify the trace format: build a synthetic trace, serialize, and round-trip."""

from __future__ import annotations

import json

from app.trace import TraceRecorder, download_filename, parse_trace, serialize_trace


def test_recorder_builds_correct_shape():
    meta = {
        "type": "meta",
        "model": "Qwen/Qwen2.5-0.5B-Instruct",
        "device": "mps",
        "architecture": "qwen2",
        "num_layer_stats": 25,
        "num_layers": 24,
        "prompt_tokens": ["Hello", " world"],
        "prompt_len": 2,
        "max_new_tokens": 5,
        "top_k": 10,
        "decoding": "greedy",
        "uses_kv_cache": True,
        "op_catalog": [],
    }
    rec = TraceRecorder(meta)

    token_frame = {
        "type": "token",
        "step": 0,
        "chosen": {"id": 42, "text": " test", "logprob": -1.5},
        "topk": [{"id": 42, "text": " test", "logit": -1.5, "prob": 0.22}],
        "layer_stats": [0.5] * 25,
        "eos": False,
        "phase": "prefill",
        "n_positions": 2,
        "cache_len": 0,
    }
    rec.add_frame(token_frame)
    # Non-token frames should be ignored.
    rec.add_frame({"type": "meta", "model": "ignored"})

    done = {"type": "done", "generated_text": " test output", "total_steps": 1}
    rec.finalize(done)

    trace = rec.build()
    assert trace["trace_version"] == 1
    assert trace["model"] == "Qwen/Qwen2.5-0.5B-Instruct"
    assert len(trace["frames"]) == 1
    assert trace["frames"][0]["step"] == 0
    assert trace["done"]["generated_text"] == " test output"
    assert "created_at" in trace
    print("  [PASS] recorder builds correct shape")


def test_serialize_round_trip():
    trace = {
        "trace_version": 1,
        "created_at": "2026-01-01T00:00:00Z",
        "model": "test-model",
        "meta": {"prompt_len": 5, "prompt_tokens": ["a", "b"]},
        "frames": [
            {
                "type": "token",
                "step": 0,
                "chosen": {"id": 1, "text": "x", "logprob": -2.0},
                "topk": [],
                "layer_stats": [],
                "eos": False,
            }
        ],
        "done": {"generated_text": "x", "total_steps": 1},
    }
    raw = serialize_trace(trace)
    assert isinstance(raw, bytes)
    parsed = json.loads(raw)
    validated = parse_trace(parsed)
    assert validated["trace_version"] == 1
    assert len(validated["frames"]) == 1
    print("  [PASS] serialize round-trip preserves data")


def test_parse_rejects_bad_input():
    try:
        parse_trace({})
        assert False, "should have raised"
    except ValueError as e:
        assert "trace_version" in str(e)

    try:
        parse_trace({"trace_version": 0})
        assert False, "should have raised"
    except ValueError as e:
        assert "Unsupported" in str(e)

    try:
        parse_trace({"trace_version": 1})
        assert False, "should have raised"
    except ValueError as e:
        assert "meta" in str(e) or "frames" in str(e) or "done" in str(e)

    print("  [PASS] parse rejects bad input")


def test_download_filename():
    trace = {"meta": {"prompt_tokens": ["Hello", "world", "foo"]}}
    fn = download_filename(trace)
    assert fn.startswith("tokenprint-")
    assert fn.endswith(".json")
    assert "hello" in fn
    print("  [PASS] download_filename works")


if __name__ == "__main__":
    test_recorder_builds_correct_shape()
    test_serialize_round_trip()
    test_parse_rejects_bad_input()
    test_download_filename()
    print("\nAll trace tests passed.")
