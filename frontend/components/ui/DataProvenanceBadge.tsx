"use client";

import React from "react";

export type DataOrigin = "real" | "derived" | "conceptual" | "simulation";

interface DataProvenanceBadgeProps {
  origin: DataOrigin;
  label?: string;
  style?: React.CSSProperties;
}

const BADGE_CONFIG: Record<
  DataOrigin,
  { symbol: string; text: string; bg: string; color: string; desc: string }
> = {
  real: {
    symbol: "",
    text: "REAL",
    bg: "rgba(34, 197, 94, 0.15)",
    color: "#4ade80",
    desc: "Captured directly from live PyTorch execution or binary file header.",
  },
  derived: {
    symbol: "",
    text: "DERIVED",
    bg: "rgba(255, 255, 255, 0.1)",
    color: "#e2e8f0",
    desc: "Computed mathematically from real model data (e.g. PCA, norms, entropy).",
  },
  conceptual: {
    symbol: "",
    text: "CONCEPTUAL",
    bg: "rgba(168, 85, 247, 0.15)",
    color: "#c084fc",
    desc: "Visual 3D geometry representing real architectural proportions.",
  },
  simulation: {
    symbol: "",
    text: "SIMULATION",
    bg: "rgba(245, 158, 11, 0.15)",
    color: "#fbbf24",
    desc: "Educational fallback / proxy value. Not a direct model measurement.",
  },
};

export default function DataProvenanceBadge({
  origin,
  label,
  style,
}: DataProvenanceBadgeProps) {
  const cfg = BADGE_CONFIG[origin] ?? BADGE_CONFIG.real;

  return (
    <span
      className="provenance-badge"
      title={cfg.desc}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 6px",
        borderRadius: "4px",
        fontSize: "10px",
        fontWeight: "700",
        letterSpacing: "0.5px",
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}40`,
        lineHeight: "1",
        cursor: "help",
        ...style,
      }}
    >
      {cfg.symbol ? <span>{cfg.symbol}</span> : null}
      <span>{label ?? cfg.text}</span>
    </span>
  );
}
