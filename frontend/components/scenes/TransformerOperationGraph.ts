/**
 * TransformerOperationGraph.ts
 *
 * Canonical 18-step per-layer operation sequence for a decoder-only
 * transformer (Qwen-0.5B / LLaMA-family). Consumed identically by:
 *   - PlaybackEngine   (architecture-mode auto-play)
 *   - SpatialArchitectureScene (active node highlighting)
 *   - TransformerLayer3D       (activeOpKind highlighting)
 *   - TransformerControlBar3D  (label display)
 *   - ModelMiniMap             (layer indicator)
 *   - Scene CameraController   (focus target)
 *   - ContextualExplanationOverlay (explanation copy)
 */

export type OperationKind =
  | "embedding"
  | "norm1"
  | "attn_q"
  | "attn_k"
  | "attn_v"
  | "rope"
  | "attn_scores"
  | "attn_scale"
  | "attn_mask"
  | "attn_softmax"
  | "attn_weighted_v"
  | "attn_o"
  | "res_add1"
  | "norm2"
  | "mlp_gate"
  | "mlp_up"
  | "swiglu"
  | "mlp_down"
  | "res_add2"
  | "final_norm"
  | "lm_head";

export interface TransformerOperation {
  id: string;
  layer: number | null;  // null for embedding/final_norm/lm_head
  kind: OperationKind;
  order: number;         // global 0-indexed sequence position
  label: string;         // short human label
  sublabel: string;      // formula / dimension string
  tensorName?: string;   // maps to architecture tensor for inspector
}

export interface TokenJourneyPoint {
  tokenIndex: number;
  layer: number;
  operationId: string;
  position: [number, number, number];
}

/** 18-step per-layer sequence definition */
export const LAYER_STEP_NAMES: { kind: OperationKind; label: string; sublabel: string }[] = [
  { kind: "norm1",           label: "RMSNorm 1",          sublabel: "RMSNorm(x, ε=1e-6)" },
  { kind: "attn_q",          label: "Q Projection",        sublabel: "W_q · x" },
  { kind: "attn_k",          label: "K Projection",        sublabel: "W_k · x" },
  { kind: "attn_v",          label: "V Projection",        sublabel: "W_v · x" },
  { kind: "rope",            label: "RoPE",                sublabel: "Rotary Positional Embedding" },
  { kind: "attn_scores",     label: "Attn Scores",         sublabel: "Q · Kᵀ" },
  { kind: "attn_scale",      label: "Scale √d_k",          sublabel: "÷ √d_k" },
  { kind: "attn_mask",       label: "Causal Mask",         sublabel: "Triangular mask" },
  { kind: "attn_softmax",    label: "Softmax",             sublabel: "Softmax(QKᵀ/√d_k)" },
  { kind: "attn_weighted_v", label: "Weighted V",          sublabel: "Softmax(·) · V" },
  { kind: "attn_o",          label: "O Projection",        sublabel: "W_o · Attn" },
  { kind: "res_add1",        label: "Residual Add 1",      sublabel: "x = x + Attn" },
  { kind: "norm2",           label: "RMSNorm 2",           sublabel: "RMSNorm(x + Attn)" },
  { kind: "mlp_gate",        label: "Gate Projection",     sublabel: "W_gate · x" },
  { kind: "mlp_up",          label: "Up Projection",       sublabel: "W_up · x" },
  { kind: "swiglu",          label: "SwiGLU",              sublabel: "SiLU(Gate) ⊙ Up" },
  { kind: "mlp_down",        label: "Down Projection",     sublabel: "W_down · SwiGLU" },
  { kind: "res_add2",        label: "Residual Add 2",      sublabel: "x = x + MLP" },
];

/** Human-readable label for an OperationKind */
export function kindLabel(kind: OperationKind): string {
  const found = LAYER_STEP_NAMES.find((s) => s.kind === kind);
  if (found) return found.label;
  if (kind === "embedding") return "Embedding";
  if (kind === "final_norm") return "Final RMSNorm";
  if (kind === "lm_head") return "LM Head";
  return kind;
}

