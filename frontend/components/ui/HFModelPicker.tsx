"use client";

import React, { useState, useEffect, useRef } from "react";
import type { CuratedModel, HFInspectResponse, HFModelMeta } from "../../lib/types";
import { fetchHFCurated, searchHFModels, inspectHFModel } from "../../lib/api";
import { TOKENS } from "./primitives";

// ─── Monochrome palette (semantic green/red only for supported/unavailable) ───
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
  green: "#5dad82",
  red: "#c96f6f",
  redBorder: "rgba(201,111,111,0.30)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "9.5px",
  fontWeight: 600,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: C.textMuted,
  fontFamily: TOKENS.fontSans,
};

// ─── Compact monochrome icon set (no external packages) ───────────────────────
// Real official Hugging Face logo geometry (frontend/public/hf-logo.svg),
// rendered as a light-gray monochrome mark for the TokenPrint dark theme.
function HfLogo({ width = 32, height = 30 }: { width?: number; height?: number }) {
  const hair = "#d2d2d2";
  const fluff = "#b0b0b0";
  const face = "#e8e8e8";
  const eye = "#616161";
  const mouth = "#8f8f8f";
  return (
    <svg width={width} height={height} viewBox="0 0 95 88" fill="none">
      <path fill={hair} d="M47.21 76.5a34.75 34.75 0 1 0 0-69.5 34.75 34.75 0 0 0 0 69.5Z" />
      <path
        fill={fluff}
        d="M81.96 41.75a34.75 34.75 0 1 0-69.5 0 34.75 34.75 0 0 0 69.5 0Zm-73.5 0a38.75 38.75 0 1 1 77.5 0 38.75 38.75 0 0 1-77.5 0Z"
      />
      <path
        fill={eye}
        d="M58.5 32.3c1.28.44 1.78 3.06 3.07 2.38a5 5 0 1 0-6.76-2.07c.61 1.15 2.55-.72 3.7-.32ZM34.95 32.3c-1.28.44-1.79 3.06-3.07 2.38a5 5 0 1 1 6.76-2.07c-.61 1.15-2.56-.72-3.7-.32Z"
      />
      <path
        fill={mouth}
        d="M46.96 56.29c9.83 0 13-8.76 13-13.26 0-2.34-1.57-1.6-4.09-.36-2.33 1.15-5.46 2.74-8.9 2.74-7.19 0-13-6.88-13-2.38s3.16 13.26 13 13.26Z"
      />
      <path
        fill={face}
        fillRule="evenodd"
        d="M39.43 54a8.7 8.7 0 0 1 5.3-4.49c.4-.12.81.57 1.24 1.28.4.68.82 1.37 1.24 1.37.45 0 .9-.68 1.33-1.35.45-.7.89-1.38 1.32-1.25a8.61 8.61 0 0 1 5 4.17c3.73-2.94 5.1-7.74 5.1-10.7 0-2.34-1.57-1.6-4.09-.36l-.14.07c-2.31 1.15-5.39 2.67-8.77 2.67s-6.45-1.52-8.77-2.67c-2.6-1.29-4.23-2.1-4.23.29 0 3.05 1.46 8.06 5.47 10.97Z"
        clipRule="evenodd"
      />
      <path
        fill={fluff}
        d="M70.71 37a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM24.21 37a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM17.52 48c-1.62 0-3.06.66-4.07 1.87a5.97 5.97 0 0 0-1.33 3.76 7.1 7.1 0 0 0-1.94-.3c-1.55 0-2.95.59-3.94 1.66a5.8 5.8 0 0 0-.8 7 5.3 5.3 0 0 0-1.79 2.82c-.24.9-.48 2.8.8 4.74a5.22 5.22 0 0 0-.37 5.02c1.02 2.32 3.57 4.14 8.52 6.1 3.07 1.22 5.89 2 5.91 2.01a44.33 44.33 0 0 0 10.93 1.6c5.86 0 10.05-1.8 12.46-5.34 3.88-5.69 3.33-10.9-1.7-15.92-2.77-2.78-4.62-6.87-5-7.77-.78-2.66-2.84-5.62-6.25-5.62a5.7 5.7 0 0 0-4.6 2.46c-1-1.26-1.98-2.25-2.86-2.82A7.4 7.4 0 0 0 17.52 48Zm0 4c.51 0 1.14.22 1.82.65 2.14 1.36 6.25 8.43 7.76 11.18.5.92 1.37 1.31 2.14 1.31 1.55 0 2.75-1.53.15-3.48-3.92-2.93-2.55-7.72-.68-8.01.08-.02.17-.02.24-.02 1.7 0 2.45 2.93 2.45 2.93s2.2 5.52 5.98 9.3c3.77 3.77 3.97 6.8 1.22 10.83-1.88 2.75-5.47 3.58-9.16 3.58-3.81 0-7.73-.9-9.92-1.46-.11-.03-13.45-3.8-11.76-7 .28-.54.75-.76 1.34-.76 2.38 0 6.7 3.54 8.57 3.54.41 0 .7-.17.83-.6.79-2.85-12.06-4.05-10.98-8.17.2-.73.71-1.02 1.44-1.02 3.14 0 10.2 5.53 11.68 5.53.11 0 .2-.03.24-.1.74-1.2.33-2.04-4.9-5.2-5.21-3.16-8.88-5.06-6.8-7.33.24-.26.58-.38 1-.38 3.17 0 10.66 6.82 10.66 6.82s2.02 2.1 3.25 2.1c.28 0 .52-.1.68-.38.86-1.46-8.06-8.22-8.56-11.01-.34-1.9.24-2.85 1.31-2.85Z"
      />
      <path
        fill={hair}
        d="M38.6 76.69c2.75-4.04 2.55-7.07-1.22-10.84-3.78-3.77-5.98-9.3-5.98-9.3s-.82-3.2-2.69-2.9c-1.87.3-3.24 5.08.68 8.01 3.91 2.93-.78 4.92-2.29 2.17-1.5-2.75-5.62-9.82-7.76-11.18-2.13-1.35-3.63-.6-3.13 2.2.5 2.79 9.43 9.55 8.56 11-.87 1.47-3.93-1.71-3.93-1.71s-9.57-8.71-11.66-6.44c-2.08 2.27 1.59 4.17 6.8 7.33 5.23 3.16 5.64 4 4.9 5.2-.75 1.2-12.28-8.53-13.36-4.4-1.08 4.11 11.77 5.3 10.98 8.15-.8 2.85-9.06-5.38-10.74-2.18-1.7 3.21 11.65 6.98 11.76 7.01 4.3 1.12 15.25 3.49 19.08-2.12Z"
      />
      <path
        fill={fluff}
        d="M77.4 48c1.62 0 3.07.66 4.07 1.87a5.97 5.97 0 0 1 1.33 3.76 7.1 7.1 0 0 1 1.95-.3c1.55 0 2.95.59 3.94 1.66a5.8 5.8 0 0 1 .8 7 5.3 5.3 0 0 1 1.78 2.82c.24.9.48 2.8-.8 4.74a5.22 5.22 0 0 1 .37 5.02c-1.02 2.32-3.57 4.14-8.51 6.1-3.08 1.22-5.9 2-5.92 2.01a44.33 44.33 0 0 1-10.93 1.6c-5.86 0-10.05-1.8-12.46-5.34-3.88-5.69-3.33-10.9 1.7-15.92 2.78-2.78 4.63-6.87 5.01-7.77.78-2.66 2.83-5.62 6.24-5.62a5.7 5.7 0 0 1 4.6 2.46c1-1.26 1.98-2.25 2.87-2.82A7.4 7.4 0 0 1 77.4 48Zm0 4c-.51 0-1.13.22-1.82.65-2.13 1.36-6.25 8.43-7.76 11.18a2.43 2.43 0 0 1-2.14 1.31c-1.54 0-2.75-1.53-.14-3.48 3.91-2.93 2.54-7.72.67-8.01a1.54 1.54 0 0 0-.24-.02c-1.7 0-2.45 2.93-2.45 2.93s-2.2 5.52-5.97 9.3c-3.78 3.77-3.98 6.8-1.22 10.83 1.87 2.75 5.47 3.58 9.15 3.58 3.82 0 7.73-.9 9.93-1.46.1-.03 13.45-3.8 11.76-7-.29-.54-.75-.76-1.34-.76-2.38 0-6.71 3.54-8.57 3.54-.42 0-.71-.17-.83-.6-.8-2.85 12.05-4.05 10.97-8.17-.19-.73-.7-1.02-1.44-1.02-3.14 0-10.2 5.53-11.68 5.53-.1 0-.19-.03-.23-.1-.74-1.2-.34-2.04 4.88-5.2 5.23-3.16 8.9-5.06 6.8-7.33-.23-.26-.57-.38-.98-.38-3.18 0-10.67 6.82-10.67 6.82s-2.02 2.1-3.24 2.1a.74.74 0 0 1-.68-.38c-.87-1.46 8.05-8.22 8.55-11.01.34-1.9-.24-2.85-1.31-2.85Z"
      />
      <path
        fill={hair}
        d="M56.33 76.69c-2.75-4.04-2.56-7.07 1.22-10.84 3.77-3.77 5.97-9.3 5.97-9.3s.82-3.2 2.7-2.9c1.86.3 3.23 5.08-.68 8.01-3.92 2.93.78 4.92 2.28 2.17 1.51-2.75 5.63-9.82 7.76-11.18 2.13-1.35 3.64-.6 3.13 2.2-.5 2.79-9.42 9.55-8.55 11 .86 1.47 3.92-1.71 3.92-1.71s9.58-8.71 11.66-6.44c2.08 2.27-1.58 4.17-6.8 7.33-5.23 3.16-5.63 4-4.9 5.2.75 1.2 12.28-8.53 13.36-4.4 1.08 4.11-11.76 5.3-10.97 8.15.8 2.85 9.05-5.38 10.74-2.18 1.69 3.21-11.65 6.98-11.76 7.01-4.31 1.12-15.26 3.49-19.08-2.12Z"
      />
    </svg>
  );
}

