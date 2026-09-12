"use client";

import React, { useState } from "react";
import { CITATIONS, Citation } from "@/lib/citations";

export interface ConceptInfo {
  id: string;
  title: string;
  badge: string;
  citation?: Citation;
  pages: {
    heading: string;
    body: string;
    formula?: string;
  }[];
}

export const CONCEPT_CATALOG: Record<string, ConceptInfo> = {
  rmsnorm: {
    id: "rmsnorm",
    title: "RMSNorm Collar",
    badge: "NORMALIZATION",
    citation: CITATIONS.rmsnorm,
    pages: [
      {
        heading: "Variance Scaling Collar",
        body: "Root Mean Square Normalization scales hidden feature magnitudes without subtracting the mean. The collar ring represents the learnable scale gain parameter (γ).",
        formula: "RMSNorm(x) = (x / √(mean(x²) + ε)) ⊙ γ",
      },
      {
        heading: "Why RMSNorm over LayerNorm?",
        body: "RMSNorm reduces computation by 10-50% compared to standard LayerNorm while preserving stability across deep transformer stacks.",
      },
    ],
  },
  rope: {
    id: "rope",
    title: "RoPE Helical Twist",
    badge: "POSITIONAL ENCODING",
    citation: CITATIONS.rope,
    pages: [
      {
        heading: "Rotary Position Embedding",
        body: "Rotates Query and Key vectors in 2D planes using complex angle rotation matrices. Relative distance between tokens is preserved naturally in the inner product.",
        formula: "q_m = R_m Q_m,  k_n = R_n K_n",
      },
      {
        heading: "Long Context Extrapolation",
        body: "Because rotation operates as a continuous frequency spiral, models can generalize across sequences of 32,768+ tokens.",
      },
    ],
  },
  swiglu: {
    id: "swiglu",
    title: "SwiGLU Gated Prongs",
    badge: "FEED-FORWARD NETWORK",
    citation: CITATIONS.swiglu,
    pages: [
      {
        heading: "Gated Linear Units",
        body: "SwiGLU uses twin input prongs (Gate and Up projections). Gate passes through a SiLU activation before element-wise multiplying with the Up prong.",
        formula: "SwiGLU(x) = (SiLU(x W_gate) ⊙ (x W_up)) W_down",
      },
      {
        heading: "Expanded Capacity",
        body: "SwiGLU provides higher expressivity per parameter than traditional ReLU/GELU MLPs, expanding intermediate dimension from hidden (896) to FFN (4,864).",
      },
    ],
  },
  gqa: {
    id: "gqa",
    title: "Grouped-Query Attention (GQA)",
    badge: "ATTENTION ARCHITECTURE",
    citation: CITATIONS.gqa,
    pages: [
      {
        heading: "Query & KV Head Grouping",
        body: "Multiple Query heads share a single Key/Value head pair (e.g. 14 Query heads sharing 2 KV head groups in Qwen2.5-0.5B).",
        formula: "14 Q Heads : 2 KV Heads (7:1 Ratio)",
      },
      {
        heading: "Memory Efficiency",
        body: "GQA dramatically lowers KV-cache memory bandwidth during generation while retaining full multi-head performance.",
      },
    ],
  },
  kvcache: {
    id: "kvcache",
    title: "KV-Cache Volume",
    badge: "SPATIAL MEMORY",
    citation: CITATIONS.transformer,
    pages: [
      {
        heading: "Spatial Key-Value Memory",
        body: "Stores previously computed Key and Value matrices for prior tokens. Step 0 (Pre-fill) builds the cache; subsequent Decode steps compute only 1 new position.",
        formula: "Memory = 2 × n_layers × n_kv_heads × head_dim × seq_len",
      },
      {
        heading: "Pre-fill vs Decode",
        body: "Pre-fill computes all prompt tokens in parallel. Decode reuses cached positions, executing 10x faster per token.",
      },
    ],
  },
  residual: {
    id: "residual",
    title: "Residual Stream Highway",
    badge: "MAIN BACKBONE",
    citation: CITATIONS.transformer,
    pages: [
      {
        heading: "Continuous Residual Backbone",
        body: "The central spine of the transformer. Each layer branches to compute attention and MLP updates, adding results back into the highway.",
        formula: "x_{l+1} = x_l + Attn(RMSNorm(x_l)) + MLP(RMSNorm(x_{l+1}'))",
      },
      {
        heading: "Information Flow",
        body: "Allows gradients and token representations to flow directly through all 24 layers without vanishing or exploding.",
      },
    ],
  },
};

interface ConceptPopupProps {
  conceptId: string | null;
  onClose: () => void;
}

export function ConceptPopup({ conceptId, onClose }: ConceptPopupProps) {
  const [pageIdx, setPageIdx] = useState(0);

  if (!conceptId || !CONCEPT_CATALOG[conceptId]) return null;

  const concept = CONCEPT_CATALOG[conceptId];
  const page = concept.pages[pageIdx] || concept.pages[0];
  const totalPages = concept.pages.length;
  const citation = concept.citation;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-84 rounded-xl border border-neutral-700 bg-neutral-950/95 p-4 shadow-2xl backdrop-blur-md text-xs text-neutral-200 animate-in fade-in zoom-in duration-200">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
        <span className="rounded bg-neutral-900 px-2 py-0.5 font-semibold text-[10px] text-neutral-200 border border-neutral-700 uppercase">
          {concept.badge}
        </span>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white transition-colors font-bold px-1"
        >
          ✕
        </button>
      </div>

      <div className="font-bold text-white text-sm mb-1">{concept.title}</div>
      <div className="font-semibold text-neutral-300 text-xs mb-2">{page.heading}</div>

      <p className="text-neutral-300 leading-relaxed text-[11px] mb-3">{page.body}</p>

      {page.formula && (
        <div className="mb-3 rounded bg-black p-2 font-mono text-[10px] text-white border border-neutral-800 text-center">
          {page.formula}
        </div>
      )}

      {citation && (
        <div className="mb-3 rounded bg-neutral-900/80 p-2 text-[10px] text-neutral-300 border border-neutral-800">
          <div>
            <strong className="text-white">Paper Ref:</strong>{" "}
            <a
              href={citation.url}
              target="_blank"
              rel="noreferrer"
              className="text-white underline hover:text-neutral-300 font-medium"
            >
              "{citation.title}"
            </a>{" "}
            ({citation.year})
          </div>
          <div className="text-[9px] text-neutral-400 italic mt-1">"{citation.why}"</div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-neutral-800 pt-2 text-[10px] text-neutral-400">
        <span>
          Page {pageIdx + 1} of {totalPages}
        </span>
        <div className="flex gap-1">
          <button
            disabled={pageIdx === 0}
            onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
            className="rounded bg-neutral-800 px-2 py-0.5 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white"
          >
            Prev
          </button>
          <button
            disabled={pageIdx >= totalPages - 1}
            onClick={() => setPageIdx((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded bg-white px-2 py-0.5 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-black font-semibold"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
