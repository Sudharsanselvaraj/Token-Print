"use client";

import React from "react";
import { useStore } from "@/lib/store";

export function LogitLensWidget() {
  const data = useStore((s) => s.data);
  const selectedLayer = useStore((s) => s.selectedLayer);
  const selectedTokenIndex = useStore((s) => s.selectedTokenIndex);

  const tokens = data?.tokens || [
    { index: 0, text: "Name", piece: "Name", id: 2437, is_special: false },
    { index: 1, text: "one", piece: "one", id: 284, is_special: false },
    { index: 2, text: "primary", piece: "primary", id: 4331, is_special: false },
    { index: 3, text: "color", piece: "color", id: 16326, is_special: false },
    { index: 4, text: ".", piece: ".", id: 2456, is_special: false },
  ];

  // Extract real logit lens data for selected layer & token if available
  const rawLogitLens = data?.logit_lens?.[selectedLayer]?.[selectedTokenIndex];

  const topPredictions = rawLogitLens
    ? rawLogitLens.map((item: any) => ({
        token: item.text,
        logit: item.prob ? (item.prob * 10).toFixed(2) : "6.50",
        prob: item.prob ?? 0.2,
      }))
    : [
        { token: "color", logit: "8.42", prob: 0.45 },
        { token: "colour", logit: "6.11", prob: 0.22 },
        { token: "Color", logit: "5.78", prob: 0.15 },
        { token: "colors", logit: "5.21", prob: 0.10 },
        { token: "background", logit: "4.12", prob: 0.05 },
      ];

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
