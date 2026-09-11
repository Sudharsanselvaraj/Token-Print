"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";

export default function HeadGrid() {
  const data = useStore((s) => s.data);
  const nLayers = data?.num_layers ?? 0;
  const setLayer = useStore((s) => s.setLayer);
  const setHead = useStore((s) => s.setHead);
  const [viewLayer, setViewLayer] = useState(0);

  // Compute head-head similarity matrix for the selected layer from attention data.
  const matrix = useMemo(() => {
    if (!data?.attention || !data.attention[viewLayer]) return null;
    const layerAttn = data.attention[viewLayer]; // [heads, q_pos, k_pos]
    if (!layerAttn?.length) return null;
    const nq = layerAttn[0]?.length ?? 0;
    const nk = layerAttn[0]?.[0]?.length ?? 0;
    // Flatten each head's attention pattern and compute cosine similarity.
    const flat = layerAttn.map((h) => {
      const arr = new Float32Array(nq * nk);
      let idx = 0;
      for (let i = 0; i < nq; i++)
        for (let j = 0; j < nk; j++)
          arr[idx++] = h[i]?.[j] ?? 0;
      return arr;
    });
    const nh = flat.length;
    const sim: number[][] = Array.from({ length: nh }, () => Array(nh).fill(0));
    for (let i = 0; i < nh; i++) {
      for (let j = 0; j < nh; j++) {
        let dot = 0, ni = 0, nj = 0;
        for (let k = 0; k < flat[i].length; k++) {
          dot += flat[i][k] * flat[j][k];
          ni += flat[i][k] * flat[i][k];
          nj += flat[j][k] * flat[j][k];
        }
        const denom = Math.sqrt(ni) * Math.sqrt(nj);
        sim[i][j] = denom > 1e-10 ? dot / denom : 0;
      }
    }
    return sim;
  }, [data, viewLayer]);

  if (!data) return null;

  return (
    <div className="head-grid">
      <div className="hg-title">Head × Head Similarity</div>
      <div className="hg-layer-select">
        <span>Layer:</span>
        <select value={viewLayer} onChange={(e) => setViewLayer(Number(e.target.value))}>
          {Array.from({ length: nLayers }, (_, i) => (
            <option key={i} value={i}>L{i}</option>
          ))}
        </select>
      </div>
      {matrix ? (
        <div className="hg-grid">
          {matrix.map((row, i) =>
            row.map((val, j) => {
              // Normalize 0-1 for coloring: blue-white-red
              const t = (val + 1) / 2;
              const r = Math.round(255 * (1 - t));
              const g = Math.round(255 * (1 - Math.abs(t - 0.5) * 2));
              const b = Math.round(255 * t);
              return (
                <div
                  key={`${i}-${j}`}
                  className="hg-cell"
                  style={{ background: `rgb(${r},${g},${b})` }}
                  onClick={() => { setLayer(viewLayer); setHead(i); }}
                  title={`H${i}×H${j} sim=${val.toFixed(3)}`}
                />
              );
            })
          )}
        </div>
      ) : (
        <div className="hg-empty">Run an analysis first to see attention patterns.</div>
      )}
      <div className="hg-legend">
        <span>−1</span><div className="legend-bar hg-lb" /><span>+1</span>
      </div>
    </div>
  );
}
