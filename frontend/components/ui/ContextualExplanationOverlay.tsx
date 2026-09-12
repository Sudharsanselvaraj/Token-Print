"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { fmtShape, fmtCount } from "@/lib/format";
import { kindLabel } from "@/components/scenes/TransformerOperationGraph";
import { getCitationForOp } from "@/lib/citations";
import DataProvenanceBadge from "./DataProvenanceBadge";

/** Short explanation copy keyed by operation kind */
const OP_EXPLAIN: Record<string, { formula: string; body: string }> = {
  embedding: {
    formula: "x₀ = Embed(tokens) + RoPE(pos)",
    body: "Maps token IDs into vector space and adds rotary positional embeddings.",
  },
  norm1: {
    formula: "RMSNorm(x, ε=1e-6) × γ",
    body: "Normalizes hidden state before attention to stabilize gradient variance.",
  },
  attn_q: {
    formula: "Q = x · Wq",
    body: "Projects hidden state into query vectors — one per attention head.",
  },
  attn_k: {
    formula: "K = x · Wk",
    body: "Projects into key vectors. Qwen uses grouped-query attention (fewer K/V heads).",
  },
  attn_v: {
    formula: "V = x · Wv",
    body: "Projects into value vectors, storing what to retrieve from context.",
  },
  rope: {
    formula: "q,k = Rotate(q,k, θ·pos)",
    body: "Encodes relative position by rotating Q and K in complex space.",
  },
  attn_scores: {
    formula: "S = Q · Kᵀ",
    body: "Inner product between every query and key — measures relevance.",
  },
  attn_scale: {
    formula: "S / √d_k",
    body: "Prevents vanishingly small gradients by scaling scores.",
  },
  attn_mask: {
    formula: "mask(S, causal)",
    body: "Masks future positions so each token can only attend to its past.",
  },
  attn_softmax: {
    formula: "A = Softmax(S / √d_k)",
    body: "Converts raw scores to a probability distribution over positions.",
  },
  attn_weighted_v: {
    formula: "C = A · V",
    body: "Weighted sum of values — the actual content retrieved from context.",
  },
  attn_o: {
    formula: "o = C · Wo",
    body: "Projects concatenated head outputs back to model dimension.",
  },
  res_add1: {
    formula: "x = x + Attn(x)",
    body: "Residual connection — preserves original signal alongside attention output.",
  },
  norm2: {
    formula: "RMSNorm(x + Attn)",
    body: "Normalizes before MLP, same as Norm 1 but applied after attention.",
  },
  mlp_gate: {
    formula: "g = x · Wgate",
    body: "Gating branch of SwiGLU — controls which features to amplify.",
  },
  mlp_up: {
    formula: "u = x · Wup",
    body: "Upward projection — expands representation to the FFN intermediate size.",
  },
  swiglu: {
    formula: "h = SiLU(g) ⊙ u",
    body: "SwiGLU activation — gated element-wise product with smooth nonlinearity.",
  },
  mlp_down: {
    formula: "y = h · Wdown",
    body: "Projects back from FFN intermediate size to model dimension.",
  },
  res_add2: {
    formula: "x = x + MLP(x)",
    body: "Residual connection after MLP — completes one full transformer block.",
  },
  final_norm: {
    formula: "RMSNorm(x_final)",
    body: "Final normalization before the unembedding projection.",
  },
  lm_head: {
    formula: "logits = x · W_lm",
    body: "Unembedding — projects to vocabulary size for next-token probability.",
  },
};

