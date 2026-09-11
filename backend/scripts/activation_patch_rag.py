#!/usr/bin/env python3
"""Activation Patching Experiment for Causal RAG Context Token Attribution (Issue #115).

Demonstrates and verifies that activation patching on retrieved context token
spans can causally isolate which retrieved chunk determines the model's output,
moving beyond purely correlational attention weights.

Usage:
    python backend/scripts/activation_patch_rag.py
    python backend/scripts/activation_patch_rag.py --mode knockout --layers 8,12,16
    python backend/scripts/activation_patch_rag.py --mode restoration
    python backend/scripts/activation_patch_rag.py --mode both
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Add backend directory to sys.path so app modules are importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import torch
import torch.nn.functional as F
from app.ablation import ActivationPatch
from app.model import ModelEngine
from app.reduce import causal_chunk_scores

# --------------------------------------------------------------------------- #
# Experiment Datasets & Scenarios
# --------------------------------------------------------------------------- #
DEFAULT_CHUNKS = [
    {
        "id": "chunk_1",
        "title": "Germany",
        "text": "The capital of Germany is Berlin. It is known for the Brandenburg Gate and historic architecture.",
    },
    {
        "id": "chunk_2",
        "title": "France",
        "text": "The capital of France is Paris. The iconic Eiffel Tower is situated along the river Seine.",
    },
    {
        "id": "chunk_3",
        "title": "Italy",
        "text": "The capital of Italy is Rome. The Colosseum stands as a monument to ancient Roman civilization.",
    },
]

COUNTERFACTUAL_CHUNK_2 = {
    "id": "chunk_2",
    "title": "France (Corrupted)",
    "text": "The capital of France is Lyon. The iconic basilica sits atop the Fourviere hill in the city.",
}

DEFAULT_QUERY = "What is the capital of France? Answer:"
EXPECTED_TARGET_WORD = "Paris"


def build_rag_prompt(chunks: list[dict], query: str) -> tuple[str, dict[str, tuple[int, int]]]:
    """Compose structured RAG prompt and compute character ranges for each chunk."""
    parts = ["Context:\n"]
    char_ranges = {}
    cursor = len(parts[0])

    for c in chunks:
        cid = c["id"]
        prefix = f"<chunk id={cid}>"
        parts.append(prefix)
        cursor += len(prefix)

        start = cursor
        parts.append(c["text"])
        cursor += len(c["text"])
        end = cursor
        char_ranges[cid] = (start, end)

        suffix = "</chunk>\n"
        parts.append(suffix)
        cursor += len(suffix)

    cleaned_query = query.strip()
    if cleaned_query.endswith("Answer:"):
        cleaned_query = cleaned_query[:-7].strip()
    query_part = f"\n<query>{cleaned_query}</query>\nAnswer:"
    parts.append(query_part)
    return "".join(parts), char_ranges


def get_chunk_token_spans(
    tokenizer,
    prompt: str,
    char_ranges: dict[str, tuple[int, int]],
) -> dict[str, tuple[int, int]]:
    """Map character ranges of chunks into inclusive token spans [start_tok, end_tok]."""
    enc = tokenizer(prompt, return_offsets_mapping=True, return_tensors="pt")
    raw_offsets = enc.get("offset_mapping")
    if raw_offsets is None:
        raise RuntimeError("Tokenizer does not expose offset_mapping; required for token span resolution.")

    offsets = [(int(s), int(e)) for s, e in raw_offsets[0]]
    chunk_spans = {}

    for cid, (c_start, c_end) in char_ranges.items():
        matching_indices = [
            idx for idx, (tok_s, tok_e) in enumerate(offsets)
            if tok_e > tok_s and tok_s < c_end and tok_e > c_start
        ]
        if matching_indices:
            chunk_spans[cid] = (matching_indices[0], matching_indices[-1])
        else:
            chunk_spans[cid] = (-1, -1)

    return chunk_spans


def get_next_token_probs(model, enc, device: str) -> torch.Tensor:
    """Run forward pass and return softmax probabilities over the vocab for the final position."""
    inputs = {k: v.to(device) for k, v in enc.items() if k in ("input_ids", "attention_mask")}
    with torch.no_grad():
        out = model(**inputs)
        logits = out.logits[0, -1, :]  # [vocab_size]
        probs = F.softmax(logits, dim=-1)
    return probs


def find_target_token_id(tokenizer, expected_word: str) -> tuple[int, str]:
    """Find the exact token id produced by the tokenizer for the expected target word."""
    candidates = [f" {expected_word}", expected_word]
    for cand in candidates:
        cand_ids = tokenizer.encode(cand, add_special_tokens=False)
        if len(cand_ids) == 1:
            return cand_ids[0], cand
    ids = tokenizer.encode(f" {expected_word}", add_special_tokens=False)
    token_id = ids[0]
    return token_id, tokenizer.decode([token_id])


# --------------------------------------------------------------------------- #
# Experiment Runners
# --------------------------------------------------------------------------- #
def run_knockout_experiment(
    eng: ModelEngine,
    prompt: str,
    chunk_spans: dict[str, tuple[int, int]],
    chunks: list[dict],
    target_token_id: int,
    target_token_str: str,
    patch_layers: set[int],
    ablation_type: str = "zero",
) -> dict[str, dict]:
    """Run knockout / corruption intervention: ablate each chunk's activations at chosen layers."""
    model = eng.model
    device = eng.device
    tokenizer = eng.tokenizer

    enc = tokenizer(prompt, return_tensors="pt")
    baseline_probs = get_next_token_probs(model, enc, device)
    baseline_p = float(baseline_probs[target_token_id].item())

    top1_id = int(baseline_probs.argmax().item())
    top1_str = tokenizer.decode([top1_id])

    print("\n" + "=" * 78)
    print("EXPERIMENT 1: KNOCKOUT ACTIVATION PATCHING (ABLATION)")
    print("=" * 78)
    print(f"Target Token      : {target_token_str!r} (id: {target_token_id})")
    print(f"Baseline Output   : {top1_str!r} with P = {baseline_p:.4f}")
    print(f"Intervention Mode : {ablation_type.upper()} at layers {sorted(patch_layers)}")
    print("-" * 78)

    patched_probs = {}

    for cid, (s, e) in chunk_spans.items():
        if s < 0 or e < s:
            continue

        patch = ActivationPatch(
            model.model,
            patch_layers=patch_layers,
            patch_spans=[(s, e)],
            mode=ablation_type,
        )

        with patch:
            probs = get_next_token_probs(model, enc, device)
            p_patched = float(probs[target_token_id].item())
            patched_probs[cid] = p_patched

    scores = causal_chunk_scores(
        baseline_prob=baseline_p,
        patched_probs=patched_probs,
        mode="knockout",
    )

    print(f"{'Chunk ID':<10} | {'Tokens':<10} | {'P(target)':<10} | {'ΔP (Drop)':<10} | {'Effect %':<10} | Visual Impact")
    print("-" * 78)
    for c in chunks:
        cid = c["id"]
        res = scores.get(cid, {})
        span = chunk_spans.get(cid, (-1, -1))
        span_str = f"[{span[0]}..{span[1]}]"
        p_val = res.get("patched_prob", 0.0)
        drop = res.get("causal_effect", 0.0)
        rel = res.get("relative_effect", 0.0)
        bar = "#" * round(rel * 20)
        print(f"{cid:<10} | {span_str:<10} | {p_val:<10.4f} | {drop:<10.4f} | {rel * 100:<9.1f}% | {bar}")

    print("-" * 78)
    return scores


