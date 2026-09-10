"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { fetchDebugSnapshot } from "@/lib/api";
import type { DebugSnapshot } from "@/lib/types";

function fmt(v: number): string {
  if (Math.abs(v) < 0.0001) return v.toExponential(2);
  return v.toFixed(4);
}

/**
 * Tensor inspector (issue #63). Auto-captures a debug snapshot whenever
 * autoplay pauses on a breakpoint and keeps a per-op history so you can
 * thumb between captured states after the fact. Snapshots live in the
 * store so the Data Export card can serialize them too.
 */
export default function DebugInspector() {
  const sentence = useStore((s) => s.data?.sentence);
  const opPlaying = useStore((s) => s.opPlaying);
  const opIndex = useStore((s) => s.opIndex);
  const breakpoints = useStore((s) => s.breakpoints);
  const playIndex = useStore((s) => s.playIndex);
  const genFrames = useStore((s) => s.genFrames);
  // Store-backed snapshot history keyed by opIndex.
  const snapshots = useStore((s) => s.debugSnapshots);
  const loading = useStore((s) => s.debugSnapshotLoading);
  const error = useStore((s) => s.debugSnapshotError);
  const setDebugSnapshot = useStore((s) => s.setDebugSnapshot);
  const setLoading = useStore((s) => s.setDebugSnapshotLoading);
  const setError = useStore((s) => s.setDebugSnapshotError);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [viewingOp, setViewingOp] = useState<number | null>(null);
  const capturedAtBp = useRef<number | null>(null);

  const run = useCallback(async () => {
    if (!sentence) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDebugSnapshot(sentence);
      setDebugSnapshot(opIndex, res.debug_snapshot);
    } catch (e: any) {
      setError(e.message ?? "Debug snapshot failed");
    } finally {
      setLoading(false);
    }
  }, [sentence, opIndex, setDebugSnapshot, setLoading, setError]);

  // Auto-capture when paused at a breakpoint.
  useEffect(() => {
    if (opPlaying) return; // only trigger when paused
    if (!breakpoints.has(opIndex)) return;
    if (!sentence) return;
    // Avoid re-capturing the same breakpoint repeatedly.
    if (capturedAtBp.current === opIndex) return;
    capturedAtBp.current = opIndex;
    setViewingOp(opIndex);
    run();
  }, [opPlaying, opIndex, breakpoints, sentence, run]);

  // Reset the dedup key when breakpoints change (user toggled one on/off).
  useEffect(() => {
    capturedAtBp.current = null;
  }, [breakpoints]);

  // Default the viewing op to the current opIndex once a snapshot exists.
  useEffect(() => {
    if (viewingOp === null && snapshots[opIndex]) setViewingOp(opIndex);
  }, [opIndex, snapshots, viewingOp]);

  const snap =
    (viewingOp !== null && snapshots[viewingOp]) ||
    snapshots[opIndex] ||
    null;
  const isPausedAtBp = !opPlaying && breakpoints.has(opIndex);
  const capturedOps = Object.keys(snapshots)
    .map(Number)
    .sort((a, b) => a - b);
  const viewingToken =
    viewingOp !== null && genFrames.length
      ? genFrames[playIndex < 0 ? 0 : playIndex]?.step
      : null;

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

      <div className="debug-context">
        {viewingOp !== null && (
          <span>
            op {viewingOp}
            {breakpoints.has(viewingOp) ? " · ⏸ paused" : ""}
            {viewingToken !== null && genFrames.length
              ? ` · token ${viewingToken}`
              : ""}
          </span>
        )}
        {capturedOps.length > 1 && (
          <span className="debug-history">
            {capturedOps.map((o) => (
              <button
                key={o}
                className={`chip-btn${o === viewingOp ? " active" : ""}`}
                onClick={() => setViewingOp(o)}
              >
                op {o}
              </button>
            ))}
          </span>
        )}
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
        <>
          <div className="debug-split">
            <div className="debug-path-list">
              {Object.keys(snap)
                .sort()
                .map((p) => (
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

            {selectedPath && snap[selectedPath] && (
              <div className="debug-values">
                <div className="debug-meta">
                  {snap[selectedPath].dtype} ·{" "}
                  {snap[selectedPath].n_elements.toLocaleString()} elements ·{" "}
                  {snap[selectedPath].shape.join(" × ")}
                </div>
                <div className="debug-sample">
                  {snap[selectedPath].sample.slice(0, 32).map((v, i) => (
                    <span
                      key={i}
                      className="debug-val"
                      title={`[${i}] = ${v}`}
                    >
                      {fmt(v)}
                    </span>
                  ))}
                  {snap[selectedPath].n_elements > 32 && (
                    <span className="debug-val muted">…</span>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="debug-foot">
            Captured at breakpoint op {viewingOp ?? opIndex} ·{" "}
            {Object.keys(snap).length} module outputs
          </div>
        </>
      )}
    </div>
  );
}