/** Builds the full canonical operation graph for numLayers layers. */
export function buildOperationGraph(numLayers = 24): TransformerOperation[] {
  const graph: TransformerOperation[] = [];
  let order = 0;

  // 1. Embedding
  graph.push({
    id: "op_embed",
    layer: null,
    kind: "embedding",
    order: order++,
    label: "Input Embeddings",
    sublabel: "Token + RoPE Position Embeddings",
    tensorName: "embed_tokens",
  });

  // 2. 24 × 18 per-layer ops
  for (let l = 0; l < numLayers; l++) {
    for (const step of LAYER_STEP_NAMES) {
      const tensorName = (() => {
        switch (step.kind) {
          case "norm1":   return `model.layers.${l}.input_layernorm.weight`;
          case "attn_q":  return `model.layers.${l}.self_attn.q_proj.weight`;
          case "attn_k":  return `model.layers.${l}.self_attn.k_proj.weight`;
          case "attn_v":  return `model.layers.${l}.self_attn.v_proj.weight`;
          case "attn_o":  return `model.layers.${l}.self_attn.o_proj.weight`;
          case "norm2":   return `model.layers.${l}.post_attention_layernorm.weight`;
          case "mlp_gate":return `model.layers.${l}.mlp.gate_proj.weight`;
          case "mlp_up":  return `model.layers.${l}.mlp.up_proj.weight`;
          case "mlp_down":return `model.layers.${l}.mlp.down_proj.weight`;
          default:        return undefined;
        }
      })();
      graph.push({
        id: `op_l${l}_${step.kind}`,
        layer: l,
        kind: step.kind,
        order: order++,
        label: step.label,
        sublabel: step.sublabel,
        tensorName,
      });
    }
  }

  // 3. Final Norm + LM Head
  graph.push({
    id: "op_final_norm",
    layer: null,
    kind: "final_norm",
    order: order++,
    label: "Final RMSNorm",
    sublabel: "RMSNorm(x_final)",
    tensorName: "model.norm.weight",
  });
  graph.push({
    id: "op_lm_head",
    layer: null,
    kind: "lm_head",
    order: order++,
    label: "LM Head",
    sublabel: "Logits = x · W_lm",
    tensorName: "lm_head.weight",
  });

  return graph;
}

// ─── Singleton graph (24 layers) ──────────────────────────────────────────────

const _graph = buildOperationGraph(24);

/** Ordered flat list of all operation IDs: 1 + 24×18 + 2 = 435 entries */
export const OP_ID_LIST: string[] = _graph.map((op) => op.id);

/** O(1) lookup by operation ID */
export const opById: Map<string, TransformerOperation> = new Map(
  _graph.map((op) => [op.id, op])
);

/** Returns the previous operation ID (or null at the start) */
export function prevOpId(id: string): string | null {
  const op = opById.get(id);
  if (!op) return null;
  return _graph[op.order - 1]?.id ?? null;
}

/** Returns the next operation ID (or null at the end) */
export function nextOpId(id: string): string | null {
  const op = opById.get(id);
  if (!op) return null;
  return _graph[op.order + 1]?.id ?? null;
}

/** First operation in a layer — used by mini-map and layer navigation */
export function firstOpOfLayer(l: number): string {
  return `op_l${l}_norm1`;
}

/** Returns the TokenJourneyPoint for the selected token in a given layer */
export function getTokenJourneyPoint(
  tokenIndex: number,
  layer: number,
  totalLayers = 24
): TokenJourneyPoint {
  const tokenX = (tokenIndex - 2) * 2.1 * 0.35;
  if (layer < 0) {
    return { tokenIndex, layer: -1, operationId: "op_embed", position: [tokenX, 10, 1] };
  }
  if (layer >= totalLayers) {
    return { tokenIndex, layer: totalLayers, operationId: "op_lm_head", position: [0, -(totalLayers * 14) - 10, 0] };
  }
  const y = -(layer * 14) - 7;
  return { tokenIndex, layer, operationId: `op_l${layer}_res_add2`, position: [tokenX, y, 1] };
}
