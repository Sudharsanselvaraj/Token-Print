"use client";

import React from "react";
import { useStore } from "@/lib/store";

export function ResidualStreamWidget() {
  const data = useStore((s) => s.data);
  const arch = useStore((s) => s.arch);
  const selectedLayer = useStore((s) => s.selectedLayer);

  const m = arch?.metadata;
  const hiddenSize = m?.hidden_size || data?.hidden_size || 896;

  const tokens = data?.tokens || [
    { index: 0, text: "Name", piece: "Name", id: 2437, is_special: false },
    { index: 1, text: "one", piece: "one", id: 284, is_special: false },
    { index: 2, text: "primary", piece: "primary", id: 4331, is_special: false },
    { index: 3, text: "color", piece: "color", id: 16326, is_special: false },
    { index: 4, text: ".", piece: ".", id: 2456, is_special: false },
  ];

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
