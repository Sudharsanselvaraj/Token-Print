"use client";

import type { CSSProperties } from "react";
import { useStore } from "@/lib/store";
import { activeLayerOf, phaseInfo } from "@/lib/playback";
import type { TopKCandidate } from "@/lib/types";
import { Button, TOKENS } from "./primitives";

const sectStyle = {
  marginTop: "4px",
} as const;

const sectHead: CSSProperties = {
  fontFamily: TOKENS.fontMono,
  fontSize: "9px",
  letterSpacing: "0.1em",
  color: TOKENS.textMuted,
  borderBottom: `1px solid ${TOKENS.border}`,
  paddingBottom: "3px",
  marginBottom: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  padding: "3px 0",
  fontFamily: TOKENS.fontMono,
  fontSize: "10px",
};

const keyStyle: CSSProperties = { color: TOKENS.textMuted, fontSize: "9px", letterSpacing: "0.08em" };
const valStyle: CSSProperties = {
  color: TOKENS.textPrimary,
  textAlign: "right",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "150px",
};

function SectionTitle({ title, right }: { title: string; right?: string }) {
  return (
    <div style={sectHead}>
      <span>{title}</span>
      {right && <span style={{ color: TOKENS.textSecondary, fontFamily: TOKENS.fontMono }}>{right}</span>}
    </div>
  );
}

