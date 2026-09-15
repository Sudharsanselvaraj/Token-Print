import type { Mode } from "./types";

/**
 * Canonical `?mode=` -> route mode mapping.
 *
 * The URL is the single source of truth for which workspace/page is rendered.
 * `?mode=` is the compatibility carrier for the single /app route + static
 * export. Every known legacy/alias value maps to its canonical Mode, and every
 * unknown or missing value normalizes to "explorer" so stale or invalid state
 * can never fall through to Generation or another unintended workspace.
 */
const ROUTE_MODE_ALIASES: Record<string, Mode> = {
  explorer: "explorer",
  architecture: "explorer",
  generation: "generation",
  walkthrough: "walkthrough",
  debugger: "debugger",
};

/** Normalize a raw `?mode=` value to a canonical workspace Mode. */
export function normalizeModeParam(raw: string | null | undefined): Mode {
  if (!raw) return "explorer";
  return ROUTE_MODE_ALIASES[raw.trim().toLowerCase()] ?? "explorer";
}