"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { CHAPTERS } from "@/lib/walkthrough";
import { Panel, Badge, TOKENS } from "./primitives";

export default function WalkthroughSidebar({
  onToggleCollapse,
}: {
  onToggleCollapse?: () => void;
}) {
  const data = useStore((s) => s.data);
  const loading = useStore((s) => s.loading);
  const analyze = useStore((s) => s.analyze);
  const chapterIdx = useStore((s) => s.wtChapter);
  const next = useStore((s) => s.nextChapter);
  const prev = useStore((s) => s.prevChapter);
  const wtPlaying = useStore((s) => s.wtPlaying);
  const toggleWtPlay = useStore((s) => s.toggleWtPlay);
  const playSpeed = useStore((s) => s.playSpeed);
  const setPlaySpeed = useStore((s) => s.setPlaySpeed);

  useEffect(() => {
    if (!data && !loading) analyze("The cat sat on the mat.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const idx = Math.min(chapterIdx, CHAPTERS.length - 1);
  const dataReady = !!data;
  const atEnd = idx >= CHAPTERS.length - 1;

  const arch = useStore((s) => s.arch);
  const m = arch?.metadata;
  const modelName = m?.name || data?.model || "Qwen2.5-0.5B";
  const architecture = m?.architecture || "Qwen2ForCausalLM";
  const numLayers = m?.num_layers || data?.num_layers || 24;
  const hiddenSize = m?.hidden_size || data?.hidden_size || 896;
  const numHeads = m?.num_heads || data?.num_heads || 14;
  const kvHeads = m?.num_kv_heads || 2;
  const vocabSize = m?.vocab_size || 151936;

  return (
    <Panel className="left-sidebar">
      {/* ── MODEL CARD (compact) ─────────────────────────────────────── */}
      <div
        style={{
          padding: "12px 14px 10px",
          borderBottom: `1px solid ${TOKENS.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: TOKENS.textPrimary,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {modelName}
            </div>
            <div style={{ fontSize: "10px", color: TOKENS.textMuted, marginTop: "2px" }}>
              {architecture}
            </div>
          </div>
          <button
            onClick={onToggleCollapse}
            style={{
              width: "20px",
              height: "20px",
              padding: 0,
              fontSize: "11px",
              borderRadius: TOKENS.radiusSm,
              border: `1px solid ${TOKENS.border}`,
              background: "transparent",
              color: TOKENS.textMuted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            title="Collapse sidebar"
          >
            ‹
          </button>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 10px",
            marginTop: "8px",
            fontFamily: TOKENS.fontMono,
            fontSize: "9.5px",
            color: TOKENS.textMuted,
          }}
        >
          <span>{numLayers} layers</span>
          <span>{hiddenSize}d</span>
          <span>{numHeads}Q/{kvHeads}KV</span>
          <span>{vocabSize.toLocaleString()} vocab</span>
        </div>
      </div>

      {/* ── CHAPTERS ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div
          style={{
            padding: "10px 14px 6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: TOKENS.textMuted,
              textTransform: "uppercase",
            }}
          >
            {CHAPTERS.length} CHAPTERS
          </span>
          <Badge>{idx + 1}/{CHAPTERS.length}</Badge>
        </div>

        {/* Progress bar */}
        <div style={{ padding: "0 14px 8px" }}>
          <div style={{ height: 2, background: "#1a1a1a", borderRadius: 1, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${((idx + 1) / CHAPTERS.length) * 100}%`,
                background: TOKENS.textPrimary,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* Chapter list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {CHAPTERS.map((ch, i) => {
            const isActive = i === idx;
            const isPast = i < idx;
            return (
              <button
                key={ch.id}
                onClick={() => useStore.getState().setWtChapter(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "5px 14px",
                  borderTop: "none",
                  borderRight: "none",
                  borderBottom: "none",
                  borderLeftWidth: "2px",
                  borderLeftStyle: "solid",
                  borderLeftColor: isActive ? TOKENS.textPrimary : "transparent",
                  background: isActive ? "rgba(255,255,255,0.03)" : "transparent",
                  color: isActive ? TOKENS.textPrimary : isPast ? TOKENS.textSecondary : TOKENS.textMuted,
                  fontFamily: TOKENS.fontSans,
                  fontSize: "11px",
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontFamily: TOKENS.fontMono,
                    color: isActive ? TOKENS.textSecondary : TOKENS.textMuted,
                    minWidth: "16px",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ flex: 1 }}>{ch.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── PLAYBACK CONTROLS ────────────────────────────────────────── */}
      <div
        style={{
          padding: "8px 14px 10px",
          borderTop: `1px solid ${TOKENS.border}`,
        }}
      >
        <div
          style={{
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: TOKENS.textMuted,
            textTransform: "uppercase",
            marginBottom: "6px",
          }}
        >
          Playback
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <button
          onClick={prev}
          disabled={idx <= 0}
          style={{
            height: "26px",
            padding: "0 8px",
            fontSize: "10px",
            fontFamily: TOKENS.fontSans,
            borderRadius: TOKENS.radiusSm,
            border: `1px solid ${TOKENS.border}`,
            background: TOKENS.surfaceRaised,
            color: idx <= 0 ? TOKENS.textDisabled : TOKENS.textSecondary,
            cursor: idx <= 0 ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
          title="Previous chapter (←)"
        >
          ‹
        </button>
        <button
          onClick={toggleWtPlay}
          disabled={!dataReady || (atEnd && !wtPlaying)}
          style={{
            height: "26px",
            padding: "0 10px",
            fontSize: "10px",
            fontFamily: TOKENS.fontSans,
            fontWeight: 600,
            borderRadius: TOKENS.radiusSm,
            border: `1px solid ${TOKENS.borderStrong}`,
            background: TOKENS.surfaceHover,
            color: !dataReady || (atEnd && !wtPlaying) ? TOKENS.textDisabled : TOKENS.textPrimary,
            cursor: !dataReady || (atEnd && !wtPlaying) ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
          title="Play / Pause (Space)"
        >
          {wtPlaying ? "⏸" : "▶"}
        </button>
        <button
          onClick={next}
          disabled={atEnd}
          style={{
            height: "26px",
            padding: "0 8px",
            fontSize: "10px",
            fontFamily: TOKENS.fontSans,
            borderRadius: TOKENS.radiusSm,
            border: `1px solid ${TOKENS.border}`,
            background: TOKENS.surfaceRaised,
            color: atEnd ? TOKENS.textDisabled : TOKENS.textSecondary,
            cursor: atEnd ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
          title="Next chapter (→)"
        >
          ›
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setPlaySpeed(playSpeed >= 4 ? 0.5 : playSpeed * 2)}
          style={{
            height: "26px",
            padding: "0 6px",
            fontSize: "9px",
            fontFamily: TOKENS.fontMono,
            borderRadius: TOKENS.radiusSm,
            border: `1px solid ${TOKENS.border}`,
            background: "transparent",
            color: TOKENS.textMuted,
            cursor: "pointer",
          }}
          title="Playback speed"
        >
          {playSpeed}×
        </button>
        </div>
      </div>
    </Panel>
  );
}