function Predictions({ topk }: { topk: TopKCandidate[] }) {
  const maxProb = Math.max(1e-6, ...topk.map((c) => c.prob));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      {topk.slice(0, 8).map((c, i) => {
        const pc = c.prob * 100;
        return (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ ...keyStyle, width: "16px", color: i === 0 ? "#7fd7c8" : TOKENS.textMuted }}>
              {i + 1}
            </span>
            <span
              style={{
                fontFamily: TOKENS.fontMono,
                fontSize: "10px",
                color: i === 0 ? TOKENS.textPrimary : TOKENS.textSecondary,
                width: "96px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {c.text.replace(/\n/g, "⏎") || "␣"}
            </span>
            <div style={{ flex: 1, height: 4, background: TOKENS.surfaceRaised, borderRadius: 2, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.max(2, (c.prob / maxProb) * 100)}%`,
                  background: i === 0 ? "#7fd7c8" : TOKENS.borderStrong,
                }}
              />
            </div>
            <span style={{ fontFamily: TOKENS.fontMono, fontSize: "9.5px", color: TOKENS.textPrimary, minWidth: "52px", textAlign: "right" }}>
              {pc.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Logits({ topk }: { topk: TopKCandidate[] }) {
  if (!topk.length) return null;
  const max = Math.max(1e-6, ...topk.map((c) => c.logit));
  const min = Math.min(...topk.map((c) => c.logit));
  const span = Math.max(1e-6, max - min);
  const cols = 24;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
      {topk.slice(0, 8).map((c, i) => {
        const v = (c.logit - min) / span;
        const cells = Math.max(1, Math.round(v * cols));
        return (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ ...keyStyle, width: "16px", color: i === 0 ? "#7fd7c8" : TOKENS.textMuted }}>{i + 1}</span>
            <div style={{ flex: 1, display: "flex", gap: 1 }}>
              {Array.from({ length: cols }, (_, k) => (
                <div
                  key={k}
                  style={{
                    flex: 1,
                    height: 5,
                    background: k < cells ? (i === 0 ? "#7fd7c8" : TOKENS.borderStrong) : TOKENS.surfaceRaised,
                  }}
                />
              ))}
            </div>
            <span style={{ fontFamily: TOKENS.fontMono, fontSize: "9.5px", color: TOKENS.textPrimary, minWidth: "52px", textAlign: "right" }}>
              {c.logit.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function GenerationPanel() {
  const meta = useStore((s) => s.genMeta);
  const opIndex = useStore((s) => s.opIndex);
  const stepOp = useStore((s) => s.stepOp);
  const status = useStore((s) => s.genStatus);
  const frame = useStore((s) => (s.playIndex >= 0 ? s.genFrames[s.playIndex] : null));

  const catalog = meta?.op_catalog ?? [];
  const nLayers = meta?.num_layers ?? 0;
  const op = catalog.length ? catalog[Math.min(opIndex, catalog.length - 1)] : null;
  const activeLayer = activeLayerOf(op ?? undefined, nLayers);
  const phase = phaseInfo(frame, meta?.prompt_len ?? 0, meta?.uses_kv_cache);

  const NA = "UNAVAILABLE";

  if (!frame && (!meta || catalog.length === 0)) {
    return (
      <div className="rightpanel">
        <div className="rp-empty">
          {status === "streaming"
            ? "streaming a real generation…"
            : "Ready to run inference. Enter a prompt and press GENERATE."}
        </div>
      </div>
    );
  }

  const timings = frame?.layer_timings_ms ?? [];
  const stepMs = timings.length ? timings.reduce((a, b) => a + b, 0) : null;
  const activeMs =
    timings.length && activeLayer != null
      ? timings[Math.max(0, Math.min(activeLayer, timings.length - 1))]
      : null;
  const cacheLen = frame?.cache_len ?? phase?.cacheLen ?? null;
  const nPos = frame?.n_positions ?? phase?.positions ?? null;
  const dp = meta?.decoding_params ?? {};
  const tokenText = frame?.chosen.text ?? "";

  return (
    <div className="rightpanel genpanel" style={{ overflowY: "auto" }}>
      {/* Header: mode + phase */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontFamily: TOKENS.fontSans, fontSize: "11px", letterSpacing: "0.1em", color: TOKENS.textPrimary }}>
          GENERATION INSPECTOR
        </span>
        {phase && (
          <span
            style={{
              fontFamily: TOKENS.fontMono,
              fontSize: "9px",
              letterSpacing: "0.08em",
              padding: "2px 7px",
              borderRadius: TOKENS.radiusSm,
              border: `1px solid ${phase.phase === "prefill" ? "#3a3a6a" : "#2a3a4a"}`,
              color: phase.phase === "prefill" ? "#b8b8ff" : "#9fd0f0",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            {phase.label.toUpperCase()}
          </span>
        )}
      </div>

      {/* CURRENT TOKEN */}
      <div style={sectStyle}>
        <SectionTitle title="CURRENT TOKEN" />
        <div
          style={{
            fontFamily: TOKENS.fontMono,
            fontSize: "20px",
            lineHeight: 1.25,
            color: "#7fd7c8",
            padding: "6px 0",
            wordBreak: "break-word",
          }}
        >
          {tokenText.replace(/\n/g, "⏎") || "␣"}
        </div>
        <div style={rowStyle}><span style={keyStyle}>TOKEN ID</span><span style={valStyle}>{frame?.chosen.id ?? NA}</span></div>
        <div style={rowStyle}><span style={keyStyle}>STEP</span><span style={valStyle}>{frame?.step != null ? frame.step + 1 : NA}</span></div>
        <div style={rowStyle}><span style={keyStyle}>PHASE</span><span style={valStyle}>{phase?.phase ?? NA}</span></div>
        <div style={rowStyle}><span style={keyStyle}>LOGPROB</span><span style={valStyle}>{frame?.chosen.logprob != null ? frame.chosen.logprob.toFixed(4) : NA}</span></div>
        <div style={{ ...rowStyle, borderBottom: "none" }}>
          <span style={keyStyle}>SELECTION</span>
          <span style={{ ...valStyle, color: "#9fd0f0" }}>
            {frame?.sampled == null ? "—" : frame.sampled ? "sampled" : "argmax"}
          </span>
        </div>
        {phase && (
          <div
            style={{
              fontFamily: TOKENS.fontMono,
              fontSize: "9px",
              color: TOKENS.textMuted,
              lineHeight: 1.4,
              paddingTop: "4px",
            }}
          >
            {phase.detail}
          </div>
        )}
      </div>

      {/* TOP PREDICTIONS */}
      {frame?.topk?.length ? (
        <div style={sectStyle}>
          <SectionTitle title="TOP PREDICTIONS" right={`top ${frame.topk.length}`} />
          <Predictions topk={frame.topk} />
        </div>
      ) : (
        <div style={sectStyle}>
          <SectionTitle title="TOP PREDICTIONS" />
          <div style={{ ...keyStyle, padding: "2px 0" }}>{NA}</div>
        </div>
      )}

      {/* LOGITS */}
      {frame?.topk?.length ? (
        <div style={sectStyle}>
          <SectionTitle title="LOGITS" right="real" />
          <Logits topk={frame.topk} />
        </div>
      ) : (
        <div style={sectStyle}>
          <SectionTitle title="LOGITS" />
          <div style={{ ...keyStyle, padding: "2px 0" }}>{NA}</div>
        </div>
      )}

      {/* KV CACHE */}
      <div style={sectStyle}>
        <SectionTitle title="KV CACHE" right={meta?.uses_kv_cache ? "active" : "n/a"} />
        <div style={rowStyle}><span style={keyStyle}>CACHE LEN</span><span style={valStyle}>{cacheLen != null ? cacheLen : NA}</span></div>
        <div style={rowStyle}><span style={keyStyle}>POSITIONS</span><span style={valStyle}>{nPos != null ? nPos : NA}</span></div>
        <div style={rowStyle}><span style={keyStyle}>PROMPT LEN</span><span style={valStyle}>{meta?.prompt_len != null ? meta.prompt_len : NA}</span></div>
        <div style={{ ...rowStyle, borderBottom: "none" }}>
          <span style={keyStyle}>CONTEXT</span>
          <span style={valStyle}>{meta?.prompt_len != null && cacheLen != null ? meta.prompt_len + cacheLen : NA}</span>
        </div>
      </div>

      {/* OPERATION */}
      <div style={sectStyle}>
        <SectionTitle title="OPERATION" right={op ? `op ${opIndex + 1} / ${catalog.length}` : undefined} />
        {op ? (
          <div>
            <div style={rowStyle}>
              <span style={keyStyle}>CURRENT</span>
              <span style={{ ...valStyle, fontSize: "11px" }}>
                {op.layer != null && op.layer >= 0 && op.layer < nLayers
                  ? `L${op.layer} · ${op.op_key}`
                  : op.op_key}
              </span>
            </div>
            <div style={rowStyle}>{op.label}</div>
            {activeLayer != null && (
              <div style={rowStyle}><span style={keyStyle}>LAYER IDX</span><span style={valStyle}>{activeLayer}</span></div>
            )}
            <div style={{ ...rowStyle, borderBottom: "none", justifyContent: "flex-end", gap: "4px" }}>
              <Button onClick={() => stepOp(-1)} disabled={opIndex <= 0} style={{ height: "20px", padding: "0 8px", fontSize: "10px" }}>‹ Prev</Button>
              <Button onClick={() => stepOp(1)} disabled={opIndex >= catalog.length - 1} style={{ height: "20px", padding: "0 8px", fontSize: "10px" }}>Next ›</Button>
            </div>
          </div>
        ) : (
          <div style={{ ...keyStyle, padding: "2px 0" }}>{NA} — no op catalog (e.g. llama.cpp)</div>
        )}
      </div>

      {/* TIMING */}
      <div style={sectStyle}>
        <SectionTitle title="TIMING" />
        <div style={rowStyle}><span style={keyStyle}>STEP TOTAL</span><span style={valStyle}>{stepMs != null ? `${stepMs.toFixed(1)} ms` : NA}</span></div>
        {activeLayer != null && (
          <div style={rowStyle}>
            <span style={keyStyle}>ACTIVE LAYER</span>
            <span style={valStyle}>{activeMs != null ? `${activeMs.toFixed(2)} ms` : NA}</span>
          </div>
        )}
      </div>

      {/* DECODE PARAMS — real parameters this run used. */}
      <div style={{ ...sectStyle, borderTop: `1px solid ${TOKENS.border}`, marginTop: "10px", paddingTop: "6px" }}>
        <SectionTitle title="DECODE PARAMS" />
        <div style={rowStyle}><span style={keyStyle}>MODE</span><span style={valStyle}>{meta?.decoding ?? NA}</span></div>
        <div style={rowStyle}><span style={keyStyle}>TEMPERATURE</span><span style={valStyle}>{dp.temperature != null ? dp.temperature.toFixed(2) : NA}</span></div>
        <div style={rowStyle}><span style={keyStyle}>TOP-K</span><span style={valStyle}>{dp.top_k ?? meta?.top_k ?? NA}</span></div>
        <div style={rowStyle}><span style={keyStyle}>TOP-P</span><span style={valStyle}>{dp.top_p != null ? dp.top_p.toFixed(2) : NA}</span></div>
        <div style={rowStyle}><span style={keyStyle}>MAX TOKENS</span><span style={valStyle}>{meta?.max_new_tokens ?? NA}</span></div>
      </div>
    </div>
  );
}