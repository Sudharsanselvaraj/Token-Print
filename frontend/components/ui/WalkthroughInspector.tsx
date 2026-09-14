"use client";

import { useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { CHAPTERS } from "@/lib/walkthrough";
import { fmtShape } from "@/lib/format";
import DataProvenanceBadge from "./DataProvenanceBadge";
import { TOKENS } from "./primitives";

export default function WalkthroughInspector() {
  const data = useStore((s) => s.data);
  const loading = useStore((s) => s.loading);
  const analyze = useStore((s) => s.analyze);
  const chapterIdx = useStore((s) => s.wtChapter);
  const arch = useStore((s) => s.arch);

  useEffect(() => {
    if (!data && !loading) analyze("The cat sat on the mat.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const idx = Math.min(chapterIdx, CHAPTERS.length - 1);
  const ch = CHAPTERS[idx];

  const m = arch?.metadata;
  const meta = useMemo(
    () =>
      m
        ? {
            hidden_size: m.hidden_size,
            num_heads: m.num_heads,
            num_kv_heads: m.num_kv_heads,
            head_dim: m.head_dim,
            ffn_size: m.ffn_size ?? 0,
            vocab_size: m.vocab_size,
            num_layers: m.num_layers,
          }
        : null,
    [m]
  );

  const insp = data ? ch.inspector(data, meta) : null;
  const equation = data ? ch.equation(data, meta) : null;

  return (
    <aside className="rightpanel rp-inspector">
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="rp-header">
        <span className="rp-header-title">WALKTHROUGH</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontFamily: TOKENS.fontMono,
              fontSize: "10px",
              color: TOKENS.textMuted,
            }}
          >
            CH {idx + 1}/{CHAPTERS.length}
          </span>
          {data && <DataProvenanceBadge origin="real" label="REAL" />}
        </div>
      </div>

      {/* ── LOADING / EMPTY ─────────────────────────────────────────── */}
      {!data && (
        <div className="rp-section">
          <div className="rp-empty">
            {loading
              ? "Running a real forward pass on \u201cThe cat sat on the mat.\u201d\u2026"
              : "Run the forward pass to see real numbers at every step."}
          </div>
        </div>
      )}

      {/* ── CHAPTER CONTENT ─────────────────────────────────────────── */}
      {data && insp && (
        <>
          {/* Title */}
          <div className="rp-section" style={{ paddingBottom: 0 }}>
            <div className="rp-section-header">
              <span className="rp-section-title">{ch.title.toUpperCase()}</span>
              <span
                style={{
                  fontFamily: TOKENS.fontMono,
                  fontSize: "9px",
                  color: TOKENS.textMuted,
                  letterSpacing: "0.06em",
                }}
              >
                {ch.scene}
              </span>
            </div>
          </div>

          {/* Explanation */}
          <div className="rp-section">
            {insp.explanation.map((line, i) => (
              <p
                key={i}
                style={{
                  margin: "0 0 8px",
                  fontSize: "12px",
                  lineHeight: 1.6,
                  color: TOKENS.textSecondary,
                }}
              >
                {line}
              </p>
            ))}
          </div>

          {/* Equation */}
          {equation && (
            <div
              className="rp-section"
              style={{ paddingTop: 0, paddingBottom: 0 }}
            >
              <div
                style={{
                  fontFamily: TOKENS.fontMono,
                  fontSize: "11px",
                  lineHeight: 1.5,
                  color: TOKENS.textPrimary,
                  background: "#0d0d0d",
                  border: `1px solid ${TOKENS.border}`,
                  borderRadius: TOKENS.radiusMd,
                  padding: "8px 10px",
                  overflowX: "auto",
                }}
              >
                {equation}
              </div>
            </div>
          )}

          {/* Input / Output / Dimensions */}
          {(insp.inputShape || insp.outputShape || Object.keys(insp.dimensions).length > 0) && (
            <div className="rp-section">
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
                DIMENSIONS
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {insp.inputShape && (
                  <DimRow label="INPUT" value={insp.inputShape} />
                )}
                {insp.outputShape && (
                  <DimRow label="OUTPUT" value={insp.outputShape} />
                )}
                {Object.entries(insp.dimensions).map(([k, v]) => (
                  <DimRow key={k} label={k} value={v} />
                ))}
              </div>
            </div>
          )}

          {/* Why It Matters */}
          {insp.whyItMatters && (
            <div className="rp-section">
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: TOKENS.textMuted,
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                WHY IT MATTERS
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "11.5px",
                  lineHeight: 1.6,
                  color: TOKENS.textSecondary,
                }}
              >
                {insp.whyItMatters}
              </p>
            </div>
          )}
        </>
      )}
    </aside>
  );
}

function DimRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        padding: "3px 0",
        fontFamily: TOKENS.fontMono,
        fontSize: "10px",
        borderBottom: `1px solid ${TOKENS.border}`,
      }}
    >
      <span style={{ color: TOKENS.textMuted, fontSize: "9px", letterSpacing: "0.08em" }}>
        {label}
      </span>
      <span style={{ color: TOKENS.textPrimary, textAlign: "right" }}>{value}</span>
    </div>
  );
}
