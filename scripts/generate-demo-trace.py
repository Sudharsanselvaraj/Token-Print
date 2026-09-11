"""Generate a curated demo trace for the static hosted demo.

Requires the backend to be running (for the WebSocket + trace endpoint).

Usage:
    python scripts/generate-demo-trace.py

Generates all demo traces defined in DEMOS and saves them to
frontend/public/demo/.
"""
import json, sys, time
from pathlib import Path

import requests

DEMO_DIR = Path(__file__).resolve().parent.parent / "frontend/public/demo"

DEMOS = [
    {
        "id": "neural-networks",
        "title": "Neural Networks",
        "prompt": "Neural networks are",
        "description": "Short generation: how attention patterns form.",
    },
    {
        "id": "transformer",
        "title": "Transformer",
        "prompt": "A transformer model works by",
        "description": "Layer-by-layer walk of a technical description.",
    },
    {
        "id": "hello-world",
        "title": "Hello World",
        "prompt": "Hello world! The meaning of life is",
        "description": "Classic coding prompt step by step.",
    },
]

BASE = "http://localhost:8000"


def run_generation(prompt: str) -> dict:
    """Start a WebSocket generation and wait for completion, then GET /trace."""
    import asyncio

    async def _run():
        import websockets

        uri = f"ws://localhost:8000/ws/generate"
        async with websockets.connect(uri) as ws:
            await ws.send(json.dumps({
                "type": "start",
                "prompt": prompt,
                "top_k": 20,
                "record_trace": True,
            }))
            while True:
                msg = await ws.recv()
                data = json.loads(msg)
                if data.get("type") == "done":
                    break

    asyncio.run(_run())
    resp = requests.get(f"{BASE}/trace")
    resp.raise_for_status()
    trace = resp.json()
    # Strip the op_catalog for portability (the frontend rebuilds it).
    if "meta" in trace and trace["meta"]:
        trace["meta"]["op_catalog"] = None
    return trace


def generate_all():
    DEMO_DIR.mkdir(parents=True, exist_ok=True)
    for demo in DEMOS:
        out = DEMO_DIR / f"{demo['id']}.json"
        if out.exists():
            print(f"  Skip {demo['id']} (exists)")
            continue
        print(f"  Generating {demo['id']}...")
        try:
            trace = run_generation(demo["prompt"])
            out.write_text(json.dumps(trace, indent=2))
            n_frames = len(trace.get("frames", []))
            print(f"    -> {out} ({n_frames} frames, {out.stat().st_size} bytes)")
        except Exception as e:
            print(f"    ERROR: {e}")


if __name__ == "__main__":
    generate_all()

