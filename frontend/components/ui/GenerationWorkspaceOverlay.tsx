"use client";

import { useEffect, useMemo, useRef } from "react";
import { useStore } from "@/lib/store";
import { activeLayerOf, phaseInfo } from "@/lib/playback";
import type { OpCatalogEntry } from "@/lib/types";

const STAGES = ["INPUT", "EMBEDDING", "LAYERS", "LM HEAD", "LOGITS", "NEXT TOKEN"];

/**
 * Which compute-path stage the current op belongs to:
 *   INPUT(0) always start; EMBEDDING(1) for the token embedding;
 *   LAYERS(2) for any per-layer op; LM HEAD(3) + LOGITS(4) for the final
 *   output op; NEXT TOKEN(5) after a token is chosen.
 */
function stageOf(op: OpCatalogEntry | null | undefined, nLayers: number, hasFrame: boolean): number {
  if (!op) return hasFrame ? 2 : 0;
  const layer = activeLayerOf(op, nLayers);
  if (op.op_key === "embedding") return 1;
  if (op.op_key === "output") return 4; // LM HEAD + LOGITS lit together
  if (op.op_key === "norm" && layer == null) return 3; // final pre-output norm
  if (layer != null && layer >= nLayers) return 3;
  return 2;
}

function disp(t: string): string {
  const s = t.replace(/\n/g, "⏎").replace(/ /g, "·");
  return s.length === 0 ? "␣" : s.length > 10 ? s.slice(0, 10) + "…" : s;
}

export default function GenerationWorkspaceOverlay() {
  const meta = useStore((s) => s.genMeta);
  const frames = useStore((s) => s.genFrames);
  const playIndex = useStore((s) => s.playIndex);
  const opIndex = useStore((s) => s.opIndex);
  const status = useStore((s) => s.genStatus);

  const nLayers = meta?.num_layers ?? 0;
  const catalog = meta?.op_catalog ?? [];
  const op = catalog.length ? catalog[Math.min(opIndex, catalog.length - 1)] : null;
  const frame = playIndex >= 0 && frames[playIndex] ? frames[playIndex] : frames[frames.length - 1] ?? null;

  const phase = phaseInfo(frame, meta?.prompt_len ?? 0, meta?.uses_kv_cache);
  const active = stageOf(op, nLayers, !!frame);

  // Real token trail: prompt tokens (tail) + generated tokens.
  const promptTokens = useMemo(() => {
    const all = meta?.prompt_tokens ?? [];
    return all.slice(-28);
  }, [meta]);
  const genTokens = useMemo(() => frames.filter((f) => !f.eos).map((f) => f.chosen.text), [frames]);
  const truncated = (meta?.prompt_tokens?.length ?? 0) > promptTokens.length;

  const trailRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = trailRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [frames.length, playIndex, genTokens.length]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 20,
        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
      }}
    >
      {/* ── Compute path stepper (top-center) ─────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 0,
          padding: "4px 10px",
          background: "rgba(5,5,5,0.72)",
          border: "1px solid rgba(37,37,37,0.85)",
          borderRadius: 6,
          backdropFilter: "blur(6px)",
          whiteSpace: "nowrap",
        }}
      >
        {STAGES.map((s, i) => {
          const lit = i <= active;
          const cur = i === active;
          const label = cur ? "#7fd7c8" : lit ? "#bfc6d3" : "#4a4a4a";
          const dot = cur ? "#7fd7c8" : lit ? "#5a5a5a" : "#333";
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {i > 0 && (
                <span style={{ color: lit ? "#3f3f3f" : "#262626", fontSize: 9, padding: "0 3px" }}>→</span>
              )}
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  color: label,
                  padding: i === active ? "1px 5px" : "1px 3px",
                  borderRadius: 3,
                  background: i === active ? "rgba(127,215,200,0.10)" : "transparent",
                  boxShadow: i === active ? "0 0 0 1px rgba(127,215,200,0.25)" : "none",
                }}
              >
                {s}
              </span>
              <span style={{ width: 2, height: 2, borderRadius: 1, background: dot }} />
            </div>
          );
        })}
      </div>

      {/* ── Phase badge (top-right) ─────────────────────────────────────── */}
      <div style={{ position: "absolute", top: 10, right: 10, textAlign: "right" }}>
        {status === "streaming" && !phase?.phase ? (
          <span
            style={{
              fontSize: 9,
              letterSpacing: "0.14em",
              color: "#9aa3b8",
              background: "rgba(5,5,5,0.72)",
              border: "1px solid rgba(37,37,37,0.85)",
              borderRadius: 4,
              padding: "3px 8px",
            }}
          >
            STREAMING…
          </span>
        ) : phase ? (
          <div
            style={{
              background: "rgba(5,5,5,0.72)",
              border: `1px solid ${phase.phase === "prefill" ? "rgba(140,140,255,0.5)" : "rgba(127,208,240,0.5)"}`,
              borderRadius: 4,
              padding: "4px 8px",
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.14em",
                color: phase.phase === "prefill" ? "#b8b8ff" : "#9fd0f0",
              }}
            >
              {phase.label.toUpperCase()}
            </div>
            <div style={{ fontSize: 8.5, color: "#737373", marginTop: 2 }}>{phase.detail}</div>
          </div>
        ) : null}
      </div>

      {/* ── Token trail (bottom-center, above the transport bar) ─────────── */}
      {(meta?.prompt_tokens?.length || genTokens.length) ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 56,
            maxWidth: "78%",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(5,5,5,0.72)",
            border: "1px solid rgba(37,37,37,0.85)",
            borderRadius: 5,
            padding: "5px 8px",
            backdropFilter: "blur(6px)",
          }}
        >
          <span
            style={{
              fontSize: 8.5,
              letterSpacing: "0.1em",
              color: "#6f7a95",
              whiteSpace: "nowrap",
            }}
          >
            {frames.length ? `TOKEN ${String(playIndex + 1).padStart(2, "0")}/${String(frames.length).padStart(2, "0")}` : "PROMPT"}
          </span>
          <div
            ref={trailRef}
            style={{
              display: "flex",
              gap: "4px",
              alignItems: "center",
              overflowX: "auto",
              scrollbarWidth: "none",
              maxWidth: "100%",
              fontSize: 10.5,
              whiteSpace: "nowrap",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            }}
          >
            {truncated && <span style={{ color: "#4a4a4a" }}>…</span>}
            {promptTokens.map((t, i) => (
              <span key={`p${i}`} style={{ color: "#6b6f7a" }}>
                {disp(t)}
              </span>
            ))}
            {promptTokens.length > 0 && genTokens.length > 0 && (
              <span style={{ color: "#2f2f2f" }}>→</span>
            )}
            {genTokens.map((t, i) => {
              const isCur = i === playIndex;
              return (
                <span
                  key={`g${i}`}
                  style={{
                    color: isCur ? "#7fd7c8" : "#c8ccd6",
                    background: isCur ? "rgba(127,215,200,0.08)" : "transparent",
                    padding: isCur ? "0 3px" : 0,
                    borderRadius: 3,
                  }}
                >
                  {disp(t)}
                </span>
              );
            })}
            {status === "streaming" && <span style={{ color: "#7fd7c8" }}>▌</span>}
          </div>
        </div>
      ) : null}
    </div>
  );
}