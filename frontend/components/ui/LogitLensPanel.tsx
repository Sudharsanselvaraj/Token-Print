"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

function tokenBg(tokenId: number, prob: number): string {
  // Deterministic hue from token id
  const hue = ((tokenId * 137508) % 360) / 360;
  const lightness = 30 + prob * 40;
  return `oklch(${lightness}% 0.12 ${hue}turn)`;
}

export default function LogitLensPanel() {
  const data = useStore((s) => s.data);
  const [collapsed, setCollapsed] = useState(true);

  if (!data?.logit_lens?.length) return null;

  const { logit_lens, tokens } = data;
  const numPositions = logit_lens[0].length;

  if (collapsed) {
    return (
      <div className="logit-lens-panel-collapsed">
        <button
          className="ll-toggle-btn"
          onClick={() => setCollapsed(false)}
          title="Expand Logit Lens (layer × position predictions)"
        >
          <span>📊 Show Logit Lens</span>
          <span className="ll-badge">{logit_lens.length} layers</span>
        </button>
      </div>
    );
  }

  return (
    <div className="logit-lens-panel">
      <div className="ll-header-bar">
        <div>
          <div className="ll-title">Logit Lens</div>
          <div className="ll-subtitle">
            Top-1 predicted token at each layer × position
          </div>
        </div>
        <button
          className="ll-close-btn"
          onClick={() => setCollapsed(true)}
          title="Minimize Logit Lens view to reveal full 3D canvas"
        >
          ✕ Hide
        </button>
      </div>
      <div className="ll-grid" style={{ "--cols": numPositions } as React.CSSProperties}>
        <div className="ll-row ll-header">
          <div className="ll-layer-label">L</div>
          {tokens.map((t, i) => (
            <div key={i} className="ll-cell ll-pos-label" title={t.text}>
              {t.text.length > 6 ? t.text.slice(0, 5) + "…" : t.text}
            </div>
          ))}
        </div>
        {logit_lens.map((layer, li) => (
          <div key={li} className="ll-row">
            <div className="ll-layer-label">{li}</div>
            {layer.map((pos, pi) => {
              const top = pos[0];
              return (
                <div
                  key={pi}
                  className="ll-cell"
                  style={{
                    background: top
                      ? tokenBg(top.token_id, top.prob)
                      : undefined,
                  }}
                  title={
                    top
                      ? `${top.text} (p=${(top.prob * 100).toFixed(1)}%)`
                      : "—"
                  }
                >
                  <span className="ll-token">
                    {top ? (top.text.length > 4 ? top.text.slice(0, 3) + "…" : top.text) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
