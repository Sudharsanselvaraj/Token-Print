"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { assetUrl } from "@/lib/assets";
import { TOKENS } from "./primitives";

// ─── Monochrome palette — mirrors HFModelPicker's C object exactly ─────────────
const C = {
  bg: "#0c0d10",
  surface: "rgba(255,255,255,0.02)",
  surfaceHover: "#18181b",
  border: "#26262b",
  borderStrong: "#3c3c42",
  text: "#f4f4f5",
  textSecondary: "#a1a1aa",
  textMuted: "#71717a",
  textDisabled: "#3f3f46",
};

// ─── Types ─────────────────────────────────────────────────────────────────────
type TraceMeta = {
  id: string;
  title: string;
  description: string;
  model: string;
  architecture: string;
  tokenCount: number;
  traceType: string;
  source: string;
  traceId: string;
  tags: string[];
  /** Path relative to public root — must exist in /public/demo/ */
  filePath: string;
};

// ─── Real traces — ONLY entries with actual files in /public/demo/ ─────────────
// DO NOT add entries here unless the file physically exists.
// Fake/invented traces must never be added just to fill the UI.
const REAL_TRACES: TraceMeta[] = [
  {
    id: "hello-world",
    title: "Hello World",
    description:
      'Inference trace captured from the prompt "Hello world! The meaning of life is" decoded greedily for 10 tokens.',
    model: "Qwen/Qwen2.5-0.5B-Instruct",
    architecture: "qwen2",
    tokenCount: 10,
    traceType: "Causal LM / Greedy Decode",
    source: "TokenPrint Demo",
    traceId: "demo:hello-world",
    tags: ["demo", "causal_lm", "greedy", "qwen2"],
    filePath: "/demo/hello-world.json",
  },
];

