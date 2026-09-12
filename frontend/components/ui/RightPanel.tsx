"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { fmtCount, fmtShape } from "@/lib/format";
import GenerationPanel from "./GenerationPanel";
import { AttentionMatrixWidget } from "./AttentionMatrixWidget";
import { ResidualStreamWidget } from "./ResidualStreamWidget";
import { LogitLensWidget } from "./LogitLensWidget";
import DataProvenanceBadge from "./DataProvenanceBadge";
import ComponentInspectorPanel from "./ComponentInspectorPanel";

function valueNote(dtype: string): string {
  return /^(F32|F16|BF16|float)/i.test(dtype)
    ? "Float tensor • real values inspectable"
    : `Quantized (${dtype}) • values require dequantization`;
}

interface RightPanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function RightPanel({ collapsed, onToggleCollapse }: RightPanelProps) {
  const mode = useStore((s) => s.mode);
  const arch = useStore((s) => s.arch);
  const data = useStore((s) => s.data);
  const selName = useStore((s) => s.selectedTensor);
  const hovName = useStore((s) => s.hoveredTensor);
  const expandedBlockId = useStore((s) => s.expandedBlockId);
  const selectedLayer = useStore((s) => s.selectedLayer);
  const inspectingComponentId = useStore((s) => s.inspectingComponentId);

  if (collapsed) {
    return (
      <div className="right-panel-collapsed">
        <button
          onClick={onToggleCollapse}
          className="sidebar-toggle-btn"
          title="Expand Inspector (Ctrl+])"
        >
          <span>&lt;</span>
        </button>
      </div>
    );
  }

  const arch3dOpId = useStore((s) => s.arch3dOpId);
  const activeComponentId = inspectingComponentId || arch3dOpId;

  if (activeComponentId) {
    return (
      <aside className="rightpanel rp-inspector">
        <ComponentInspectorPanel />
      </aside>
    );
  }

  if (mode === "generation") return <GenerationPanel />;

  const targetName = selName || hovName;
  const t = targetName ? arch?.tensors.find((x) => x.name === targetName) : null;
  const backend = data?.provenance?.backend || "hf_local";

  // Derive mathematical context for selected block
  const getOpFormula = (id: string | null) => {
    if (!id) return null;
    const lower = id.toLowerCase();
    if (lower.includes("q_proj")) return { title: "Q PROJECTION", formula: "x → xW_q", inDim: "896", outDim: "14 × 64" };
    if (lower.includes("k_proj")) return { title: "K PROJECTION", formula: "x → xW_k", inDim: "896", outDim: "2 × 64" };
    if (lower.includes("v_proj")) return { title: "V PROJECTION", formula: "x → xW_v", inDim: "896", outDim: "2 × 64" };
    if (lower.includes("o_proj")) return { title: "O PROJECTION", formula: "x → xW_o", inDim: "14 × 64", outDim: "896" };
    if (lower.includes("rope")) return { title: "ROTARY EMBEDDING", formula: "RoPE(q, k, pos)", inDim: "64", outDim: "64" };
    if (lower.includes("gate")) return { title: "GATE PROJECTION", formula: "x → Swish(xW_gate)", inDim: "896", outDim: "4864" };
    if (lower.includes("up")) return { title: "UP PROJECTION", formula: "x → xW_up", inDim: "896", outDim: "4864" };
    if (lower.includes("swiglu")) return { title: "SWIGLU MERGE", formula: "Gate ⊙ Up", inDim: "4864", outDim: "4864" };
    if (lower.includes("down")) return { title: "DOWN PROJECTION", formula: "x → xW_down", inDim: "4864", outDim: "896" };
    if (lower.includes("norm")) return { title: "RMSNORM", formula: "RMSNorm(x, ε) × γ", inDim: "896", outDim: "896" };
    return null;
  };

  const opCtx = getOpFormula(expandedBlockId || targetName);

  return (
    <aside className="rightpanel rp-inspector">
      {/* HEADER & TOGGLE */}
      <div className="rp-header">
        <span className="rp-header-title">INSPECTOR</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <DataProvenanceBadge origin="real" label="REAL" />
          <button
            onClick={onToggleCollapse}
            className="sidebar-toggle-btn"
            title="Collapse Inspector"
          >
            <span>&gt;</span>
          </button>
        </div>
      </div>

      {/* OPERATION CONTEXT (If 3D object / node selected) */}
      {opCtx && (
        <div className="rp-section op-context-box">
          <div className="op-ctx-header">
            <span className="op-ctx-title">{opCtx.title}</span>
            <span className="op-ctx-formula">{opCtx.formula}</span>
          </div>
          <div className="op-spec-grid">
            <div className="op-spec-item">
              <span className="op-spec-label">INPUT</span>
              <span className="op-spec-val">{opCtx.inDim}</span>
            </div>
            <div className="op-spec-item">
              <span className="op-spec-label">OUTPUT</span>
              <span className="op-spec-val">{opCtx.outDim}</span>
            </div>
            <div className="op-spec-item">
              <span className="op-spec-label">LAYER</span>
              <span className="op-spec-val">L{selectedLayer}</span>
            </div>
          </div>
        </div>
      )}

      {/* TENSOR INSPECTOR */}
      <div className="rp-section">
        <div className="rp-section-header">
          <span className="rp-section-title">TENSOR INSPECTOR</span>
        </div>

        {t ? (
          <div className="tensor-details-box">
            <div className="tensor-name-display">{t.name}</div>

            <div className="spec-grid tensor-specs">
              <div className="spec-item">
                <span className="spec-key">SHAPE</span>
                <span className="spec-val accent">{fmtShape(t.shape)}</span>
              </div>
              <div className="spec-item">
                <span className="spec-key">DTYPE</span>
                <span className="spec-val">{t.dtype}</span>
              </div>
              <div className="spec-item">
                <span className="spec-key">PARAMS</span>
                <span className="spec-val">{fmtCount(t.n_params)}</span>
              </div>
              <div className="spec-item">
                <span className="spec-key">LAYER</span>
                <span className="spec-val">{t.layer ?? "Global"}</span>
              </div>
              <div className="spec-item">
                <span className="spec-key">BACKEND</span>
                <span className="spec-val">{backend}</span>
              </div>
            </div>

            <div className="tensor-value-note">
              {valueNote(t.dtype)}
            </div>
          </div>
        ) : (
          <div className="rp-empty-hint">
            Select any tensor or 3D operational node in the central computational graph to inspect properties.
          </div>
        )}
      </div>

      {/* SCIENTIFIC INSPECTION WIDGETS */}
      <div className="rp-section">
        <AttentionMatrixWidget />
      </div>

      <div className="rp-section">
        <ResidualStreamWidget />
      </div>

      <div className="rp-section">
        <LogitLensWidget />
      </div>
    </aside>
  );
}