export function ContextualExplanationOverlay() {
  const inspectingComponentId = useStore((s) => s.inspectingComponentId);
  const arch3dOpKind = useStore((s) => s.arch3dOpKind);
  const arch3dLayer  = useStore((s) => s.arch3dLayer);
  const selectedTensor = useStore((s) => s.selectedTensor);
  const arch = useStore((s) => s.arch);
  const [expanded, setExpanded] = useState(false);

  if (inspectingComponentId) return null;

  const m        = arch?.metadata;
  const numLayers = m?.num_layers || 24;
  const numHeads  = m?.num_heads  || 14;
  const kvHeads   = m?.num_kv_heads || 2;
  const hiddenSize = m?.hidden_size  || 896;
  const ffnSize   = m?.ffn_size     || 4864;
  const headDim   = Math.floor(hiddenSize / numHeads);
  const vocabSize = m?.vocab_size   || 151936;
  const archName  = m?.name || m?.architecture || "";

  const info  = OP_EXPLAIN[arch3dOpKind] ?? OP_EXPLAIN["embedding"];
  const label = kindLabel(arch3dOpKind as Parameters<typeof kindLabel>[0]);
  const layerStr = arch3dLayer >= 0 && arch3dLayer < numLayers ? ` · L${arch3dLayer}` : "";

  const citation = getCitationForOp(arch3dOpKind, archName, m);

  const selectedObj = selectedTensor
    ? arch?.tensors.find((t) => t.name === selectedTensor)
    : null;

  // Dimension string tailored by kind
  const dimStr = (() => {
    switch (arch3dOpKind) {
      case "attn_q":  return `${hiddenSize} → ${numHeads}×${headDim}`;
      case "attn_k":
      case "attn_v":  return `${hiddenSize} → ${kvHeads}×${headDim}`;
      case "attn_o":  return `${numHeads}×${headDim} → ${hiddenSize}`;
      case "mlp_gate":
      case "mlp_up":  return `${hiddenSize} → ${ffnSize}`;
      case "mlp_down":return `${ffnSize} → ${hiddenSize}`;
      case "lm_head": return `${hiddenSize} → ${vocabSize.toLocaleString()}`;
      default:        return `[${hiddenSize}]`;
    }
  })();

  return (
    <>
      <style>{`
        .ann-box {
          position: absolute; bottom: 94px; left: 14px;
          z-index: 58; width: 290px;
          background: rgba(12, 12, 14, 0.92);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 9px;
          padding: 10px 12px;
          backdrop-filter: blur(18px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.6);
          font-family: 'Inter', system-ui, sans-serif;
          pointer-events: auto;
        }
        .ann-top {
          display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;
        }
        .ann-title {
          font-size: 12px; font-weight: 700; color: #ffffff; line-height: 1.3;
        }
        .ann-layer {
          font-size: 11px; color: #a3a3a3; font-weight: 400;
        }
        .ann-formula {
          font-size: 11px; color: #ffffff; font-family: 'JetBrains Mono', monospace;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px;
          padding: 3px 6px; margin-bottom: 5px; display: block;
        }
        .ann-dim {
          font-size: 10px; color: #a3a3a3; margin-bottom: 4px;
        }
        .ann-body {
          font-size: 11px; color: #d4d4d4; line-height: 1.5;
          display: ${expanded ? "block" : "none"};
          margin-top: 6px; padding-top: 6px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        .ann-citation {
          margin-top: 6px; padding-top: 6px;
          border-top: 1px solid rgba(255,255,255,0.1);
          font-size: 10px; color: #a3a3a3;
        }
        .ann-citation-link {
          color: #ffffff; text-decoration: underline; text-underline-offset: 2px;
          font-weight: 600;
        }
        .ann-citation-link:hover { color: #d4d4d4; }
        .ann-why {
          font-size: 10px; color: #d4d4d4; margin-top: 3px; font-style: italic; line-height: 1.4;
        }
        .ann-meta {
          font-size: 10px; color: #a3a3a3; margin-top: 5px;
          border-top: 1px solid rgba(255,255,255,0.08); padding-top: 5px;
          display: flex; gap: 8px; flex-wrap: wrap;
          display: ${selectedObj ? "flex" : "none"};
        }
        .ann-expand {
          font-size: 10px; color: #a3a3a3; cursor: pointer;
          background: none; border: none; font-family: inherit;
          padding: 0; margin-top: 6px; transition: color 0.12s;
        }
        .ann-expand:hover { color: #ffffff; }
      `}</style>

      <div className="ann-box" role="complementary" aria-label="Current operation">
        <div className="ann-top">
          <div>
            <div className="ann-title">{label}</div>
            {layerStr && <div className="ann-layer">Layer {arch3dLayer}</div>}
          </div>
          {selectedObj && <DataProvenanceBadge origin="real" />}
        </div>

        <code className="ann-formula">{info.formula}</code>
        <div className="ann-dim">{dimStr}</div>

        {selectedObj && (
          <div className="ann-meta">
            <span>{fmtShape(selectedObj.shape)}</span>
            <span>{selectedObj.dtype}</span>
            <span>{fmtCount(selectedObj.n_params)}</span>
          </div>
        )}

        {expanded && (
          <div className="ann-body">
            <div>{info.body}</div>
            {citation && (
              <div className="ann-citation">
                <div>
                  <strong>Ref:</strong>{" "}
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ann-citation-link"
                  >
                    {citation.title}
                  </a>{" "}
                  ({citation.year})
                </div>
                <div className="ann-why">"{citation.why}"</div>
              </div>
            )}
          </div>
        )}

        <button
          className="ann-expand"
          onClick={() => setExpanded((e) => !e)}
          title={expanded ? "Show less" : "Show explanation & citation"}
        >
          {expanded ? "▲ Less" : "▼ What is this? (Paper Ref & Why)"}
        </button>
      </div>
    </>
  );
}
