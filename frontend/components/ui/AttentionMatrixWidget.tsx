"use client";

import React from "react";
import { useStore } from "@/lib/store";
import PanelState from "./PanelState";

export function AttentionMatrixWidget() {
  const data = useStore((s) => s.data);
  const arch = useStore((s) => s.arch);
  const selectedLayer = useStore((s) => s.selectedLayer);
  const setLayer = useStore((s) => s.setLayer);
  const selectedHead = useStore((s) => s.selectedHead);
  const setHead = useStore((s) => s.setHead);
  const loading = useStore((s) => s.loading);

  if (loading) {
    return (
      <div className="rp-section">
        <PanelState kind="loading" title="Loading attention" message="Waiting for the model analysis to finish." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rp-section">
        <PanelState kind="empty" title="No attention data" message="Run an analysis to inspect attention weights by layer and head." />
      </div>
    );
  }

  const attentionCapability =
    data.capabilities && "supports_attention" in data.capabilities
      ? data.capabilities.supports_attention
      : null;
  const attnMatrix = data.attention?.[selectedLayer]?.[selectedHead] || null;

  if (attentionCapability && !attentionCapability.supported) {
    return (
      <div className="rp-section">
        <PanelState kind="unsupported" title="Attention unavailable" message={attentionCapability.reason} />
      </div>
    );
  }

  if (!data.tokens?.length || !attnMatrix?.length) {
    return (
      <div className="rp-section">
        <PanelState kind="empty" title="No attention data" message="This analysis did not return an attention matrix for the selected layer and head." />
      </div>
    );
  }

  const m = arch?.metadata;
  const numLayers = m?.num_layers || data?.num_layers || 24;
  const numHeads = m?.num_heads || data?.num_heads || 14;
  const headDim = m?.head_dim || (m?.hidden_size ? Math.floor(m.hidden_size / numHeads) : 64);

  const tokens = data.tokens;

  return (
    <div className="rp-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="rp-section-title">ATTENTION MATRIX</span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--mono)", fontSize: "11px" }}>
          <button
            onClick={() => setLayer(Math.max(0, selectedLayer - 1))}
            style={{ background: "#0e0e13", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", padding: "1px 5px", borderRadius: "3px", cursor: "pointer" }}
          >
            &lt;
          </button>
          <span style={{ color: "#ffffff", fontWeight: "600" }}>L{selectedLayer} · H{selectedHead}</span>
          <button
            onClick={() => setLayer(Math.min(numLayers - 1, selectedLayer + 1))}
            style={{ background: "#0e0e13", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", padding: "1px 5px", borderRadius: "3px", cursor: "pointer" }}
          >
            &gt;
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748b", fontFamily: "var(--mono)" }}>
          <span>Shape: [5 × 5]</span>
          <span>Head Dim: {headDim}</span>
        </div>

        {/* Matrix Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "2px", textAlign: "center", fontSize: "9px", fontFamily: "var(--mono)", color: "#64748b", marginBottom: "2px" }}>
            {tokens.slice(0, 5).map((t, i) => (
              <span key={i}>{t.text}</span>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "2px", background: "#030305", padding: "4px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", aspectRatio: "1 / 1" }}>
            {tokens.map((rowTok, rIdx) =>
              tokens.map((colTok, cIdx) => {
                const weight = attnMatrix[rIdx]?.[cIdx] ?? 0;
                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    title={`${rowTok.text} → ${colTok.text}: ${weight.toFixed(4)}`}
                    style={{
                      backgroundColor: `rgba(255, 255, 255, ${Math.min(1.0, weight * 1.3)})`,
                      borderRadius: "2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9px",
                      fontFamily: "var(--mono)",
                      color: weight > 0.4 ? "#000000" : "#ffffff",
                    }}
                  >
                    {weight > 0.1 ? weight.toFixed(2) : ""}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
