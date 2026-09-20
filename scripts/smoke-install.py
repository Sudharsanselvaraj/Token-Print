"""Real inference smoke check, invoked by the launcher and release workflow."""

import asyncio
import json
import sys
import urllib.request

import websockets

backend, frontend = sys.argv[1:3]


def check_demo():
    with urllib.request.urlopen(
        f"http://localhost:{frontend}/demo/hello-world.json"
    ) as response:
        demo = json.load(response)
        assert (
            demo["frames"]
            and demo["meta"]["op_catalog"]
            and demo["analysis"]["attention"]
        )


async def main():
    await asyncio.to_thread(check_demo)
    async with websockets.connect(f"ws://localhost:{backend}/ws/generate") as ws:
        await ws.send(
            json.dumps(
                {"prompt": "The sky is", "max_new_tokens": 2, "trace": True, "top_k": 5}
            )
        )
        frames = []
        async with asyncio.timeout(120):
            while True:
                item = json.loads(await ws.recv())
                if item["type"] == "error":
                    raise RuntimeError(item)
                frames.append(item)
                if item["type"] == "done":
                    break
        assert any(f["type"] == "token" for f in frames), "No real token generated"
        meta = next(f for f in frames if f["type"] == "meta")
        assert meta["model_revision"], "Resolved model revision missing"
        print(
            "Backend readiness, recorded example, model revision and real generation verified."
        )


asyncio.run(main())
