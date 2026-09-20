"""Capture a complete, real offline demo from a running TokenPrint backend.

backend/.venv/bin/python scripts/generate-demo-trace.py --force
"""

import argparse
import asyncio
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import websockets


async def capture(base, prompt, max_tokens):
    meta = None
    frames = []
    done = None
    async with websockets.connect(
        base.replace("http", "ws", 1) + "/ws/generate", max_size=32 * 1024 * 1024
    ) as ws:
        await ws.send(
            json.dumps(
                {
                    "prompt": prompt,
                    "max_new_tokens": max_tokens,
                    "top_k": 10,
                    "trace": True,
                    "record_trace": True,
                    "seed": 0,
                }
            )
        )
        async with asyncio.timeout(180):
            while True:
                item = json.loads(await ws.recv())
                if item["type"] == "error":
                    raise RuntimeError(item.get("message"))
                if item["type"] == "meta":
                    meta = item
                elif item["type"] == "token":
                    frames.append(item)
                elif item["type"] == "done":
                    done = item
                    break
    if not meta or not frames or not meta.get("op_catalog"):
        raise RuntimeError("The backend did not provide a complete instrumented trace.")

    def request(path, body=None):
        req = urllib.request.Request(
            base + path,
            data=json.dumps(body).encode() if body else None,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=120) as response:
            return json.load(response)

    identity = request("/model-info")
    if not identity.get("model_revision"):
        raise RuntimeError(
            "Restart the current backend to capture its resolved model revision."
        )
    meta.update(
        prompt=prompt,
        model_revision=identity["model_revision"],
        runtime_version=identity.get("runtime_version"),
    )
    return {
        "trace_version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "model": meta["model"],
        "meta": meta,
        "frames": frames,
        "done": done,
        "architecture_data": request("/architecture"),
        "analysis": request("/analyze", {"sentence": prompt}),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend", default="http://localhost:8000")
    parser.add_argument(
        "--prompt", default="Explain why the sky is blue in one sentence."
    )
    parser.add_argument("--max-tokens", type=int, default=16)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1]
        / "frontend/public/demo/hello-world.json",
    )
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if args.output.exists() and not args.force:
        parser.error("Output exists; use --force to replace it.")
    trace = asyncio.run(capture(args.backend.rstrip("/"), args.prompt, args.max_tokens))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(trace, separators=(",", ":")) + "\n")
    print(
        f"Saved {len(trace['frames'])} real frames and {len(trace['meta']['op_catalog'])} operations to {args.output}"
    )


if __name__ == "__main__":
    main()
