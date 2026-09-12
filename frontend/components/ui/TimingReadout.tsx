"use client";

import { useStore } from "@/lib/store";
import { layerTimingView } from "@/lib/timing";
import { useMemo } from "react";
import DataProvenanceBadge from "./DataProvenanceBadge";

/**
 * Per-layer timing readout (issues #18, #101).
 *
 * Live generations carry real ms-per-layer timings captured by the backend's
 * per-layer forward hooks. Traces recorded without them fall back to a proxy —
 * mean |activation| per layer — which is unitless and never labelled as ms.
 */
export default function TimingReadout() {
  const genFrames = useStore((s) => s.genFrames);
  const genMeta = useStore((s) => s.genMeta);
  const playIndex = useStore((s) => s.playIndex);
  const isPlaying = useStore((s) => s.isPlaying);

  // Pick the frame currently on screen (during playback it's playIndex).
  const visibleIdx = isPlaying || playIndex >= 0 ? playIndex : genFrames.length - 1;
  const frame = genFrames[visibleIdx] ?? null;
  const lastFrame = genFrames[genFrames.length - 1] ?? null;

  const view = useMemo(
    () => layerTimingView(frame, lastFrame, genMeta?.num_layers),
    [frame, lastFrame, genMeta],
  );

  if (!view) return null;

  const isReal = view.kind === "real";

  return (
    <div className="timing-panel">
      <div className="tp-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          Per-Layer Timing{" "}
          <DataProvenanceBadge
            origin={isReal ? "real" : "simulation"}
            label={isReal ? "REAL MS" : "PROXY · NOT MS"}
          />
        </span>
        {genMeta?.num_layers ? (
          <span className="tp-step">
            step {frame?.step ?? 0}
            {view.total !== null ? ` · ${view.total.toFixed(2)}ms total` : null}
          </span>
        ) : null}
      </div>
      {!isReal ? (
        <div className="tp-note">
          No timings in this trace — bars show mean |activation| per layer, not latency.
        </div>
      ) : null}
      <div className="tp-bars">
        {view.perLayer.map((v, i) => (
          <div key={`${frame?.step ?? 0}-${i}`} className="tp-row">
            <span className="tp-label">L{i}</span>
            <div className="tp-bar-track">
              <div
                className="tp-bar"
                style={{ width: `${(v / view.max) * 100}%` }}
              />
            </div>
            <span className="tp-ms" title={isReal ? "ms" : "mean |activation| (unitless)"}>
              {v.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <div className="tp-foot">
        {view.total !== null ? `Total: ${view.total.toFixed(2)}ms · ` : null}
        {genFrames.length} token{genFrames.length === 1 ? "" : "s"} recorded
      </div>
    </div>
  );
}
