"use client";

import { useStore } from "@/lib/store";
import { useMemo } from "react";

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

interface Verdict {
  label: string;
  confidence: number;
  color: string;
}

function getVerdicts(fp: number[]): Verdict[] {
  const T = fp.length;
  const total = fp.reduce((a, b) => a + b, 0);
  if (total === 0) return [{ label: "dead head", confidence: 1, color: "#666" }];
  const p = fp.map((v) => v / total);
  const mean = p.reduce((a, b) => a + b, 0) / T;
  const variance = p.reduce((a, b) => a + (b - mean) ** 2, 0) / T;
  const std = Math.sqrt(variance);
  const cv = mean === 0 ? 1 : std / mean;

  const out: Verdict[] = [];

  // uniform
  if (cv < 0.2) {
    out.push({ label: "uniform", confidence: Math.round((1 - cv / 0.2) * 100) / 100, color: "#888" });
    return out;
  }

  // dead head (all near zero)
  if (fp.every((v) => v < 0.01)) {
    return [{ label: "dead head", confidence: 1, color: "#666" }];
  }

  // normalise fingerprint to probability
  const norm = p;

  // find peaks (above mean + 1 std)
  const threshold = mean + std;
  const peaks = norm.map((v, i) => ({ v, i })).filter((x) => x.v > threshold);
  peaks.sort((a, b) => b.v - a.v);

  // single dominant peak
  if (peaks.length === 1) {
    const idx = peaks[0].i;
    const conf = Math.round((peaks[0].v - mean) * 10) / 10;
    if (idx === 0 && peaks[0].v > 0.35) {
      out.push({ label: "BOS / first-token sink", confidence: Math.min(1, conf), color: "#e06" });
    } else if (idx === T - 1 && peaks[0].v > 0.35) {
      out.push({ label: "last-token focus", confidence: Math.min(1, conf), color: "#d60" });
    } else if (peaks[0].v > 0.5) {
      out.push({ label: `pos-${idx} specialist`, confidence: Math.min(1, conf), color: "#c80" });
    } else {
      out.push({ label: `biased to pos-${idx}`, confidence: Math.min(1, conf * 0.8), color: "#a80" });
    }
    return out;
  }

  // check previous-token pattern: attend-to positions are shifted one from attend-from
  let prevTokScore = 0;
  for (let f = 1; f < T; f++) {
    prevTokScore += norm[f - 1] * (1 / T);
  }
  prevTokScore = Math.round(prevTokScore * T * 10) / 10;
  if (prevTokScore > 0.3 && cv > 0.3) {
    out.push({ label: "previous-token", confidence: Math.min(1, prevTokScore), color: "#47d" });
  }

  // check next-token pattern
  let nextTokScore = 0;
  for (let f = 0; f < T - 1; f++) {
    nextTokScore += norm[f + 1] * (1 / T);
  }
  nextTokScore = Math.round(nextTokScore * T * 10) / 10;
  if (nextTokScore > 0.3 && cv > 0.3) {
    out.push({ label: "next-token", confidence: Math.min(1, nextTokScore), color: "#4b8" });
  }

  // check sink + attend
  if (norm[0] > 0.2 && peaks.length > 1) {
    const nonSinkPeaks = peaks.filter((p) => p.i !== 0);
    if (nonSinkPeaks.length >= 1) {
      out.push({ label: "sink + content", confidence: Math.round((norm[0] + nonSinkPeaks[0].v) * 5) / 10, color: "#a5f" });
    }
  }

  // repeating pattern
  const half = Math.floor(T / 2);
  const firstHalf = norm.slice(0, half).reduce((a, b) => a + b, 0);
  const secondHalf = norm.slice(half).reduce((a, b) => a + b, 0);
  if (Math.abs(firstHalf - secondHalf) < 0.1 * total && cv > 0.3 && peaks.length > 1) {
    // check for periodicity: auto-correlation at lag = T/2
    let corr = 0;
    for (let i = 0; i < half; i++) {
      corr += norm[i] * norm[i + half];
    }
    const normCorr = corr / (half * mean * mean || 1);
    if (normCorr > 2) {
      out.push({ label: "repeating / periodic", confidence: Math.min(1, (normCorr - 2) / 3), color: "#e80" });
    }
  }

  // catch-all: multi-peak / mixed
  if (out.length === 0 && peaks.length >= 2) {
    out.push({ label: "mixed / multi-peak", confidence: Math.round((peaks[0].v + peaks[1].v) * 3) / 10, color: "#a7a" });
  }

  if (out.length === 0) {
    if (cv < 0.5) out.push({ label: "near-uniform", confidence: Math.round((1 - cv) * 10) / 10, color: "#888" });
    else out.push({ label: "positional bias", confidence: Math.round(cv * 5) / 10, color: "#a80" });
  }

  return out;
}

