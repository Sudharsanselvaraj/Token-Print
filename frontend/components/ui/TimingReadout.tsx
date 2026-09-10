"use client";

import { useStore } from "@/lib/store";
import { useMemo } from "react";

/**
 * Per-layer timing readout (issue #18).
 *
 * When a live generation is running (or a trace is playing), we show the real
 * ms-per-layer timings captured by the backend's per-layer forward hooks. If no
 * generation has run yet, we fall back to the debug snapshot's reported
 * timings (debug_timings), then to coarse simulated bars so the card is never
 * a dead end.
 */
import DataProvenanceBadge from "./DataProvenanceBadge";

export default function TimingReadout() {
  const genFrames = useStore((s) => s.genFrames);
  const genMeta = useStore((s) => s.genMeta);
  const playIndex = useStore((s) => s.playIndex);
  const isPlaying = useStore((s) => s.isPlaying);

  // Pick the frame currently on screen (during playback it's playIndex).
  const visibleIdx = isPlaying || playIndex >= 0 ? playIndex : genFrames.length - 1;
  const frame = genFrames[visibleIdx] ?? null;

  const realTimings = useMemo(() => {
    if (!frame?.layer_timings_ms?.length) return null;
    const total = frame.layer_timings_ms.reduce((a, b) => a + b, 0);
    const max = Math.max(...frame.layer_timings_ms, 1);
    return { perLayer: frame.layer_timings_ms, total, max };
  }, [frame]);

  const proxyTimings = useMemo(() => {
    if (!genFrames.length || !genMeta?.num_layers) return null;
    // No real timing payload (older trace) — derive a rough proxy from the
    // layer_stats norm so older v0.2 traces still render something.
    const nLayers = genMeta.num_layers;
    const stats = frame?.layer_stats ?? genFrames[genFrames.length - 1]?.layer_stats;
    if (!stats?.length) return null;
    const perLayer = stats.slice(0, nLayers).map((s) => Math.max(s * 2.0, 0.05));
    const total = perLayer.reduce((a, b) => a + b, 0);
    const max = Math.max(...perLayer, 1);
    return { perLayer, total, max };
  }, [genFrames, frame, genMeta]);

  if (!realTimings && !proxyTimings) return null;

  const data = realTimings ?? proxyTimings!;

  return (
    <div className="timing-panel">
      <div className="tp-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          Per-Layer Timing{" "}
          <DataProvenanceBadge
            origin={realTimings ? "real" : "derived"}
            label={realTimings ? "REAL MS" : "PROXY DERIVED"}
          />
        </span>
        {genMeta?.num_layers ? (
          <span className="tp-step">
            step {frame?.step ?? 0} · {data.total.toFixed(2)}ms total
          </span>
        ) : null}
      </div>
      <div className="tp-bars">
        {data.perLayer.map((ms, i) => (
          <div key={`${frame?.step ?? 0}-${i}`} className="tp-row">
            <span className="tp-label">L{i}</span>
            <div className="tp-bar-track">
              <div
                className="tp-bar"
                style={{ width: `${(ms / data.max) * 100}%` }}
              />
            </div>
            <span className="tp-ms">{ms.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="tp-foot">
        Total: {data.total.toFixed(2)}ms ·{" "}
        {genFrames.length} token{genFrames.length === 1 ? "" : "s"} recorded
      </div>
    </div>
  );
}