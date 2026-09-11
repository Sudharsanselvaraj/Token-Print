"""Phase 2 check: is the projected geometry real, and does it cluster?

Runs a semantic test sentence and, for each layer, measures whether related
tokens (king/queen, man/woman, apple/orange) land nearer each other than
unrelated tokens in the 3D PCA projection. This is the honest "does clustering
actually appear, and where" check the spec asks for — we report what's real
rather than assume clean clusters.

Run: backend/.venv/bin/python backend/scripts/verify_geometry.py
"""

from __future__ import annotations

import sys
from itertools import combinations
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.model import ModelEngine

SENTENCE = "king queen man woman apple orange"
# Related pairs we'd hope cluster (by token text, trimmed).
RELATED = [("king", "queen"), ("man", "woman"), ("apple", "orange")]


def dist(a, b):
    return float(np.linalg.norm(np.array(a) - np.array(b)))


def main() -> int:
    eng = ModelEngine()
    data = eng.analyze(SENTENCE)
    toks = [t["text"].strip() for t in data["tokens"]]
    print(f"tokens: {toks}")
    print(f"projection: {data['projection']['method']} "
          f"explained_var(emb)={data['projection']['embedding_explained_variance']}")

    idx = {t: i for i, t in enumerate(toks)}
    have = all(w in idx for pair in RELATED for w in pair)
    if not have:
        print("note: not all target words are single tokens; showing coords only.")

    # For each layer, compare mean related-pair distance vs mean all-pair distance.
    n_layers = len(data["hidden_states_3d"])
    print("\nlayer | mean related dist | mean all-pairs dist | ratio (lower=better clustering)")
    best = None
    for L in range(n_layers):
        coords = data["hidden_states_3d"][str(L)]
        all_pairs = [dist(coords[i], coords[j]) for i, j in combinations(range(len(coords)), 2)]
        mean_all = float(np.mean(all_pairs)) if all_pairs else 0.0
        if have and mean_all > 0:
            rel = [dist(coords[idx[a]], coords[idx[b]]) for a, b in RELATED]
            mean_rel = float(np.mean(rel))
            ratio = mean_rel / mean_all
            if best is None or ratio < best[1]:
                best = (L, ratio)
            print(f"{L:5d} | {mean_rel:16.3f} | {mean_all:18.3f} | {ratio:.3f}")
    if best:
        print(f"\nBest-clustering layer: {best[0]} (related pairs are "
              f"{(1-best[1])*100:.0f}% closer than the average pair).")

    # Determinism: same sentence twice -> identical coords.
    again = eng.analyze(SENTENCE)
    identical = again["embeddings_3d"] == data["embeddings_3d"]
    print(f"\nDeterministic (same sentence -> same coords): {identical}")

    # Show layer-0 embedding coords.
    print("\nLayer-0 embedding coords (x,y,z):")
    for t, c in zip(toks, data["embeddings_3d"]):
        print(f"  {t:>8}: ({c[0]:6.2f}, {c[1]:6.2f}, {c[2]:6.2f})")

    ok = identical and len(data["embeddings_3d"]) == len(toks)
    print("\n" + ("PASS: geometry is real and deterministic." if ok else "FAIL."))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
