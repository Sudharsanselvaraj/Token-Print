"""Phase 3 check: the manual decode loop streams real per-step data.

Verifies for each generated token: a chosen token, a valid top-k probability
distribution (probs in [0,1], descending, chosen == argmax), and per-layer
activation stats of the right length. Also checks greedy determinism (same
prompt -> identical trace).

Run: backend/.venv/bin/python backend/scripts/verify_generation.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.model import ModelEngine

PROMPT = "Name one primary color. Answer in one word."


def run(eng: ModelEngine):
    frames = list(eng.generate_steps(PROMPT, max_new_tokens=12, top_k=8))
    return frames


def main() -> int:
    eng = ModelEngine()
    frames = run(eng)

    meta = frames[0]
    tokens = [f for f in frames if f["type"] == "token"]
    done = frames[-1]
    assert meta["type"] == "meta", "first frame must be meta"
    assert done["type"] == "done", "last frame must be done"

    print(f"prompt: {PROMPT!r}")
    print(f"meta: num_layer_stats={meta['num_layer_stats']} "
          f"prompt_len={meta['prompt_len']} decoding={meta['decoding']}")
    print(f"generated: {done['generated_text']!r} ({done['total_steps']} steps)\n")

    ok = True
    for f in tokens:
        tk = f["topk"]
        probs = [t["prob"] for t in tk]
        # top-k must be sorted descending and chosen == argmax (greedy)
        sorted_ok = all(probs[i] >= probs[i + 1] for i in range(len(probs) - 1))
        chosen_is_top = f["chosen"]["id"] == tk[0]["id"]
        stats_ok = len(f["layer_stats"]) == meta["num_layer_stats"]
        rng_ok = all(0.0 <= p <= 1.0 for p in probs)
        # issue #18: real per-layer timing must span exactly num_layers
        timings_ok = (
            "layer_timings_ms" in f
            and len(f["layer_timings_ms"]) == meta["num_layers"]
            and sum(f["layer_timings_ms"]) > 0
        )
        if not (sorted_ok and chosen_is_top and stats_ok and rng_ok and timings_ok):
            ok = False
        top = tk[0]
        bar = "#" * round(top["prob"] * 30)
        total_ms = round(sum(f.get("layer_timings_ms", [])), 2)
        print(f"  step {f['step']:2d}: {f['chosen']['text']!r:>10}  "
              f"p={top['prob']:.3f} {bar}  "
              f"(top2: {tk[1]['text']!r} {tk[1]['prob']:.3f})  "
              f"stats[0..2]={f['layer_stats'][:3]}  {total_ms}ms/layer")

    # Determinism: run again, compare chosen token ids.
    frames2 = run(eng)
    ids1 = [f["chosen"]["id"] for f in frames if f["type"] == "token"]
    ids2 = [f["chosen"]["id"] for f in frames2 if f["type"] == "token"]
    deterministic = ids1 == ids2
    print(f"\ndeterministic (same prompt -> same tokens): {deterministic}")

    ok = ok and deterministic and len(tokens) >= 1
    print("\n" + ("PASS: streamed generation is real, valid, and replayable."
                  if ok else "FAIL."))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
