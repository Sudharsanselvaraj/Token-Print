"use client";

import React from "react";

// ─── Design Tokens (Strictly Monochrome UI Palette) ───────────────────────────
export const TOKENS = {
  bg: "var(--ui-bg, #050505)",
  surface: "radial-gradient(ellipse at 50% 40%, #161618 0%, #0a0a0b 100%)",
  surfaceFlat: "var(--ui-surface, #0b0b0b)",
  surfaceRaised: "var(--ui-surface-raised, #111111)",
  surfaceHover: "var(--ui-surface-hover, #181818)",
  border: "var(--ui-border, #252525)",
  borderStrong: "var(--ui-border-strong, #383838)",
  borderSubtle: "var(--ui-border, #252525)",
  textPrimary: "var(--ui-text, #f5f5f5)",
  textSecondary: "var(--ui-text-secondary, #a3a3a3)",
  textMuted: "var(--ui-text-muted, #737373)",
  textDisabled: "var(--ui-text-disabled, #4a4a4a)",
  accentPrimary: "#ffffff",
  accentHover: "#e5e5e5",
  accentMuted: "rgba(255, 255, 255, 0.08)",
  radiusSm: "var(--radius-sm, 4px)",
  radiusMd: "var(--radius-md, 6px)",
  radiusLg: "var(--radius-lg, 8px)",
  fontSans: "var(--font-sans, Inter, system-ui, sans-serif)",
  fontMono: "var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace)",
} as const;

// ─── Panel Container ─────────────────────────────────────────────────────────
export function Panel({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: TOKENS.bg,
        color: TOKENS.textPrimary,
        fontFamily: TOKENS.fontSans,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        borderRight: `1px solid ${TOKENS.border}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
export function Section({
  children,
  style,
  noBorder = false,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  noBorder?: boolean;
}) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderBottom: noBorder ? "none" : `1px solid ${TOKENS.border}`,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  action,
  subtitle,
}: {
  title: string;
  action?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "4px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: "10px",
            fontFamily: TOKENS.fontSans,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: TOKENS.textMuted,
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
        {action}
      </div>
      {subtitle && (
        <span style={{ fontSize: "11px", color: TOKENS.textSecondary }}>{subtitle}</span>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  children,
  style,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? TOKENS.surfaceRaised : TOKENS.surface,
        border: `1px solid ${active ? TOKENS.borderStrong : TOKENS.border}`,
        borderRadius: TOKENS.radiusMd,
        padding: "10px 12px",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s, background 0.15s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({
  children,
  onClick,
  active = false,
  disabled = false,
  variant = "secondary",
  style,
  title,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  style?: React.CSSProperties;
  title?: string;
}) {
  const isPrimary = variant === "primary" || active;
  const isGhost = variant === "ghost";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        height: "28px",
        padding: "0 10px",
        fontSize: "11px",
        fontFamily: TOKENS.fontSans,
        fontWeight: isPrimary ? 600 : 400,
        borderRadius: TOKENS.radiusSm,
        border: isGhost
          ? "1px solid transparent"
          : isPrimary
          ? `1px solid ${TOKENS.borderStrong}`
          : `1px solid ${TOKENS.border}`,
        background: isPrimary
          ? TOKENS.surfaceHover
          : isGhost
          ? "transparent"
          : TOKENS.surfaceRaised,
        color: isPrimary ? TOKENS.textPrimary : disabled ? TOKENS.textDisabled : TOKENS.textSecondary,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── Icon Button ──────────────────────────────────────────────────────────────
export function IconButton({
  icon,
  onClick,
  active = false,
  title,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: "24px",
        height: "24px",
        padding: 0,
        fontSize: "11px",
        borderRadius: TOKENS.radiusSm,
        border: `1px solid ${active ? TOKENS.borderStrong : TOKENS.border}`,
        background: active ? TOKENS.surfaceHover : "transparent",
        color: active ? TOKENS.textPrimary : TOKENS.textMuted,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s",
      }}
    >
      {icon}
    </button>
  );
}

// ─── Metric & MetricGrid ──────────────────────────────────────────────────────
export function Metric({ label, value, mono = true }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div
      style={{
        padding: "8px 10px",
        background: TOKENS.surface,
        borderRadius: TOKENS.radiusMd,
        border: `1px solid ${TOKENS.border}`,
      }}
    >
      <div style={{ fontSize: "9px", color: TOKENS.textMuted, letterSpacing: "0.08em", marginBottom: "3px" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "12px",
          fontFamily: mono ? TOKENS.fontMono : TOKENS.fontSans,
          color: TOKENS.textPrimary,
          fontWeight: 600,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function MetricGrid({ children, columns = 2 }: { children: React.ReactNode; columns?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: "6px",
      }}
    >
      {children}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider() {
  return <div style={{ height: "1px", background: TOKENS.border, margin: "4px 0" }} />;
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({
  children,
  accent = false,
  color,
}: {
  children: React.ReactNode;
  accent?: boolean;
  color?: string;
}) {
  return (
    <span
      style={{
        fontSize: "10px",
        fontFamily: TOKENS.fontMono,
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: TOKENS.radiusSm,
        background: color ? `${color}18` : accent ? TOKENS.surfaceHover : TOKENS.surfaceRaised,
        color: color || (accent ? TOKENS.textPrimary : TOKENS.textSecondary),
        border: `1px solid ${color ? `${color}33` : accent ? TOKENS.borderStrong : TOKENS.border}`,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {children}
    </span>
  );
}