export default function HeadInspector() {
  const data = useStore((s) => s.data);
  const selectedLayer = useStore((s) => s.selectedLayer);
  const selectedHead = useStore((s) => s.selectedHead);

  const headData = useMemo(() => {
    if (!data?.attention?.length) return null;
    const attn = data.attention;
    const L = attn.length;
    const H = attn[0]?.length ?? 0;
    const T = attn[0]?.[0]?.length ?? 0;

    // Compute fingerprints: average attention pattern per head (across from-tokens)
    const fingerprints: number[][] = [];
    for (let h = 0; h < H; h++) {
      const avg: number[] = new Array(T).fill(0);
      for (let f = 0; f < T; f++) {
        for (let t = 0; t < T; t++) {
          avg[t] += attn[0][h][f][t];
        }
      }
      for (let t = 0; t < T; t++) avg[t] /= T;
      fingerprints.push(avg);
    }

    // Verdicts per head
    const verdicts: Verdict[][] = fingerprints.map(getVerdicts);

    // Similarity matrix between heads (layer 0)
    const sim: number[][] = [];
    for (let a = 0; a < H; a++) {
      sim[a] = [];
      for (let b = 0; b < H; b++) {
        sim[a][b] = cosineSim(fingerprints[a], fingerprints[b]);
      }
    }

    return { attn, L, H, T, fingerprints, sim, verdicts };
  }, [data]);

  if (!headData) return null;
  const { attn, H, sim, fingerprints, verdicts } = headData;
  const layer = attn[selectedLayer] ?? attn[0];
  const head = layer[selectedHead] ?? layer[0];

  return (
    <div className="head-inspector">
      <div className="hi-title">Attention Head Inspector</div>
      <div className="hi-meta">
        Layer {selectedLayer} · Head {selectedHead}
      </div>

      {/* Selected-head verdict badge */}
      {verdicts[selectedHead] && (
        <div className="hi-verdicts">
          {verdicts[selectedHead].map((v, i) => (
            <span
              key={i}
              className="hi-verdict-tag"
              style={{ "--tag": v.color } as React.CSSProperties}
              title={`confidence: ${(v.confidence * 100).toFixed(0)}%`}
            >
              {v.label} <span className="hi-verdict-conf">{v.label === "dead head" ? "" : `${(v.confidence * 100).toFixed(0)}%`}</span>
            </span>
          ))}
        </div>
      )}

      {/* Per-head heatmap for the selected head */}
      <div className="hi-heatmap">
        {head.slice(0, 16).map((row, fi) =>
          row.slice(0, 16).map((w, ti) => (
            <div
              key={`${fi}-${ti}`}
              className="hi-cell"
              style={{
                background: `oklch(${50 + w * 40}% 0.06 250)`,
                opacity: 0.3 + w * 0.7,
              }}
              title={`[${fi}→${ti}] ${(w * 100).toFixed(1)}%`}
            />
          )),
        )}
      </div>

      {/* Fingerprint: avg attention-to pattern for each head (layer 0) */}
      <div className="hi-section-label">Head fingerprints (layer 0)</div>
      <div className="hi-fingerprints">
        {fingerprints.map((fp, h) => (
          <div key={h} className={`hi-fp-row${h === selectedHead ? " active" : ""}`}>
            <span className="hi-fp-label">H{h}</span>
            <div className="hi-fp-bars">
              {fp.map((v, t) => (
                <div
                  key={t}
                  className="hi-fp-bar"
                  style={{ height: `${Math.max(2, v * 100)}%` }}
                  title={`H${h}→pos${t}: ${(v * 100).toFixed(1)}%`}
                />
              ))}
            </div>
            {verdicts[h] && (
              <span className="hi-fp-verdict">
                {verdicts[h][0].label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Similarity matrix between heads */}
      <div className="hi-section-label">Head similarity matrix</div>
      <div className="hi-sim-grid" style={{ "--h": H } as React.CSSProperties}>
        {sim.map((row, a) =>
          row.map((v, b) => (
            <div
              key={`${a}-${b}`}
              className="hi-sim-cell"
              style={{
                background: `oklch(${80 - Math.abs(v) * 50}% ${Math.abs(v) * 0.15} ${v > 0 ? 140 : 0})`,
              }}
              title={`H${a}↔H${b}: ${v.toFixed(3)}`}
            />
          )),
        )}
      </div>
    </div>
  );
}
