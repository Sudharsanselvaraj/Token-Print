"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { CHAPTERS, REF_MODELS } from "@/lib/walkthrough";
import { PRESET_PROMPTS } from "@/lib/prompts";
import { fmtCount } from "@/lib/format";

function useLoadingElapsed(loading: boolean): number {
  const [start] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setElapsed(Date.now() - start), 500);
    return () => clearInterval(id);
  }, [loading, start]);
  return elapsed;
}

export default function WalkthroughPane() {
  const data = useStore((s) => s.data);
  const loading = useStore((s) => s.loading);
  const analyze = useStore((s) => s.analyze);
  const chapterIdx = useStore((s) => s.wtChapter);
  const setWtChapter = useStore((s) => s.setWtChapter);
  const next = useStore((s) => s.nextChapter);
  const prev = useStore((s) => s.prevChapter);
  const wtModel = useStore((s) => s.wtModel);
  const setWtModel = useStore((s) => s.setWtModel);
  const wtPlaying = useStore((s) => s.wtPlaying);
  const toggleWtPlay = useStore((s) => s.toggleWtPlay);
  const playSpeed = useStore((s) => s.playSpeed);
  const setPlaySpeed = useStore((s) => s.setPlaySpeed);

  // Load the real example forward pass once.
  useEffect(() => {
    if (!data && !loading) analyze("The cat sat on the mat.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const idx = Math.min(chapterIdx, CHAPTERS.length - 1);
  const ch = CHAPTERS[idx];

  // Gate on data — never render "…" placeholders.
  const dataReady = !!data;
  const elapsed = useLoadingElapsed(!data && loading);

  const lines = data ? ch.build(data) : [];

  return (
    <div className="wt-pane">
      <div className="wt-nav">
        <button className="pb-btn" onClick={prev} disabled={idx <= 0}>
          ‹
        </button>
        <div className="wt-chaptertitle">Chapter: {ch.title}</div>
        <button
          className="pb-btn"
          onClick={next}
          disabled={idx >= CHAPTERS.length - 1}
        >
          ›
        </button>
      </div>

      <div className="wt-play">
        <button
          className="pb-btn"
          onClick={toggleWtPlay}
          disabled={!dataReady || (idx >= CHAPTERS.length - 1 && !wtPlaying)}
          title="Autoplay chapters"
        >
          {wtPlaying ? "Pause" : "Play"}
        </button>
        <button
          className="pb-btn"
          onClick={prev}
          disabled={idx <= 0}
          title="Previous chapter"
        >
          Skip Back
        </button>
        <button
          className="pb-btn"
          onClick={next}
          disabled={idx >= CHAPTERS.length - 1}
          title="Next chapter"
          style={{ background: "#0284c7", color: "#ffffff" }}
        >
          Continue ›
        </button>
        <button
          className="chip-btn"
          onClick={() => setPlaySpeed(playSpeed >= 4 ? 0.5 : playSpeed * 2)}
          title="Autoplay speed"
        >
          {playSpeed}× speed
        </button>
      </div>

      {/* Chapter Progress Bar Scrubber */}
      <div style={{ margin: "8px 0", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#a3a3a3" }}>
          <span>Progress</span>
          <span>Chapter {idx + 1} of {CHAPTERS.length}</span>
        </div>
        <div style={{ height: 4, background: "#252525", borderRadius: 2, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${((idx + 1) / CHAPTERS.length) * 100}%`,
              background: "#ffffff",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      <div className="side-title" style={{ marginTop: 6 }}>
        Model scale
      </div>
      <select
        className="wt-modelsel"
        value={wtModel}
        onChange={(e) => setWtModel(e.target.value)}
      >
        {REF_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} — {fmtCount(m.params)} params
          </option>
        ))}
      </select>

      {!dataReady && loading && (
        <div className="wt-loading">
          <div className="wt-spinner" />
          <span>Running forward pass… {elapsed > 0 && `${(elapsed / 1000).toFixed(0)}s`}</span>
          {elapsed > 8000 && (
            <button className="chip-btn" onClick={() => analyze("The cat sat on the mat.")} style={{marginLeft:6}}>
              Retry
            </button>
          )}
        </div>
      )}
      {!dataReady && !loading && (
        <div className="wt-loading">
          <span>No data yet.</span>
          <button className="chip-btn" onClick={() => analyze("The cat sat on the mat.")} style={{marginLeft:6}}>
            Load example
          </button>
        </div>
      )}

      {dataReady && (
        <div className="wt-body">
          {lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
          {ch.id === "tokenizer" && (
            <>
              <div className="side-title" style={{ marginTop: 12 }}>
                Try other languages
              </div>
              <div className="sentence-presets">
                {PRESET_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    className="chip-btn preset-chip"
                    onClick={() => analyze(p.text)}
                    title={p.note}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="side-title">Contents</div>
      <div className="wt-toc">
        {CHAPTERS.map((c, i) => (
          <button
            key={c.id}
            className={"wt-tocitem" + (i === idx ? " active" : "")}
            onClick={() => setWtChapter(i)}
          >
            {c.title}
          </button>
        ))}
      </div>
    </div>
  );
}