def run_restoration_experiment(
    eng: ModelEngine,
    clean_prompt: str,
    corrupted_prompt: str,
    chunk_spans_corrupted: dict[str, tuple[int, int]],
    chunk_spans_clean: dict[str, tuple[int, int]],
    chunks: list[dict],
    target_token_id: int,
    target_token_str: str,
    patch_layers: set[int],
) -> dict[str, dict]:
    """Run restoration intervention: patch clean chunk activations into the corrupted prompt."""
    model = eng.model
    device = eng.device
    tokenizer = eng.tokenizer

    enc_clean = tokenizer(clean_prompt, return_tensors="pt")
    enc_corrupt = tokenizer(corrupted_prompt, return_tensors="pt")

    p_clean = float(get_next_token_probs(model, enc_clean, device)[target_token_id].item())
    p_corrupt = float(get_next_token_probs(model, enc_corrupt, device)[target_token_id].item())

    print("\n" + "=" * 78)
    print("EXPERIMENT 2: RESTORATION ACTIVATION PATCHING (COUNTERFACTUAL)")
    print("=" * 78)
    print(f"Target Token       : {target_token_str!r} (id: {target_token_id})")
    print(f"Clean Baseline P   : {p_clean:.4f}")
    print(f"Corrupted Baseline : {p_corrupt:.4f}")
    print(f"Intervention Mode  : REPLACE from clean states at layers {sorted(patch_layers)}")
    print("-" * 78)

    capture_patch = ActivationPatch(model.model, patch_layers=patch_layers)
    with torch.no_grad():
        clean_states = capture_patch.capture(
            model,
            enc_clean["input_ids"].to(device),
            attention_mask=enc_clean.get("attention_mask", torch.ones_like(enc_clean["input_ids"])).to(device),
        )

    patched_probs = {}

    for cid, tgt_span in chunk_spans_corrupted.items():
        src_span = chunk_spans_clean.get(cid, tgt_span)

        patch = ActivationPatch(
            model.model,
            patch_layers=patch_layers,
            patch_spans=[tgt_span],
            source_spans=[src_span],
            mode="replace",
        )
        patch(clean_states)

        with patch:
            probs = get_next_token_probs(model, enc_corrupt, device)
            patched_probs[cid] = float(probs[target_token_id].item())

    scores = causal_chunk_scores(
        baseline_prob=p_clean,
        patched_probs=patched_probs,
        mode="restoration",
        corrupted_prob=p_corrupt,
    )

    print(f"{'Chunk ID':<10} | {'Tokens':<10} | {'P(target)':<10} | {'Recovery':<10} | {'Effect %':<10} | Visual Recovery")
    print("-" * 78)
    for c in chunks:
        cid = c["id"]
        res = scores.get(cid, {})
        span = chunk_spans_corrupted.get(cid, (-1, -1))
        span_str = f"[{span[0]}..{span[1]}]"
        p_val = res.get("patched_prob", 0.0)
        rec = res.get("causal_effect", 0.0)
        rel = res.get("relative_effect", 0.0)
        bar = "=" * round(rel * 20)
        print(f"{cid:<10} | {span_str:<10} | {p_val:<10.4f} | {rec:<10.4f} | {rel * 100:<9.1f}% | {bar}")

    print("-" * 78)
    return scores


