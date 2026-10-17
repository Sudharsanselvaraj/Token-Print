import type { OpCatalogEntry, TokenFrame } from "./types";

// Shared playback geometry for Generation mode. The op catalog is the true
// execution order of ONE forward pass; autoplay walks it "layer by layer" while
// the token cursor (playIndex) advances "token by token". These helpers map an
// op to the stack layer it belongs to and find the op indices that begin each
// new layer, so autoplay / skip / the 3D scene all agree.

/** Which stack layer an op lights up: -1 embeddings, i a block, nLayers output. */
export function activeLayerOf(
  op: OpCatalogEntry | undefined,
  nLayers: number,
): number | null {
  if (!op) return null;
  if (op.layer != null) return op.layer;
  if (op.op_key === "embedding") return -1;
  if (op.op_key === "output") return nLayers;
  return null;
}

/**
 * Op indices that begin each new active layer, in execution order:
 * [embedding, layer 0, layer 1, …, layer N-1, output]. Ops with no slab
 * (e.g. the final pre-output norm) are folded into the surrounding layer.
 */
export function layerAnchors(
  catalog: OpCatalogEntry[],
  nLayers: number,
): number[] {
  const anchors: number[] = [];
  let prev: number | null = null;
  for (let i = 0; i < catalog.length; i++) {
    const al = activeLayerOf(catalog[i], nLayers);
    if (al == null) continue;
    if (al !== prev) {
      anchors.push(i);
      prev = al;
    }
  }
  return anchors;
}

/** Position within `anchors` of the anchor at or before `opIndex`. */
export function anchorPosFor(anchors: number[], opIndex: number): number {
  let pos = 0;
  for (let i = 0; i < anchors.length; i++) {
    if (anchors[i] <= opIndex) pos = i;
    else break;
  }
  return pos;
}

/**
 * Map an anchor position index to the corresponding transformer layer index.
 *
 * Anchors in Token-Print start with the embedding layer (activeLayer = -1)
 * when an embedding operation is present. This function maps:
 *   - embedding anchor (or pre-transformer ops) -> -1
 *   - transformer layers 0 .. numLayers - 1 -> 0 .. numLayers - 1
 *   - output layer -> numLayers
 *
 * @param catalog     The operation catalog.
 * @param anchors     The anchor op indices from layerAnchors().
 * @param anchorPos   The current anchor position index from anchorPosFor().
 * @param numLayers   Total transformer layers.
 * @returns The transformer layer index (0 .. numLayers - 1), or -1 for embedding / pre-transformer.
 */
export function anchorToLayerIndex(
  catalog: OpCatalogEntry[],
  anchors: number[],
  anchorPos: number,
  numLayers: number,
): number {
  if (!anchors.length || anchorPos < 0 || anchorPos >= anchors.length) {
    return -1;
  }
  const opIdx = anchors[anchorPos];
  const op = catalog[opIdx];
  if (op) {
    const al = activeLayerOf(op, numLayers);
    if (al != null) return al;
  }
  const hasEmbedding = anchors.length > numLayers;
  return hasEmbedding ? anchorPos - 1 : anchorPos;
}

export type Phase = "prefill" | "decode";

export interface PhaseInfo {
  phase: Phase;
  positions: number; // real tokens computed at this step
  cacheLen: number; // real cached positions reused
  label: string;
  detail: string;
}

/**
 * Real KV-cache phase for the token at `playIndex`. Prefers the backend's own
 * per-frame fields; falls back to deriving from the step index + prompt length
 * (step 0 is the prefill over the whole prompt, every later step is decode).
 * Returns null when the trace isn't from a KV-cached run.
 */
export function phaseInfo(
  frame: TokenFrame | null | undefined,
  promptLen: number,
  usesCache: boolean | undefined,
): PhaseInfo | null {
  if (!frame) return null;
  const hasReal = frame.phase != null;
  if (!hasReal && !usesCache) return null;

  const phase: Phase = frame.phase ?? (frame.step === 0 ? "prefill" : "decode");
  const positions = frame.n_positions ?? (phase === "prefill" ? promptLen : 1);
  const cacheLen = frame.cache_len ?? (phase === "prefill" ? 0 : promptLen + frame.step - 1);

  return phase === "prefill"
    ? {
      phase,
      positions,
      cacheLen,
      label: "Pre-fill",
      detail: `building KV cache · ${positions} prompt tokens computed`,
    }
    : {
      phase,
      positions,
      cacheLen,
      label: "Decode",
      detail: `reusing cache · ${positions} new token, ${cacheLen} cached`,
    };
}

export function getOpFromCatalogOrIndex(
  catalog: OpCatalogEntry[] | undefined,
  opIndex: number,
  nLayers: number,
): { layer: number | null; label?: string; op_key?: string } {
  if (catalog && catalog[opIndex]) {
    const op = catalog[opIndex];
    return {
      ...op,
      layer: activeLayerOf(op, nLayers),
    };
  }
  const fallbackLayer =
    opIndex < 0 ? -1 : opIndex >= nLayers ? nLayers : opIndex;
  return {
    layer: fallbackLayer,
    label: `Layer ${fallbackLayer}`,
  };
}