function Icon({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  sparkle: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  x: "M6 18L18 6M6 6l12 12",
  cpu: "M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
  download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  cloud: "M3 15a4 4 0 004 4h9a5 5 0 001-9.9 5 5 0 00-9.5-1.4A4.002 4.002 0 003 15z",
  alert: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
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
        animation: "hf-spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

// Semantic tone for compatibility states — used only for a small status dot,
// so the pill itself stays neutral graphite (TokenPrint monochrome language).
function compatTone(level: string) {
  if (level === "High") return { dot: C.green };
  if (level === "Unsupported") return { dot: C.red };
  return { dot: C.textMuted };
}

function truncateMiddle(text: string, max = 12) {
  if (text.length <= max) return text;
  return `${text.slice(0, 6)}…${text.slice(-4)}`;
}

const CAPABILITY_ORDER: Array<[string, string]> = [
  ["supports_attention", "ATTENTION"],
  ["supports_hidden_states", "HIDDEN STATES"],
  ["supports_logit_lens", "LOGIT LENS"],
  ["supports_head_ablation", "HEAD ABLATION"],
  ["supports_layer_ablation", "LAYER ABLATION"],
  ["supports_activation_patch", "ACTIVATION PATCH"],
];

interface CapabilityRow {
  title: string;
  supported: boolean;
  reason: string;
  fromData?: boolean;
}

interface HFModelPickerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelectModel?: (modelId: string) => void;
}

export function HFModelPicker({ isOpen = true, onClose = () => {}, onSelectModel }: HFModelPickerProps) {
  const [activeTab, setActiveTab] = useState<"curated" | "search">("curated");
  const [curatedModels, setCuratedModels] = useState<CuratedModel[]>([]);
  const [curatedLoading, setCuratedLoading] = useState(false);
  const [curatedError, setCuratedError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<HFModelMeta[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedModelId, setSelectedModelId] = useState<string>("Qwen/Qwen2.5-0.5B-Instruct");
  const [inspectData, setInspectData] = useState<HFInspectResponse | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  const [cloudHover, setCloudHover] = useState(false);
  const [localHover, setLocalHover] = useState(false);
  const [closeHover, setCloseHover] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Escape to close + scroll lock while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  // Focus the search input when switching to the Search Hub tab.
  useEffect(() => {
    if (activeTab === "search") searchInputRef.current?.focus();
  }, [activeTab]);

  // Fetch curated models on mount (open once).
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setCuratedLoading(true);
    setCuratedError(null);
    fetchHFCurated()
      .then((data) => {
        if (cancelled) return;
        if (data.models && Array.isArray(data.models)) setCuratedModels(data.models as CuratedModel[]);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load curated models:", err);
        setCuratedError(err instanceof Error ? err.message : "Failed to load curated models");
      })
      .finally(() => {
        if (!cancelled) setCuratedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Debounced real HF Hub search.
  useEffect(() => {
    if (!searchQuery.trim() || activeTab !== "search") return;
    setSearchError(null);
    const timer = setTimeout(() => {
      setIsSearching(true);
      searchHFModels(searchQuery, 12)
        .then((data) => {
          setSearchResults(data.models || []);
          setIsSearching(false);
        })
        .catch((err) => {
          console.error("HF search error:", err);
          setSearchError(err instanceof Error ? err.message : "Search failed");
          setIsSearching(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Inspect capabilities whenever a model is selected.
  useEffect(() => {
    if (!isOpen || !selectedModelId) return;
    let cancelled = false;
    setIsInspecting(true);
    setInspectError(null);
    inspectHFModel(selectedModelId)
      .then((data: HFInspectResponse) => {
        if (cancelled) return;
        setInspectData(data);
        setIsInspecting(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("HF inspect error:", err);
        setInspectError(
          `Failed to inspect model capabilities for ${selectedModelId}: ${err instanceof Error ? err.message : err}`
        );
        setIsInspecting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedModelId]);

  if (!isOpen) return null;

  const buildCapabilities = (data: HFInspectResponse): CapabilityRow[] => {
    const rows: CapabilityRow[] = CAPABILITY_ORDER.map(([key, title]) => {
      const cap = data.capabilities?.[key];
      if (cap && typeof cap === "object" && "supported" in cap) {
        return {
          title,
          supported: Boolean(cap.supported),
          reason: typeof cap.reason === "string" ? cap.reason : "",
          fromData: true,
        };
      }
      return { title, supported: false, reason: "Not reported for this model." };
    });
    const vram = data.capabilities?.vram_estimate;
    rows.push({
      title: "VRAM ESTIMATE",
      supported: vram && typeof vram === "object" ? Boolean(vram.supported) : true,
      reason: vram && typeof vram === "object" && typeof vram.reason === "string"
        ? vram.reason
        : data.estimation_basis || "Derived from parameter count, architecture, and dtype.",
      fromData: Boolean(vram),
    });
    return rows;
  };

  const selectModel = (id: string) => {
    setSelectedModelId(id);
    if (activeTab === "search") setActiveTab("curated");
  };

  return (
    <div
      className="hf-explorer-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Hugging Face Model Explorer"
    >
      <div className="hf-explorer-panel" style={{ background: C.bg, color: C.text, fontFamily: TOKENS.fontSans }}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
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
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
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
              }}
            >
              <HfLogo width={30} height={28} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "15px",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                  color: C.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Hugging Face Model Explorer
              </h2>
              <p style={{ margin: "3px 0 0", fontSize: "11px", color: C.textMuted, lineHeight: 1.4 }}>
                Discover models, inspect internal capabilities, and evaluate TokenPrint compatibility
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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

        {/* ── Body: two-column explorer ───────────────────────────────────── */}
        <div className="hf-explorer-cols" style={{ flex: 1, minHeight: 0, display: "flex" }}>
          {/* Left column — catalog / search */}
          <div
            style={{
              width: "31%",
              minWidth: 220,
              maxWidth: 360,
              borderRight: `1px solid ${C.border}`,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            {/* Segmented navigation */}
            <div style={{ padding: "10px 12px 8px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: 3,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <button
                  onClick={() => setActiveTab("curated")}
                  style={{
                    borderRadius: 4,
                    padding: "6px 0",
                    border: "none",
                    fontSize: "10px",
                    fontWeight: activeTab === "curated" ? 600 : 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    cursor: "pointer",
                    background: activeTab === "curated" ? C.surfaceHover : "transparent",
                    color: activeTab === "curated" ? C.text : C.textMuted,
                    transition: "background 0.12s, color 0.12s",
                  }}
                >
                  <Icon d={ICONS.sparkle} size={11} /> Curated
                </button>
                <button
                  onClick={() => setActiveTab("search")}
                  style={{
                    borderRadius: 4,
                    padding: "6px 0",
                    border: "none",
                    fontSize: "10px",
                    fontWeight: activeTab === "search" ? 600 : 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    cursor: "pointer",
                    background: activeTab === "search" ? C.surfaceHover : "transparent",
                    color: activeTab === "search" ? C.text : C.textMuted,
                    transition: "background 0.12s, color 0.12s",
                  }}
                >
                  <Icon d={ICONS.search} size={11} /> Search Hub
                </button>
              </div>
            </div>

            {activeTab === "curated" ? (
              <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
                <div style={{ padding: "6px 12px 8px" }}>
                  <span style={labelStyle}>Recommended Compatible Models</span>
                </div>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    padding: "0 12px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {curatedLoading ? (
                    <div style={{ padding: "28px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: C.textMuted, fontSize: "11px" }}>
                      <Spinner size={14} /> Loading curated models…
                    </div>
                  ) : curatedError ? (
                    <div style={{ padding: "20px 8px", textAlign: "left", color: C.textMuted, fontSize: "11px", lineHeight: 1.5 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", color: C.red, marginBottom: 4 }}>
                        <Icon d={ICONS.alert} size={12} /> Curated list unavailable
                      </div>
                      {curatedError}
                      <button
                        onClick={() => setActiveTab("search")}
                        style={{
                          marginTop: 8,
                          padding: "5px 10px",
                          borderRadius: 5,
                          border: `1px solid ${C.borderStrong}`,
                          background: "transparent",
                          color: C.textSecondary,
                          fontSize: "10px",
                          cursor: "pointer",
                        }}
                      >
                        Try Search Hub instead
                      </button>
                    </div>
                  ) : (
                    curatedModels.map((m) => (
                      <ModelRow
                        key={m.id}
                        id={m.id}
                        description={m.description}
                        family={m.family}
                        minVram={m.minimum_memory_gb}
                        recommended={m.recommended}
                        selected={selectedModelId === m.id}
                        onSelect={() => selectModel(m.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, padding: "0 12px 12px" }}>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: C.textMuted,
                      pointerEvents: "none",
                    }}
                  >
                    <Icon d={ICONS.search} size={12} />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Hugging Face Hub…"
                    style={{
                      width: "100%",
                      padding: "8px 10px 8px 30px",
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      fontSize: "11px",
                      color: C.text,
                      outline: "none",
                      fontFamily: TOKENS.fontSans,
                    }}
                  />
                </div>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {isSearching ? (
                    <div style={{ padding: "28px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: C.textMuted, fontSize: "11px" }}>
                      <Spinner size={14} /> Searching Hugging Face Hub…
                    </div>
                  ) : searchError ? (
                    <div style={{ padding: "20px 8px", color: C.red, fontSize: "11px", lineHeight: 1.5 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                        <Icon d={ICONS.alert} size={12} /> Search failed
                      </div>
                      {searchError}
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((item, idx) => (
                      <ModelRow
                        key={item.id}
                        id={item.id}
                        author={item.author}
                        downloads={item.downloads}
                        likes={item.likes}
                        selected={selectedModelId === item.id}
                        onSelect={() => setSelectedModelId(item.id)}
                        compactSearch={idx > 6}
                      />
                    ))
                  ) : (
                    <div style={{ padding: "26px 8px", textAlign: "center", color: C.textMuted, fontSize: "11px", lineHeight: 1.6 }}>
                      {searchQuery ? "No models found matching your query." : "Type a model name to search the HF Hub."}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right column — selected model detail / inspection */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: "16px 20px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              background: "rgba(255,255,255,0.01)",
            }}
          >
            {isInspecting ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: C.textMuted, fontSize: "11px" }}>
                <Spinner />
                <span>Evaluating architecture &amp; capability matrix…</span>
              </div>
            ) : inspectError ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: C.red, fontSize: "11px", padding: "0 24px", textAlign: "center", lineHeight: 1.6 }}>
                <Icon d={ICONS.alert} size={18} />
                <span>{inspectError}</span>
              </div>
            ) : !inspectData ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: "11px" }}>
                Select a model on the left to inspect capabilities.
              </div>
            ) : (
              <>
                {/* Model identity */}
                <div>
                  <div style={{ fontFamily: TOKENS.fontMono, fontSize: "16px", fontWeight: 600, letterSpacing: "-0.01em", color: C.text, wordBreak: "break-word" }}>
                    {inspectData.model_id}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 8px", marginTop: 5, fontFamily: TOKENS.fontMono, fontSize: "10px", color: C.textMuted }}>
                    <span>
                      REV <span style={{ color: C.textSecondary }}>{truncateMiddle(inspectData.revision)}</span>
                    </span>
                    <span style={{ color: C.borderStrong }}>|</span>
                    <span>
                      ARCH <span style={{ color: C.textSecondary }}>{inspectData.architecture}</span>
                    </span>
                  </div>
                </div>

                {/* Compatibility badge */}
                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${C.borderStrong}`,
                      fontSize: "10.5px",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      fontFamily: TOKENS.fontMono,
                      color: C.textSecondary,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: compatTone(inspectData.compatibility_level).dot,
                      }}
                    />
                    <span style={{ color: C.textMuted }}>TokenPrint Compatibility:</span>
                    <span style={{ color: C.text }}>{inspectData.compatibility_level}</span>
                  </div>
                </div>

                {/* Capability statement */}
                {inspectData.compatibility_reason && (
                  <p
                    style={{
                      margin: "12px 0 0",
                      paddingLeft: 10,
                      borderLeft: `2px solid ${C.borderStrong}`,
                      fontSize: "11.5px",
                      lineHeight: 1.55,
                      color: C.textSecondary,
                    }}
                  >
                    {inspectData.compatibility_reason}
                  </p>
                )}

                {/* Metric blocks */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 16 }}>
                  <MetricBlock label="Params" value={inspectData.parameter_count ? `${(inspectData.parameter_count / 1e6).toFixed(1)}M` : "Unknown"} />
                  <MetricBlock label="Max Context" value={inspectData.max_context_length ? `${inspectData.max_context_length.toLocaleString()} tokens` : "Unknown"} />
                  <MetricBlock label="Est. VRAM" value={`~${inspectData.estimated_vram_gb} GB`} />
                </div>

                {/* Instrumentation capabilities */}
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: `1px solid ${C.borderStrong}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: C.textSecondary,
                        background: C.surface,
                      }}
                    >
                      <Icon d={ICONS.cpu} size={11} />
                    </div>
                    <span style={{ ...labelStyle, color: C.textSecondary }}>Internal Instrumentation Capabilities</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginTop: 10 }}>
                    {buildCapabilities(inspectData).map((cap) => (
                      <CapabilityCard key={cap.title} {...cap} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Footer actions ──────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            padding: "12px 20px",
            borderTop: `1px solid ${C.border}`,
            background: "rgba(255,255,255,0.015)",
          }}
        >
          <button
            disabled
            title="Cloud execution arrives in Phase 2"
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.textDisabled,
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.02em",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              cursor: "not-allowed",
              fontFamily: TOKENS.fontSans,
            }}
          >
            <Icon d={ICONS.cloud} size={13} /> Run in Cloud (Phase 2)
          </button>
          <button
            onClick={() => {
              if (onSelectModel && selectedModelId) {
                onSelectModel(selectedModelId);
              } else if (selectedModelId) {
                useStore.getState().loadArchitecture(selectedModelId);
                onClose();
              } else {
                onClose();
              }
            }}
            onMouseEnter={() => setLocalHover(true)}
            onMouseLeave={() => setLocalHover(false)}
            style={{
              padding: "8px 18px",
              borderRadius: 6,
              border: `1px solid ${localHover ? "#52525b" : C.borderStrong}`,
              background: localHover ? "#222226" : C.surfaceHover,
              color: C.text,
              fontSize: "11.5px",
              fontWeight: 600,
              letterSpacing: "0.02em",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              cursor: "pointer",
              transition: "background 0.12s, border-color 0.12s",
              fontFamily: TOKENS.fontSans,
            }}
          >
            <Icon d={ICONS.download} size={13} /> Use Locally
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Left-column model row ─────────────────────────────────────────────────────
function ModelRow({
  id,
  description,
  family,
  minVram,
  recommended,
  author,
  downloads,
  likes,
  selected,
  onSelect,
  compactSearch = false,
}: {
  id: string;
  description?: string;
  family?: string;
  minVram?: number;
  recommended?: boolean;
  author?: string;
  downloads?: number;
  likes?: number;
  selected: boolean;
  onSelect: () => void;
  compactSearch?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const badge = recommended ? "HIGH" : "COMPATIBLE";
  const badgeStyle = {
    fontSize: "7.5px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    fontFamily: TOKENS.fontMono as string,
    padding: "1px 6px",
    borderRadius: 3,
    color: C.textSecondary,
    background: "transparent",
    border: `1px solid ${C.borderStrong}`,
    whiteSpace: "nowrap" as const,
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: `1px solid ${selected ? C.borderStrong : C.border}`,
        borderRadius: 6,
        padding: "9px 10px",
        cursor: "pointer",
        background: selected ? "rgba(255,255,255,0.055)" : hover ? "rgba(255,255,255,0.03)" : "transparent",
        transition: "background 0.12s, border-color 0.12s",
        textAlign: "left",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          style={{
            fontFamily: TOKENS.fontMono,
            fontSize: "11px",
            fontWeight: 600,
            color: C.text,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "-0.01em",
          }}
        >
          {id}
        </span>
        {recommended && (
          <span
            style={{
              ...badgeStyle,
              borderRadius: 4,
              padding: "1px 6px",
              flexShrink: 0,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {!compactSearch && (description || family || minVram) && (
        <>
          {description && (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "10px",
                lineHeight: 1.45,
                color: C.textSecondary,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {description}
            </p>
          )}
          {(family || minVram) && (
            <div
              style={{
                marginTop: 6,
                display: "flex",
                gap: 12,
                fontFamily: TOKENS.fontMono,
                fontSize: "9px",
                color: C.textMuted,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {family && (
                <span>
                  Family <span style={{ color: C.textSecondary }}>{family}</span>
                </span>
              )}
              {minVram != null && (
                <span>
                  Min VRAM <span style={{ color: C.textSecondary }}>{minVram} GB</span>
                </span>
              )}
            </div>
          )}
        </>
      )}
      {compactSearch && (author != null || downloads != null || likes != null) && (
        <div
          style={{
            marginTop: 4,
            display: "flex",
            gap: 10,
            fontFamily: TOKENS.fontMono,
            fontSize: "9px",
            color: C.textMuted,
          }}
        >
          {author ? <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "40%" }}>{author}</span> : null}
          {downloads != null ? <span>↓ {downloads.toLocaleString()}</span> : null}
          {likes != null ? <span>♥ {likes.toLocaleString()}</span> : null}
        </div>
      )}
    </div>
  );
}

// ─── Metric block ──────────────────────────────────────────────────────────────
function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: "10px 8px",
        textAlign: "center",
        background: C.surface,
        minWidth: 0,
      }}
    >
      <div style={{ ...labelStyle, fontSize: "8.5px" }}>{label}</div>
      <div style={{ marginTop: 4, fontFamily: TOKENS.fontMono, fontSize: "12.5px", fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </div>
    </div>
  );
}

// ─── Instrumentation capability card ───────────────────────────────────────────
function CapabilityCard({ title, supported, reason }: CapabilityRow) {
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: "10px",
        background: C.surface,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontFamily: TOKENS.fontMono, fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.05em", color: C.text }}>
          {title}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: "8px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: TOKENS.fontMono,
            padding: "2px 6px",
            borderRadius: 3,
            color: supported ? C.textSecondary : C.red,
            background: "transparent",
            border: `1px solid ${supported ? C.borderStrong : C.redBorder}`,
            flexShrink: 0,
          }}
        >
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: supported ? C.green : C.red }} />
          {supported ? "Supported" : "Unavailable"}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: "10px", lineHeight: 1.5, color: C.textMuted }}>
        {reason || (supported ? "Available for this model on the TokenPrint backend." : "Not exposed for this model/backend.")}
      </p>
    </div>
  );
}