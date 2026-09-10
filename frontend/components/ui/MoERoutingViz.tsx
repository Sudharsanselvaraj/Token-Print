"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { MoERouting, MoELayerRouting } from "@/lib/types";

/**
 * MoE routing visualization (issue #83). When the loaded model has
 * mixture-of-experts blocks, the backend captures real router logits during
 * the forward pass and returns them in `data.moe_routing`. Each layer renders
 * its expert lanes and the top-k experts light up per token.
 *
 * For non-MoE models (the default Qwen), we show a clearly-labelled DEMO view
 * derived deterministically from the real attention weights, so the visual is
 * present but never misrepresents itself as real routing data.
 */
export default function MoERoutingViz() {
  const data = useStore((s) => s.data);
  const [tokenIdx, setTokenIdx] = useState(-1);

  const nTokens = data?.tokens?.length ?? 0;
  const curToken = tokenIdx < 0 ? Math.max(0, nTokens - 1) : tokenIdx;

  const realRouting: MoERouting | null = data?.moe_routing ?? null;

  // Demo fallback: deterministic synthetic routing shaped like the real data.
  const demoRouting: MoERouting | null = useMemo(() => {
    if (realRouting) return null;
    if (!data?.attention || !data.num_layers) return null;
    const nMoELayers = Math.min(data.num_layers, 6);
    const nExperts = 8;
    const used = 2;
    const per_layer: MoELayerRouting[] = [];
    for (let l = 0; l < nMoELayers; l++) {
      const layerIdx = Math.round((l / Math.max(nMoELayers - 1, 1)) * (data.num_layers - 1));
      const routing = [];
      for (let t = 0; t < nTokens; t++) {
        // Derive per-token expert weights from real attention rows + position
        // so the demo correlates with the actual sentence — but stays a demo.
        const attnRow = data.attention[layerIdx]?.[0]?.[t] ?? [];
        const base = attnRow.length
          ? attnRow.reduce((a, b) => a + b, 0) / attnRow.length
          : 0.5 + (t % 3) * 0.1;
        const weights: { idx: number; weight: number }[] = [];
        for (let e = 0; e < nExperts; e++) {
          const w = Math.abs(Math.sin((t + 1) * (e + 2) * 1.7 + base * 9));
          weights.push({ idx: e, weight: Math.max(w * 0.55, 0.001) });
        }
        weights.sort((a, b) => b.weight - a.weight);
        const total = weights.slice(0, used).reduce((a, b) => a + b.weight, 0) || 1;
        const experts = weights
          .slice(0, used)
          .map((w) => ({ idx: w.idx, weight: Math.round((w.weight / total) * 1000) / 1000 }));
        routing.push({ token: t, experts });
      }
      per_layer.push({ layer: layerIdx, n_experts: nExperts, used, routing });
    }
    return { per_layer };
  }, [realRouting, data, nTokens]);

  const routing = realRouting ?? demoRouting;
  const isDemo = !realRouting && !!demoRouting;

  if (!data || !routing) {
    return (
      <div className="moe-viz">
        <div className="mv-title">MoE Routing</div>
        <div className="mv-empty">Run an analysis first to see expert routing.</div>
      </div>
    );
  }

  return (
    <div className="moe-viz">
      <div className="mv-title">
        MoE Routing
        {isDemo && (
          <span className="mv-demo" title="This model has no MoE blocks; expert weights are simulated from real attention data.">
            demo (non-MoE model)
          </span>
        )}
        {realRouting && <span className="mv-real">real router logits</span>}
      </div>

      <div className="mv-tokenbar">
        <button
          className="chip-btn"
          disabled={curToken <= 0}
          onClick={() => setTokenIdx(curToken - 1)}
        >
          ‹
        </button>
        <span className="mv-tok">
          token {curToken} <i>“{data.tokens[curToken]?.text ?? "—”"}”</i>
        </span>
        <button
          className="chip-btn"
          disabled={curToken >= nTokens - 1}
          onClick={() => setTokenIdx(curToken + 1)}
        >
          ›
        </button>
      </div>

      {routing.per_layer.map((pl) => (
        <div key={pl.layer} className="mv-layer">
          <div className="mv-layer-label">
            L{pl.layer}
            <span className="mv-expert-count">
              {pl.n_experts} experts · top {pl.used}
            </span>
          </div>
          <div className="mv-lanes">
            {Array.from({ length: pl.n_experts }).map((_, e) => {
              const entry = pl.routing[curToken];
              const active = entry?.experts.find((x) => x.idx === e);
              const weight = active?.weight ?? 0;
              const isTop1 =
                entry?.experts[0]?.idx === e && entry.experts.length > 1;
              return (
                <div
                  key={e}
                  className={
                    "mv-lane" +
                    (active ? " active" : "") +
                    (isTop1 ? " top1" : "")
                  }
                  style={{ "--mv-w": `${Math.max(weight * 100, 3)}%` } as React.CSSProperties}
                  title={`expert ${e} · weight ${weight.toFixed(3)}`}
                >
                  <span className="mv-lane-num">{e}</span>
                  <span className="mv-lane-bar" />
                  <span className="mv-lane-w">{weight.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}