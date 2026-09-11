"""Standalone proof that /analyze serves REAL model attention data.

It runs the ModelEngine.analyze() path AND an independent raw forward pass, then
asserts the served attention weights equal the model's actual attentions. If this
passes, the numbers the frontend renders are genuinely from the model — not faked.

Run:  backend/.venv/bin/python backend/scripts/verify_real_data.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import torch

# Make `app` importable when run from anywhere.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.model import ModelEngine

SENTENCE = "The cat sat on the mat."


def main() -> int:
    print("Loading model (first run downloads ~1GB)...")
    eng = ModelEngine()
    print(f"  model={eng.model_id} device={eng.device} "
          f"layers={eng.num_layers} heads={eng.num_heads} hidden={eng.hidden_size}")

    # 1) The served path.
    served = eng.analyze(SENTENCE)
    tokens = served["tokens"]
    attn = torch.tensor(served["attention"])  # [L, H, seq, seq]
    seq = len(tokens)
    print(f"\nSentence: {SENTENCE!r}")
    print(f"Tokens ({seq}): {[t['text'] for t in tokens]}")
    print(f"Attention tensor shape (served): {tuple(attn.shape)}")

    # 2) Independent raw forward pass — recompute attentions ourselves.
    enc = eng.tokenizer(SENTENCE, return_tensors="pt").to(eng.device)
    with torch.no_grad():
        out = eng.model(**enc, output_attentions=True)
    raw = torch.stack(out.attentions).squeeze(1).to("cpu").float()  # [L, H, seq, seq]

    # --- Assertions ---------------------------------------------------------
    ok = True

    # Shape sanity.
    assert attn.shape[0] == eng.num_layers, "layer count mismatch"
    assert attn.shape[1] == eng.num_heads, "head count mismatch"
    assert attn.shape[2] == seq and attn.shape[3] == seq, "seq mismatch"

    # Served values must match the raw forward pass within rounding tolerance
    # (we round to 3 decimals and zero sub-0.01, so ~0.01 tolerance).
    # Compare only entries the server kept non-zero to respect the thresholding.
    kept = attn > 0
    max_err = (attn[kept] - raw[kept]).abs().max().item() if kept.any() else 0.0
    print(f"\nMax abs error vs independent forward pass (kept entries): {max_err:.5f}")
    if max_err > 0.011:
        print("  !! served attentions DO NOT match the real forward pass")
        ok = False
    else:
        print("  OK: served attentions match the real model forward pass")

    # Attention rows are a softmax distribution -> each 'from' row sums to ~1
    # (in the RAW tensor; the served one is thresholded so it sums to <=1).
    row_sums = raw.sum(dim=-1)  # [L, H, seq]
    rmin, rmax = row_sums.min().item(), row_sums.max().item()
    print(f"Raw attention row sums range: [{rmin:.4f}, {rmax:.4f}] (should be ~1.0)")
    if not (0.98 <= rmin <= rmax <= 1.02):
        print("  !! rows do not sum to ~1 — not a valid attention distribution")
        ok = False
    else:
        print("  OK: every attention row is a valid probability distribution")

    # Show a concrete real slice: layer 0, head 0, first 'from' token's weights.
    print("\nConcrete sample — layer 0, head 0, attention FROM token 0 "
          f"({tokens[0]['text']!r}) TO each token:")
    for j, t in enumerate(tokens):
        w = served["attention"][0][0][0][j]
        bar = "#" * round(w * 40)
        print(f"  -> {t['text']!r:>10}  {w:.3f}  {bar}")

    print("\n" + ("PASS: data is real." if ok else "FAIL: see errors above."))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
