import { Color } from "three";

export type OpKind = "embedding" | "norm" | "attn" | "mlp" | "output";

export type RGB = [number, number, number];

/* Monochrome per-fine-grained-operation luminance map.
   Communicates operation structure via grayscale brightness levels. */
export const OP_COLORS: Record<string, RGB> = {
  embedding: [0.85, 0.85, 0.85],
  norm: [0.45, 0.45, 0.45],
  "attn.q": [0.92, 0.92, 0.92],
  "attn.k": [0.85, 0.85, 0.85],
  "attn.v": [0.78, 0.78, 0.78],
  attention: [0.95, 0.95, 0.95],
  "attn.o": [0.88, 0.88, 0.88],
  "mlp.gate": [0.72, 0.72, 0.72],
  "mlp.up": [0.68, 0.68, 0.68],
  "mlp.down": [0.60, 0.60, 0.60],
  output: [0.90, 0.90, 0.90],
};

/* Monochrome per-component-class luminance map. */
export const KIND_COLORS: Record<OpKind, RGB> = {
  norm: [0.45, 0.45, 0.45],
  mlp: [0.68, 0.68, 0.68],
  output: [0.90, 0.90, 0.90],
  attn: [0.95, 0.95, 0.95],
  embedding: [0.85, 0.85, 0.85],
};

/* Shared monochrome material base tints. */
export const GRAY = new Color(0.50, 0.50, 0.50);
export const DIM = new Color(0.20, 0.20, 0.20);
export const HOVER_GLOW = new Color(1, 1, 1);

/* Lighten a base colour when hovered (but not already active). */
export function hoverColor(base: Color, hovered: boolean, active: boolean): Color {
  if (hovered && !active) return base.clone().lerp(HOVER_GLOW, 0.25);
  return base;
}

/* Resolve an op_key to an RGB triple, falling back to the OpKind default. */
export function opColorOf(opKey: string | undefined, kind: OpKind): RGB {
  if (opKey && OP_COLORS[opKey]) return OP_COLORS[opKey];
  return KIND_COLORS[kind];
}

/* Map a real op_key string to the coarse component class. */
export function opKindOf(opKey: string | undefined): OpKind | null {
  if (!opKey) return null;
  if (opKey === "embedding") return "embedding";
  if (opKey === "output") return "output";
  if (opKey === "attention" || opKey.startsWith("attn")) return "attn";
  if (opKey.startsWith("mlp")) return "mlp";
  if (opKey.startsWith("norm") || opKey === "norm") return "norm";
  return null;
}