// ─── Icon helper ───────────────────────────────────────────────────────────────
function Icon({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  x: "M6 18L18 6M6 6l12 12",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  alert:
    "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${C.border}`,
        borderTopColor: C.textSecondary,
        animation: "tg-spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "9.5px",
  fontWeight: 600,
  letterSpacing: "0.09em",
  textTransform: "uppercase" as const,
  color: C.textMuted,
  fontFamily: TOKENS.fontSans,
};

// ─── Meta field ────────────────────────────────────────────────────────────────
function MetaField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div
        style={{
          fontSize: "10.5px",
          color: C.textSecondary,
          marginTop: 1,
          fontFamily: mono ? TOKENS.fontMono : TOKENS.fontSans,
          wordBreak: "break-all" as const,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Trace Card ────────────────────────────────────────────────────────────────
function TraceCard({
  trace,
  onLoad,
  loading,
}: {
  trace: TraceMeta;
  onLoad: (t: TraceMeta) => void;
  loading: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [btnHover, setBtnHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? C.surfaceHover : C.surface,
        border: `1px solid ${hover ? C.borderStrong : C.border}`,
        borderRadius: 7,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "background 0.12s, border-color 0.12s",
      }}
    >
      {/* Title + description */}
      <div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: C.text,
            letterSpacing: "-0.01em",
            marginBottom: 4,
            fontFamily: TOKENS.fontSans,
          }}
        >
          {trace.title}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: C.textMuted,
            lineHeight: 1.5,
            fontFamily: TOKENS.fontSans,
          }}
        >
          {trace.description}
        </div>
      </div>

      {/* Meta grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "5px 12px",
        }}
      >
        <MetaField label="Model" value={trace.model.split("/").pop() ?? trace.model} />
        <MetaField label="Tokens" value={String(trace.tokenCount)} />
        <MetaField label="Type" value={trace.traceType} />
        <MetaField label="Arch" value={trace.architecture} />
      </div>

      {/* Provenance */}
      <div
        style={{
          paddingTop: 8,
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        <div style={labelStyle}>Provenance</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
          <MetaField label="Source" value={trace.source} />
          <MetaField label="Trace ID" value={trace.traceId} mono />
        </div>
      </div>

      {/* Tags */}
      {trace.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {trace.tags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: "2px 7px",
                borderRadius: 4,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${C.border}`,
                fontSize: "9.5px",
                fontWeight: 500,
                letterSpacing: "0.04em",
                color: C.textMuted,
                fontFamily: TOKENS.fontMono,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Load button */}
      <button
        onClick={() => onLoad(trace)}
        disabled={loading}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
        style={{
          marginTop: 2,
          padding: "7px 14px",
          borderRadius: 5,
          border: `1px solid ${btnHover && !loading ? C.borderStrong : C.border}`,
          background: btnHover && !loading ? "#222226" : "rgba(255,255,255,0.03)",
          color: loading ? C.textDisabled : C.textSecondary,
          fontSize: "10.5px",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase" as const,
          cursor: loading ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          transition: "background 0.12s, border-color 0.12s, color 0.12s",
          fontFamily: TOKENS.fontSans,
          width: "100%",
        }}
      >
        {loading ? (
          <>
            <Spinner size={11} />
            Loading trace…
          </>
        ) : (
          <>
            Load Trace
            <Icon d={ICONS.arrowRight} size={11} />
          </>
        )}
      </button>
    </div>
  );
}

// ─── Main gallery modal ────────────────────────────────────────────────────────
export default function TraceGallery() {
  const open = useStore((s) => s.traceGalleryOpen);
  const setOpen = useStore((s) => s.setTraceGalleryOpen);
  const loadTrace = useStore((s) => s.loadTrace);

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [closeHover, setCloseHover] = useState(false);

  // Reset state when modal opens/closes.
  useEffect(() => {
    if (!open) {
      setLoadingId(null);
      setLoadError(null);
    }
  }, [open]);

  // Escape key + scroll lock.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, setOpen]);

  const handleLoad = useCallback(
    async (trace: TraceMeta) => {
      setLoadingId(trace.id);
      setLoadError(null);
      try {
        // assetUrl() prepends NEXT_PUBLIC_ASSET_BASE, ensuring correctness on
        // both localhost and tokenprint.in without any basePath mismatch.
        const resp = await fetch(assetUrl(trace.filePath));
        if (!resp.ok) {
          throw new Error(
            `Server returned ${resp.status} ${resp.statusText} for ${trace.filePath}`
          );
        }
        const blob = await resp.blob();
        const file = new File([blob], `${trace.id}.json`, {
          type: "application/json",
        });
        // loadTrace() validates, parses, and populates all visualization state,
        // then switches the UI mode to "generation" automatically.
        await loadTrace(file);
        setOpen(false);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load trace";
        setLoadError(msg);
      } finally {
        setLoadingId(null);
      }
    },
    [loadTrace, setOpen]
  );

  if (!open) return null;

  const hasTraces = REAL_TRACES.length > 0;

  return (
    <>
      <style>{`@keyframes tg-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.82)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: 16,
          animation: "fadeInModal 0.18s cubic-bezier(0.16,1,0.3,1)",
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Community Trace Gallery"
      >
        {/* Panel — same width/shape as HFModelPicker */}
        <div
          style={{
            width: 820,
            maxWidth: "95vw",
            maxHeight: "88vh",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            boxShadow: "0 24px 48px rgba(0,0,0,0.8)",
            color: C.text,
            fontFamily: TOKENS.fontSans,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* ── Header ───────────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              padding: "16px 20px 14px",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 7,
                  border: `1px solid ${C.borderStrong}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: "rgba(255,255,255,0.03)",
                  color: C.textSecondary,
                }}
              >
                <Icon d={ICONS.layers} size={16} />
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                    color: C.text,
                  }}
                >
                  Community Trace Gallery
                </h2>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: "11px",
                    color: C.textMuted,
                    lineHeight: 1.4,
                  }}
                >
                  Explore shared inference traces and load them into TokenPrint.
                </p>
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              onMouseEnter={() => setCloseHover(true)}
              onMouseLeave={() => setCloseHover(false)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: closeHover ? C.surfaceHover : "transparent",
                color: closeHover ? C.text : C.textMuted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.12s, color 0.12s",
              }}
            >
              <Icon d={ICONS.x} size={14} />
            </button>
          </div>

          {/* ── Load error banner ──────────────────────────────────────── */}
          {loadError && (
            <div
              style={{
                padding: "10px 20px",
                borderBottom: `1px solid ${C.border}`,
                background: "rgba(201,111,111,0.08)",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                fontSize: "11px",
                color: "#e89494",
                lineHeight: 1.5,
              }}
            >
              <Icon d={ICONS.alert} size={13} />
              <span style={{ flex: 1 }}>{loadError}</span>
              <button
                onClick={() => setLoadError(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: C.textMuted,
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <Icon d={ICONS.x} size={12} />
              </button>
            </div>
          )}

          {/* ── Gallery body ──────────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: 20,
            }}
          >
            {hasTraces ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 14,
                  alignItems: "start",
                }}
              >
                {REAL_TRACES.map((t) => (
                  <TraceCard
                    key={t.id}
                    trace={t}
                    onLoad={handleLoad}
                    loading={loadingId === t.id}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "60px 24px",
                  color: C.textMuted,
                  textAlign: "center",
                }}
              >
                <Icon d={ICONS.info} size={20} />
                <div
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: C.textDisabled,
                    fontFamily: TOKENS.fontSans,
                  }}
                >
                  No Community Traces Available
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: C.textMuted,
                    maxWidth: 280,
                    lineHeight: 1.6,
                    fontFamily: TOKENS.fontSans,
                  }}
                >
                  Community traces will appear here when published.
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ───────────────────────────────────────────────── */}
          <div
            style={{
              padding: "10px 20px",
              borderTop: `1px solid ${C.border}`,
              background: "rgba(255,255,255,0.015)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "10px",
              color: C.textMuted,
              letterSpacing: "0.03em",
              fontFamily: TOKENS.fontSans,
            }}
          >
            <Icon d={ICONS.info} size={11} />
            <span>Traces are loaded locally. No data is sent to external servers.</span>
          </div>
        </div>
      </div>
    </>
  );
}
