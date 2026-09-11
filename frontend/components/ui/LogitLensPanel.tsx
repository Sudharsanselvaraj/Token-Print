"use client";

import { useStore } from "@/lib/store";
import type { LogitLensEntry } from "@/lib/types";

function tokenBg(tokenId: number, prob: number): string {
  // Deterministic hue from token id
  const hue = ((tokenId * 137508) % 360) / 360;
  const lightness = 30 + prob * 40;
  return `oklch(${lightness}% 0.12 ${hue}turn)`;
}

export default function LogitLensPanel() {
  const data = useStore((s) => s.data);

  if (!data?.logit_lens?.length) return null;

  const { logit_lens, tokens } = data;
  const numPositions = logit_lens[0].length;

  return (
    <div className="logit-lens-panel">
      <div className="ll-title">Logit Lens</div>
      <div className="ll-subtitle">
        Top-1 predicted token at each layer × position
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
