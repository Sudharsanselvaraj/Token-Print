"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useStore } from "@/lib/store";
import { phaseInfo } from "@/lib/playback";
import type { GenStatus } from "@/lib/types";
import ModelSummaryCard from "./ModelSummaryCard";
import GenerationControls from "./GenerationControls";
import TokenStrip from "./TokenStrip";
import KvCacheTimeline from "./KvCacheTimeline";
import { Panel, Section, SectionHeader, Badge, TOKENS } from "./primitives";

/** Real wall-clock elapsed time while a generation is streaming. */
function useElapsed(status: GenStatus) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === "streaming") {
      if (startRef.current == null) startRef.current = performance.now();
      const id = window.setInterval(() => {
        if (startRef.current != null) {
          setElapsed(Math.round((performance.now() - startRef.current) / 100) / 10);
        }
      }, 200);
      return () => window.clearInterval(id);
    }
    if (status === "done" || status === "error") {
      startRef.current = null; // freeze the last elapsed value on next run
    } else {
      startRef.current = null;
      setElapsed(0);
    }
  }, [status]);

  return elapsed;
}

export default function GenerationSidebar({
  onToggleCollapse,
}: {
  onToggleCollapse?: () => void;
}) {
  const genStatus = useStore((s) => s.genStatus);
  const genMeta = useStore((s) => s.genMeta);
  const genFrames = useStore((s) => s.genFrames);
  const playIndex = useStore((s) => s.playIndex);
  const elapsed = useElapsed(genStatus);

  const cur = genFrames[playIndex >= 0 ? playIndex : genFrames.length - 1];
  const frame = cur ?? genFrames[genFrames.length - 1];
  const phase = phaseInfo(frame, genMeta?.prompt_len ?? 0, genMeta?.uses_kv_cache);

  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    padding: "4px 2px",
    fontFamily: TOKENS.fontMono,
    fontSize: "10.5px",
    borderBottom: `1px solid ${TOKENS.border}`,
  };
  const keyStyle = { color: TOKENS.textMuted, fontSize: "9px", letterSpacing: "0.08em" };
  const valStyle = {
    color: TOKENS.textPrimary,
    textAlign: "right" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
    maxWidth: "150px",
  };
  const tokenText = cur?.chosen.text ?? "";
  const tokenDisplay =
    tokenText.length === 0
      ? "␣"
      : tokenText.replace(/\n/g, "⏎").slice(0, 22) + (tokenText.length > 22 ? "…" : "");

  return (
    <Panel className="left-sidebar">
      <ModelSummaryCard onToggleCollapse={onToggleCollapse} />

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* 1. GENERATION CONTROLS */}
        <Section>
          <SectionHeader title="GENERATION" />
          <GenerationControls />
        </Section>

        {/* 2. GENERATION STATE */}
        <Section>
          <SectionHeader title="GENERATION STATE" />
          <div>
            <div style={rowStyle}><span style={keyStyle}>STATUS</span><span style={valStyle}>{genStatus}</span></div>
            <div style={rowStyle}><span style={keyStyle}>PHASE</span><span style={valStyle}>{phase?.label ?? "—"}</span></div>
            <div style={rowStyle}>
              <span style={keyStyle}>STEP</span>
              <span style={valStyle}>{genFrames.length ? `${playIndex + 1} / ${genFrames.length}` : "—"}</span>
            </div>
            <div style={rowStyle}>
              <span style={keyStyle}>TOKEN</span>
              <span style={{ ...valStyle, color: frame ? "#7fd7c8" : undefined }}>{frame ? tokenDisplay : "—"}</span>
            </div>
            <div style={rowStyle}><span style={keyStyle}>TOKENS</span><span style={valStyle}>{genFrames.length || "—"}</span></div>
            <div style={{ ...rowStyle, borderBottom: "none" }}>
              <span style={keyStyle}>TIME</span>
              <span style={valStyle}>{genStatus === "idle" ? "—" : `${elapsed.toFixed(1)}s`}</span>
            </div>
          </div>
        </Section>

        {/* 3. TOKENS */}
        <Section>
          <SectionHeader title="TOKENS" action={<Badge>{genFrames.length}</Badge>} />
          <TokenStrip />
        </Section>

        {/* 4. KV CACHE */}
        <Section noBorder>
          <SectionHeader title="KV CACHE" />
          <KvCacheTimeline />
        </Section>
      </div>
    </Panel>
  );
}