"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { fetchDebugSnapshot } from "@/lib/api";
import type { DebugSnapshot } from "@/lib/types";

function fmt(v: number): string {
  if (Math.abs(v) < 0.0001) return v.toExponential(2);
  return v.toFixed(4);
}

export default function DebugInspector() {
  const [snap, setSnap] = useState<DebugSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const sentence = useStore((s) => s.data?.sentence);
  const opPlaying = useStore((s) => s.opPlaying);
  const opIndex = useStore((s) => s.opIndex);
  const breakpoints = useStore((s) => s.breakpoints);
  const genMeta = useStore((s) => s.genMeta);

  const capturedAtBp = useRef<number | null>(null);

  const run = useCallback(async () => {
    if (!sentence) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDebugSnapshot(sentence);
      setSnap(res.debug_snapshot);
    } catch (e: any) {
      setError(e.message ?? "Debug snapshot failed");
    } finally {
      setLoading(false);
    }
  }, [sentence]);

  // Auto-capture when paused at a breakpoint.
  useEffect(() => {
    if (opPlaying) return; // only trigger when paused
    if (!breakpoints.has(opIndex)) return;
    if (!sentence) return;
    // Avoid re-capturing the same breakpoint repeatedly.
    if (capturedAtBp.current === opIndex) return;
    capturedAtBp.current = opIndex;
    run();
  }, [opPlaying, opIndex, breakpoints, sentence, run]);

  // Reset the dedup key when breakpoints change (user toggled one on/off).
  useEffect(() => {
    capturedAtBp.current = null;
  }, [breakpoints]);

  const paths = snap ? Object.keys(snap).sort() : [];
  const entry = selectedPath && snap ? snap[selectedPath] : null;
  const isPausedAtBp = !opPlaying && breakpoints.has(opIndex);

  return (
    <div className="debug-panel">
      <div className="debug-title">
        Debug Inspector
        {isPausedAtBp && <span className="debug-bp-badge">⏸ breakpoint</span>}
        <button
          className="chip-btn"
          onClick={run}
          disabled={loading || !sentence}
          style={{ float: "right", fontSize: "0.7rem" }}
        >
          {loading ? "running…" : "Capture"}
        </button>
      </div>

      {error && <div className="error">⚠ {error}</div>}

      {!snap && !loading && (
        <div className="drop-note">
          {isPausedAtBp
            ? "Paused at breakpoint — capturing snapshot…"
            : "Click Capture to record intermediate outputs, or set a breakpoint to auto-capture on pause."}
        </div>
      )}

      {loading && <div className="drop-note">Running forward pass…</div>}

      {snap && (
        <div className="debug-split">
          <div className="debug-path-list">
            {paths.map((p) => (
              <div
                key={p}
                className={`debug-path${p === selectedPath ? " active" : ""}`}
                onClick={() => setSelectedPath(p)}
                title={p}
              >
                <span className="debug-path-name">
                  {p.length > 24 ? "…" + p.slice(-22) : p}
                </span>
                <span className="debug-path-shape">
                  {snap[p].shape.join("×")}
                </span>
              </div>
            ))}
          </div>

          {entry && (
            <div className="debug-values">
              <div className="debug-meta">
                {entry.dtype} · {entry.n_elements.toLocaleString()} elements ·{" "}
                {entry.shape.join(" × ")}
              </div>
              <div className="debug-sample">
                {entry.sample.slice(0, 32).map((v, i) => (
                  <span key={i} className="debug-val" title={`[${i}] = ${v}`}>
                    {fmt(v)}
                  </span>
                ))}
                {entry.n_elements > 32 && (
                  <span className="debug-val muted">…</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
