import type { TensorInfo } from "./types";
import { ROLE_COLORS } from "./tensorName";

// Build a point cloud from a tensor list. Each depth (embeddings, each layer,
// output head) becomes one uniform vertical PANEL; the panels recede along -Z
// like the reference tools. A panel's point *density* reflects the real
// parameter count at that depth, and points are partitioned among that depth's
// tensors (contiguous columns) so a hovered point maps back to a real tensor.

export interface PointCloud {
  positions: Float32Array;
  colors: Float32Array;
  ids: Uint32Array; // tensor index per point (for hover picking)
  count: number;
  half: [number, number, number];
  depthCount: number;
}

const PW = 10; // panel width (X)
const PH = 13; // panel height (Y)
const DZ = 5.2; // depth spacing (Z)

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
}

function depthOf(t: TensorInfo, numLayers: number): number {
  if (t.layer != null) return t.layer + 1;
  if (t.role === "embedding" || t.role === "position") return 0;
  return numLayers + 1;
}

export function buildPointCloud(
  tensors: TensorInfo[],
  opts: { budget: number; colorBy: "layer" | "role" },
): PointCloud {
  const numLayers =
    tensors.reduce((m, t) => Math.max(m, t.layer ?? -1), -1) + 1;
  const maxDepth = numLayers + 1;

  // Group tensor indices by depth.
  const byDepth = new Map<number, number[]>();
  for (let i = 0; i < tensors.length; i++) {
    const d = depthOf(tensors[i], numLayers);
    (byDepth.get(d) ?? byDepth.set(d, []).get(d)!).push(i);
  }

  const totalParams = tensors.reduce((s, t) => s + Math.max(1, t.n_params), 0);

  // Per-depth point allocation ∝ its params (min so empty-ish panels still show).
  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  const depthParams = new Map<number, number>();
  for (const d of depths)
    depthParams.set(
      d,
      byDepth.get(d)!.reduce((s, i) => s + Math.max(1, tensors[i].n_params), 0),
    );
  const alloc = new Map<number, number>();
  let total = 0;
  for (const d of depths) {
    const a = Math.max(
      400,
      Math.round((opts.budget * depthParams.get(d)!) / totalParams),
    );
    alloc.set(d, a);
    total += a;
  }

  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  const ids = new Uint32Array(total);

  const zc = (maxDepth * DZ) / 2;
  let ptr = 0;

  for (const d of depths) {
    const idxs = byDepth.get(d)!;
    const k = alloc.get(d)!;
    const z = -d * DZ + zc;
    const cols = Math.max(1, Math.round(Math.sqrt((k * PW) / PH)));
    const rows = Math.ceil(k / cols);

    // Column boundaries assigning contiguous point-columns to each tensor,
    // proportional to that tensor's params.
    const dParams = depthParams.get(d)!;
    let acc = 0;
    const bounds: { end: number; ti: number }[] = [];
    for (const ti of idxs) {
      acc += Math.max(1, tensors[ti].n_params) / dParams;
      bounds.push({ end: acc, ti });
    }

    const tint =
      opts.colorBy === "layer"
        ? hslToRgb(0.75 - 0.32 * (d / maxDepth), 0.85, 0.48 + 0.16 * (d / maxDepth))
        : null;

    for (let p = 0; p < k; p++) {
      const c = p % cols;
      const r = Math.floor(p / cols);
      const fx = cols > 1 ? c / (cols - 1) : 0.5; // 0..1 across width
      const o = ptr * 3;
      positions[o] = (fx - 0.5) * PW + (Math.random() - 0.5) * (PW / cols) * 0.6;
      positions[o + 1] =
        (r / Math.max(1, rows - 1) - 0.5) * PH +
        (Math.random() - 0.5) * (PH / rows) * 0.6;
      positions[o + 2] = z + (Math.random() - 0.5) * 0.8;

      // Which tensor owns this column?
      let ti = bounds[bounds.length - 1].ti;
      for (const b of bounds)
        if (fx <= b.end) {
          ti = b.ti;
          break;
        }
      ids[ptr] = ti;

      const col =
        tint ?? ROLE_COLORS[tensors[ti].role ?? "other"] ?? ROLE_COLORS.other;
      colors[o] = col[0];
      colors[o + 1] = col[1];
      colors[o + 2] = col[2];
      ptr++;
    }
  }

  return {
    positions,
    colors,
    ids,
    count: total,
    half: [PW / 2, PH / 2, (maxDepth * DZ) / 2],
    depthCount: maxDepth + 1,
  };
}
