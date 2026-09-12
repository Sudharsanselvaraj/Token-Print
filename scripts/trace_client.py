#!/usr/bin/env python3
"""TokenPrint trace-dump client — capture JSON traces programmatically.

Usage:
    python trace_client.py --prompt "The capital of France is" --output trace.json

    # Use a custom endpoint
    python trace_client.py --url http://localhost:8000 --prompt "Once upon a" --output trace.json

    # Record a trace for CI diffing
    python trace_client.py --prompt "Hello world" --output baseline.json
    python trace_client.py --prompt "Hello world" --output head.json
    # Then: python -m scripts.trace_diff baseline.json head.json
"""

import argparse
import json
import sys
import urllib.request
import urllib.parse


TRACE_API = "/trace"


def capture_trace(base_url: str, prompt: str, max_new_tokens: int = 10, 
                  top_k: int = 10, timeout: int = 60) -> dict:
    """Send a generation request with tracing enabled and return the recorded trace."""
    url = urllib.parse.urljoin(base_url.rstrip("/") + "/", TRACE_API.lstrip("/"))
    
    body = json.dumps({
        "prompt": prompt,
        "max_new_tokens": max_new_tokens,
        "top_k": top_k,
        "trace": True,
    }).encode("utf-8")
    
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def trace_diff(baseline_path: str, head_path: str, tolerance: float = 0.05):
    """Compare two trace files and report structural differences."""
    with open(baseline_path) as f:
        base = json.load(f)
    with open(head_path) as f:
        head = json.load(f)

    diffs = []

    frames_b = base.get("frames", [])
    frames_h = head.get("frames", [])

    if len(frames_b) != len(frames_h):
        diffs.append(f"Frame count: baseline={len(frames_b)} head={len(frames_h)}")

    for i, (fb, fh) in enumerate(zip(frames_b, frames_h)):
        # Compare chosen token
        if fb.get("chosen", {}).get("id") != fh.get("chosen", {}).get("id"):
            diffs.append(
                f"Token {i}: baseline={fb.get('chosen')} head={fh.get('chosen')}"
            )
        
        # Compare top-K probabilities
        tk_b = {c["id"]: c["prob"] for c in fb.get("topk", [])}
        tk_h = {c["id"]: c["prob"] for c in fh.get("topk", [])}
        
        all_ids = set(tk_b) | set(tk_h)
        for tid in all_ids:
            pb = tk_b.get(tid, 0)
            ph = tk_h.get(tid, 0)
            if abs(pb - ph) > tolerance:
                diffs.append(f"Token {i}, id {tid}: baseline={pb:.3f} head={ph:.3f}")

        # Compare layer stats
        ls_b = fb.get("layer_stats", [])
        ls_h = fh.get("layer_stats", [])
        if ls_b and ls_h:
            for li, (lb, lh) in enumerate(zip(ls_b, ls_h)):
                if abs(lb - lh) > tolerance:
                    diffs.append(
                        f"Layer {li} @ token {i}: baseline={lb:.4f} head={lh:.4f}"
                    )

    return diffs


def main():
    parser = argparse.ArgumentParser(description="TokenPrint trace client")
    parser.add_argument("--url", default="http://localhost:8000", help="Server URL")
    parser.add_argument("--prompt", default="The capital of France is", help="Prompt text")
    parser.add_argument("--max-tokens", type=int, default=10, help="Max generated tokens")
    parser.add_argument("--top-k", type=int, default=10, help="Top-K candidates")
    parser.add_argument("--output", default=None, help="Save trace to file")
    args = parser.parse_args()

    print(f"Capturing trace from {args.url} ...", file=sys.stderr)
    trace = capture_trace(args.url, args.prompt, args.max_tokens, args.top_k)
    
    if args.output:
        with open(args.output, "w") as f:
            json.dump(trace, f, indent=2)
        print(f"Trace saved to {args.output}")
    else:
        print(json.dumps(trace, indent=2))


if __name__ == "__main__":
    main()
