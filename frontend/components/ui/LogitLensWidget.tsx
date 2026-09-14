"use client";

import React from "react";
import { useStore } from "@/lib/store";
import PanelState from "./PanelState";

export function LogitLensWidget() {
  const data = useStore((s) => s.data);
  const selectedLayer = useStore((s) => s.selectedLayer);
  const selectedTokenIndex = useStore((s) => s.selectedTokenIndex);
  const loading = useStore((s) => s.loading);

  if (loading) {
    return (
      <div className="rp-section" style={{ borderBottom: "none" }}>
        <PanelState kind="loading" title="Loading predictions" message="Waiting for the model analysis to finish." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rp-section" style={{ borderBottom: "none" }}>
        <PanelState kind="empty" title="No logit lens data" message="Run an analysis to inspect the model's top predictions at each layer." />
      </div>
    );
  }

  const logitLensCapability =
    data.capabilities && "supports_logit_lens" in data.capabilities
      ? data.capabilities.supports_logit_lens
      : null;
  const rawLogitLens = data.logit_lens?.[selectedLayer]?.[selectedTokenIndex];

  if (logitLensCapability && !logitLensCapability.supported) {
    return (
      <div className="rp-section" style={{ borderBottom: "none" }}>
        <PanelState kind="unsupported" title="Logit lens unavailable" message={logitLensCapability.reason} />
      </div>
    );
  }

  if (!data.tokens?.length || !rawLogitLens?.length) {
    return (
      <div className="rp-section" style={{ borderBottom: "none" }}>
        <PanelState kind="empty" title="No prediction data" message="This analysis did not return logit lens predictions for the selected layer and token." />
      </div>
    );
  }

  const tokens = data.tokens;

  const topPredictions = rawLogitLens.map((item) => ({
    token: item.text,
    logit: item.prob ? (item.prob * 10).toFixed(2) : "0.00",
    prob: item.prob ?? 0,
  }));

  return (
    <div className="rp-section" style={{ borderBottom: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="rp-section-title">LOGIT LENS PREDICTIONS</span>
        <span style={{ fontSize: "10px", color: "#ffffff", fontWeight: "600", fontFamily: "var(--mono)" }}>
          L{selectedLayer} · "{tokens[selectedTokenIndex]?.text || "Token"}"
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "6px", fontFamily: "var(--mono)", fontSize: "11px" }}>
        {topPredictions.slice(0, 5).map((pred, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "12px", color: "#64748b", fontSize: "10px" }}>{idx + 1}</span>
            <span style={{ width: "65px", color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pred.token}</span>
            <div style={{ flex: 1, height: "4px", background: "#030305", borderRadius: "2px", overflow: "hidden" }}>
              <div
                style={{ width: `${Math.min(100, Math.max(10, pred.prob * 100))}%`, height: "100%", background: "#ffffff" }}
              />
            </div>
            <span style={{ width: "35px", textAlign: "right", color: "#94a3b8", fontSize: "10px" }}>{pred.logit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
