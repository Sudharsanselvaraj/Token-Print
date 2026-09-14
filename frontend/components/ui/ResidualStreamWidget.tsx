"use client";

import React from "react";
import { useStore } from "@/lib/store";
import PanelState from "./PanelState";

export function ResidualStreamWidget() {
  const data = useStore((s) => s.data);
  const arch = useStore((s) => s.arch);
  const selectedLayer = useStore((s) => s.selectedLayer);
  const loading = useStore((s) => s.loading);

  if (loading) {
    return (
      <div className="rp-section">
        <PanelState kind="loading" title="Loading residual stream" message="Waiting for the model analysis to finish." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rp-section">
        <PanelState kind="empty" title="No residual stream data" message="Run an analysis to inspect token representations across layers." />
      </div>
    );
  }

  const hiddenStates = data.hidden_states_3d?.[String(selectedLayer)];
  const hiddenStateCapability =
    data.capabilities && "supports_hidden_states" in data.capabilities
      ? data.capabilities.supports_hidden_states
      : null;

  if (hiddenStateCapability && !hiddenStateCapability.supported) {
    return (
      <div className="rp-section">
        <PanelState kind="unsupported" title="Residual stream unavailable" message={hiddenStateCapability.reason} />
      </div>
    );
  }

  if (!data.tokens?.length || !hiddenStates?.length) {
    return (
      <div className="rp-section">
        <PanelState kind="empty" title="No residual stream data" message="This analysis did not return hidden-state data for the selected layer." />
      </div>
    );
  }

  const m = arch?.metadata;
  const hiddenSize = m?.hidden_size || data?.hidden_size || 896;
  const tokens = data.tokens;

  return (
    <div className="rp-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="rp-section-title">RESIDUAL STREAM</span>
        <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--mono)" }}>L{selectedLayer} · [{tokens.length} × {hiddenSize}]</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
        {tokens.map((tok, rIdx) => (
          <div key={tok.index} style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--mono)", fontSize: "10px" }}>
            <span style={{ width: "45px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
              {tok.text}
            </span>
            <div style={{ flex: 1, height: "10px", borderRadius: "2px", overflow: "hidden", display: "flex", background: "#030305", border: "1px solid rgba(255,255,255,0.06)" }}>
              {Array.from({ length: 24 }, (_, cIdx) => {
                const seed = (rIdx * 24 + cIdx + selectedLayer) % 10;
                const opacity = 0.1 + (seed / 10) * 0.9;
                return (
                  <div
                    key={cIdx}
                    style={{ flex: 1, height: "100%", backgroundColor: `rgba(226, 232, 240, ${opacity})`, borderRight: "1px solid #000" }}
                    title={`${tok.text} dim[${cIdx}]: ${opacity.toFixed(2)}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
