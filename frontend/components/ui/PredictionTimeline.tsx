"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";
import type { LogitLensEntry } from "@/lib/types";
import { CHAPTERS } from "@/lib/walkthrough";

export default function PredictionTimeline() {
  const data = useStore((s) => s.data);
  const chapterIdx = useStore((s) => s.wtChapter);
  const prev = useStore((s) => s.prevChapter);
  const next = useStore((s) => s.nextChapter);
  const wtPlaying = useStore((s) => s.wtPlaying);
  const toggleWtPlay = useStore((s) => s.toggleWtPlay);
  const playSpeed = useStore((s) => s.playSpeed);
  const setPlaySpeed = useStore((s) => s.setPlaySpeed);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const play = useCallback(() => {
    setPlaying(true);
  }, []);

  const stop = useCallback(() => {
    setPlaying(false);
  }, []);

  const { logit_lens, tokens } = data ?? {};
  const numPositions = logit_lens?.[0]?.length ?? 0;

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setPos((p) => {
          const nextPos = p + 1;
          if (nextPos >= numPositions) {
            setPlaying(false);
            return 0;
          }
          return nextPos;
        });
      }, 400);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, numPositions]);

  const [collapsed, setCollapsed] = useState(true);

  if (!logit_lens?.length || !tokens) return null;

  const clampedPos = Math.min(pos, numPositions - 1);

  if (collapsed) {
    return (
      <div className="timeline-panel-collapsed">
        <button
          className="tl-toggle-btn"
          onClick={() => setCollapsed(false)}
          title="Expand Prediction Timeline (layer-by-layer prediction evolution)"
        >
          <span>⏱️ Show Prediction Timeline</span>
          <span className="tl-badge">{numPositions} tokens</span>
        </button>
      </div>
    );
  }

  return (
    <div className="timeline-panel">
      <div className="tl-header-bar">
        <div className="tl-header">
          <span className="tl-title">Prediction Timeline</span>
          <span className="tl-subtitle">
            Layer-by-layer prediction evolution at position{" "}
            <strong>{clampedPos}</strong> &ldquo;{tokens[clampedPos]?.text ?? "?"}&rdquo;
          </span>
        </div>
        <button
          className="tl-close-btn"
          onClick={() => setCollapsed(true)}
          title="Minimize Prediction Timeline view to reveal full 3D canvas"
        >
          ✕ Hide
        </button>
      </div>

      <div className="tl-nav">
        <button className="tl-btn" onClick={prev} disabled={chapterIdx <= 0}>
          Prev
        </button>
        <span className="tl-chapter-idx">Ch. {chapterIdx + 1} / {CHAPTERS.length}</span>
        <button className="tl-btn" onClick={next} disabled={chapterIdx >= CHAPTERS.length - 1}>
          Next
        </button>
        <button className="tl-btn" onClick={toggleWtPlay}>
          {wtPlaying ? "Stop" : "Play"}
        </button>
        <select
          className="tl-speed"
          value={playSpeed}
          onChange={(e) => setPlaySpeed(Number(e.target.value))}
        >
          <option value={1600}>0.5×</option>
          <option value={800}>1×</option>
          <option value={400}>2×</option>
          <option value={200}>4×</option>
        </select>
      </div>

      {/* Position scrubber */}
      <div className="tl-scrubber">
        <input
          type="range"
          min={0}
          max={numPositions - 1}
          value={clampedPos}
          onChange={(e) => setPos(Number(e.target.value))}
          className="tl-slider"
        />
        <div className="tl-pos-labels">
          {tokens.map((t, i) => (
            <span
              key={i}
              className={`tl-pos-tick${i === clampedPos ? " active" : ""}`}
              onClick={() => setPos(i)}
            >
              {t.text.length > 3 ? t.text.slice(0, 2) + "…" : t.text}
            </span>
          ))}
        </div>
      </div>

      <div className="tl-controls">
        {playing ? (
          <button className="tl-btn" onClick={stop}>
            Stop
          </button>
        ) : (
          <button className="tl-btn" onClick={play}>
            Play
          </button>
        )}
        <span className="tl-pos-info">pos {clampedPos}</span>
      </div>

      {/* Layer-by-layer predictions for selected position */}
      <div className="tl-layers">
        <div className="tl-layer-header">
          <span className="tl-col-layer">Layer</span>
          <span className="tl-col-token">Entry</span>
          {[1, 2, 3, 4, 5].map((r) => (
            <span key={r} className="tl-col-rank">
              #{r}
            </span>
          ))}
        </div>
        {logit_lens.slice(0, 30).map((layer, li) => {
          const posEntries: LogitLensEntry[] = layer[clampedPos];
          const entry = posEntries[0];
          return (
            <div
              key={li}
              className={`tl-layer-row${li === 0 ? " embedding" : ""}`}
            >
              <span className="tl-col-layer">{li === 0 ? "emb" : li}</span>
              <span
                className="tl-col-token"
                title={entry?.text ?? ""}
                style={{
                  background: entry
                    ? `oklch(${35 + entry.prob * 40}% 0.1 ${((entry.token_id * 137508) % 360) / 360}turn)`
                    : undefined,
                }}
              >
                {entry
                  ? entry.text.length > 5
                    ? entry.text.slice(0, 4) + "…"
                    : entry.text
                  : "—"}
              </span>
              {posEntries.slice(0, 5).map((e, ri) => (
                <span key={ri} className="tl-col-rank" title={`${e.text} (p=${(e.prob * 100).toFixed(1)}%)`}>
                  {e.text.length > 4 ? e.text.slice(0, 3) + "…" : e.text}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