# --------------------------------------------------------------------------- #
# Main CLI & Verification Entrypoint
# --------------------------------------------------------------------------- #
def main() -> int:
    parser = argparse.ArgumentParser(description="Causal RAG Activation Patching Experiment (Issue #115)")
    parser.add_argument("--mode", choices=["knockout", "restoration", "both"], default="both",
                        help="Experimental intervention mode.")
    parser.add_argument("--ablation", choices=["zero", "noise"], default="zero",
                        help="Knockout replacement type: zero or gaussian noise.")
    parser.add_argument("--layers", type=str, default="all",
                        help="Comma-separated layer indices to patch, or 'all'.")
    parser.add_argument("--device", type=str, default=None,
                        help="Device override (cpu, mps, cuda).")
    args = parser.parse_args()

    print("=" * 78)
    print("TokenPrint: [RES-01] Causal RAG Attribution Interventions (Issue #115)")
    print("=" * 78)
    print("Loading language model engine...")
    eng = ModelEngine(device=args.device)
    num_layers = eng.num_layers
    print(f"Model ready: {eng.model_id} on {eng.device} ({num_layers} layers)")

    if args.layers == "all":
        patch_layers = set(range(num_layers))
    else:
        patch_layers = {int(x.strip()) for x in args.layers.split(",") if x.strip()}

    # 1. Build Prompts and resolve token spans
    clean_prompt, clean_char_ranges = build_rag_prompt(DEFAULT_CHUNKS, DEFAULT_QUERY)
    clean_spans = get_chunk_token_spans(eng.tokenizer, clean_prompt, clean_char_ranges)

    target_token_id, target_token_str = find_target_token_id(eng.tokenizer, EXPECTED_TARGET_WORD)
    print(f"\nResolved Prompt Sequence: {len(eng.tokenizer.encode(clean_prompt))} tokens")
    for cid, span in clean_spans.items():
        print(f"  • {cid}: token span [{span[0]}..{span[1]}]")

    passed = True

    # 2. Knockout Experiment
    if args.mode in ("knockout", "both"):
        knockout_results = run_knockout_experiment(
            eng=eng,
            prompt=clean_prompt,
            chunk_spans=clean_spans,
            chunks=DEFAULT_CHUNKS,
            target_token_id=target_token_id,
            target_token_str=target_token_str,
            patch_layers=patch_layers,
            ablation_type=args.ablation,
        )

        c1_drop = knockout_results["chunk_1"]["causal_effect"]
        c2_drop = knockout_results["chunk_2"]["causal_effect"]
        c3_drop = knockout_results["chunk_3"]["causal_effect"]

        print("\nCausal Attribution Assessment (Knockout):")
        print(f"  Supporting Chunk (France) Effect : {c2_drop:.4f}")
        print(f"  Distractor Chunk 1 (Germany)      : {c1_drop:.4f}")
        print(f"  Distractor Chunk 3 (Italy)        : {c3_drop:.4f}")

        if c2_drop > c1_drop and c2_drop > c3_drop:
            print("  >> PASS: Chunk 2 (France) is causally identified as the dominant determinant.")
        else:
            print("  >> FAIL: Supporting chunk did not exhibit dominant causal drop.")
            passed = False

    # 3. Restoration Experiment
    if args.mode in ("restoration", "both"):
        corrupted_chunks = [
            DEFAULT_CHUNKS[0],
            COUNTERFACTUAL_CHUNK_2,
            DEFAULT_CHUNKS[2],
        ]
        corrupt_prompt, corrupt_char_ranges = build_rag_prompt(corrupted_chunks, DEFAULT_QUERY)
        corrupt_spans = get_chunk_token_spans(eng.tokenizer, corrupt_prompt, corrupt_char_ranges)

        restoration_results = run_restoration_experiment(
            eng=eng,
            clean_prompt=clean_prompt,
            corrupted_prompt=corrupt_prompt,
            chunk_spans_corrupted=corrupt_spans,
            chunk_spans_clean=clean_spans,
            chunks=DEFAULT_CHUNKS,
            target_token_id=target_token_id,
            target_token_str=target_token_str,
            patch_layers=patch_layers,
        )

        c1_rec = restoration_results["chunk_1"]["causal_effect"]
        c2_rec = restoration_results["chunk_2"]["causal_effect"]
        c3_rec = restoration_results["chunk_3"]["causal_effect"]

        print("\nCausal Attribution Assessment (Restoration):")
        print(f"  Supporting Chunk (France) Recovery : {c2_rec:.4f}")
        print(f"  Distractor Chunk 1 (Germany)       : {c1_rec:.4f}")
        print(f"  Distractor Chunk 3 (Italy)         : {c3_rec:.4f}")

        if c2_rec > c1_rec and c2_rec > c3_rec:
            print("  >> PASS: Chunk 2 clean activations successfully restored the target token.")
        else:
            print("  >> FAIL: Supporting chunk failed to demonstrate dominant causal restoration.")
            passed = False

    print("\n" + "=" * 78)
    if passed:
        print("OVERALL RESULT: PASS - Causal RAG attribution successfully demonstrated.")
        return 0
    else:
        print("OVERALL RESULT: FAIL - See metrics above.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
