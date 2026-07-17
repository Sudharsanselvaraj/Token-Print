"use client";

import { useStore } from "@/lib/store";
import type { District } from "@/lib/types";

const ITEMS: { id: District; label: string; hint: string }[] = [
  { id: "tokenizer", label: "Tokenizer", hint: "raw text → tokens" },
  { id: "embedding", label: "Embedding", hint: "PCA of hidden states" },
  { id: "attention", label: "Attention", hint: "per-head beams" },
  { id: "generation", label: "Generation", hint: "stream + probabilities" },
];

export default function DistrictNav() {
  const current = useStore((s) => s.currentDistrict);
  const setDistrict = useStore((s) => s.setDistrict);

  return (
    <div className="panel nav">
      {ITEMS.map((it, i) => (
        <button
          key={it.id}
          className={"nav-btn" + (current === it.id ? " active" : "")}
          onClick={() => setDistrict(it.id)}
        >
          <span className="nav-index">{i + 1}</span>
          <span className="nav-text">
            <span className="nav-label">{it.label}</span>
            <span className="nav-hint">{it.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
