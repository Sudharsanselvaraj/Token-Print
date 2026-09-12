/**
 * ArchitectureLayout.ts
 *
 * Single source of truth for all 3D world positions in the Transformer
 * Architecture scene. Every component (SpatialArchitectureScene,
 * TransformerLayer3D, CameraController) reads from here — no hardcoded
 * coordinates elsewhere.
 *
 * Coordinate system:
 *   Y = flows downward through the model (Embedding at top, LM Head at bottom)
 *   X = computation branches (Q left, K center, V right, residual spine far left)
 *   Z = physical depth (attention/MLP pushed back, residual spine forward)
 */

export const LAYOUT = {
  // Per-layer Y spacing. 24 layers × 14 units = 336 units total depth.
  LAYER_HEIGHT: 14,

  // X positions for computation branches within a layer
  SPINE_X: -8.5,       // residual stream spine
  BRANCH_Q_X: -5.2,    // Q projection
  BRANCH_K_X:  0.0,    // K projection
  BRANCH_V_X:  5.2,    // V projection

  // Z positions (depth hierarchy)
  SPINE_Z:    0.0,    // residual axis at Z = 0
  NORM_Z:     0.0,    // norms on main axis
  QKV_Z:     -2.0,    // projections at Z = -2
  ROPE_Z:    -4.0,    // RoPE rotation stage at Z = -4
  ATTN_Z:    -6.0,    // attention matrix surface at Z = -6
  MLP_Z:      3.0,    // MLP branching assembly at Z = +3

  // Block sizes [width, height, depth]
  NORM_SIZE:  [7.0, 0.9, 0.6] as [number, number, number],
  QKV_SIZE:   [3.4, 1.6, 1.0] as [number, number, number],
  ATTN_SIZE:  [8.5, 2.0, 1.2] as [number, number, number],
  O_SIZE:     [7.0, 1.4, 0.8] as [number, number, number],
  MLP_SIZE:   [3.4, 1.6, 1.0] as [number, number, number],
  EMBED_SIZE: [10.0, 1.8, 1.0] as [number, number, number],
  LM_SIZE:    [10.0, 2.0, 1.2] as [number, number, number],
  RES_SIZE:   [5.0, 0.7, 0.6] as [number, number, number],

  // Special block positions (absolute Y)
  EMBED_Y:      10,
  LAYER_0_Y:    0,    // layer 0 starts here; l > 0: layerOrigin(l)
  FINAL_NORM_Y_OFFSET: 4, // below last layer
  LM_HEAD_Y_OFFSET:    8,
} as const;

/**
 * Returns the Y-origin for layer l (0-indexed).
 * Layer 0 is at Y=0, Layer 1 at Y=-14, etc.
 */
export function layerOrigin(l: number): [number, number, number] {
  return [0, -l * LAYOUT.LAYER_HEIGHT, 0];
}

/**
 * Returns the absolute world-space centre of the given op node.
 * Used by the camera controller for bounding-box-based focus.
 */
export function nodeWorldPos(opId: string, numLayers = 24): [number, number, number] {
  // Embedding
  if (opId === "op_embed") return [0, LAYOUT.EMBED_Y, LAYOUT.NORM_Z];

  // Final Norm
  if (opId === "op_final_norm") {
    const lastLayerY = -((numLayers - 1) * LAYOUT.LAYER_HEIGHT);
    return [0, lastLayerY - LAYOUT.FINAL_NORM_Y_OFFSET, LAYOUT.NORM_Z];
  }

  // LM Head
  if (opId === "op_lm_head") {
    const lastLayerY = -((numLayers - 1) * LAYOUT.LAYER_HEIGHT);
    return [0, lastLayerY - LAYOUT.LM_HEAD_Y_OFFSET - 2, LAYOUT.NORM_Z];
  }

  // Per-layer ops: "op_l{l}_{kind}"
  const layerMatch = opId.match(/^op_l(\d+)_(.+)$/);
  if (!layerMatch) return [0, 0, 0];

  const l = parseInt(layerMatch[1], 10);
  const kind = layerMatch[2];
  const [, ly] = layerOrigin(l);

  const offsets: Record<string, [number, number, number]> = {
    norm1:            [0,                       2.8,  LAYOUT.NORM_Z],
    attn_q:           [LAYOUT.BRANCH_Q_X,       1.2,  LAYOUT.QKV_Z],
    attn_k:           [LAYOUT.BRANCH_K_X,       1.2,  LAYOUT.QKV_Z - 0.5],
    attn_v:           [LAYOUT.BRANCH_V_X,       1.2,  LAYOUT.QKV_Z],
    rope:             [LAYOUT.BRANCH_V_X + 0.4, 1.2,  LAYOUT.NORM_Z],
    attn_scores:      [0,                      -0.5,  LAYOUT.ATTN_Z],
    attn_scale:       [0,                      -0.5,  LAYOUT.ATTN_Z],
    attn_mask:        [0,                      -0.5,  LAYOUT.ATTN_Z],
    attn_softmax:     [0,                      -0.5,  LAYOUT.ATTN_Z],
    attn_weighted_v:  [0,                      -0.5,  LAYOUT.ATTN_Z],
    attn_o:           [0,                      -2.2,  LAYOUT.QKV_Z],
    res_add1:         [LAYOUT.SPINE_X,         -2.2,  LAYOUT.SPINE_Z],
    norm2:            [0,                      -4.0,  LAYOUT.NORM_Z],
    mlp_gate:         [LAYOUT.BRANCH_Q_X,      -5.5,  LAYOUT.MLP_Z],
    mlp_up:           [LAYOUT.BRANCH_K_X,      -5.5,  LAYOUT.MLP_Z - 0.4],
    swiglu:           [LAYOUT.BRANCH_K_X,      -5.5,  LAYOUT.MLP_Z + 0.4],
    mlp_down:         [LAYOUT.BRANCH_V_X,      -5.5,  LAYOUT.MLP_Z],
    res_add2:         [LAYOUT.SPINE_X,         -7.0,  LAYOUT.SPINE_Z],
  };

  const off = offsets[kind] ?? [0, 0, 0];
  return [off[0], ly + off[1], off[2]];
}

/**
 * Returns a camera position and lookAt target to cleanly frame the given op.
 * Pulls back proportional to the op block size so the camera never clips.
 */
export function cameraForOp(opId: string, numLayers = 24): {
  position: [number, number, number];
  target: [number, number, number];
} {
  const [tx, ty, tz] = nodeWorldPos(opId, numLayers);
  return {
    position: [tx + 4, ty + 3, tz + 14],
    target:   [tx,     ty,     tz],
  };
}

/**
 * Returns a camera position to frame an entire layer cleanly.
 */
export function cameraForLayer(l: number): {
  position: [number, number, number];
  target: [number, number, number];
} {
  const [, ly] = layerOrigin(l);
  const cy = ly - LAYOUT.LAYER_HEIGHT / 2 + 1;
  return {
    position: [0, cy + 4, 22],
    target:   [0, cy,     0],
  };
}

/**
 * Overview camera that frames the full model (embedding → lm_head).
 */
export function cameraOverview(numLayers = 24): {
  position: [number, number, number];
  target: [number, number, number];
} {
  const topY = LAYOUT.EMBED_Y + 2;
  const botY = -((numLayers - 1) * LAYOUT.LAYER_HEIGHT) - LAYOUT.LM_HEAD_Y_OFFSET - 4;
  const midY = (topY + botY) / 2;
  const height = topY - botY;
  // Push camera back enough to see the full model height with ~45° FOV
  const dist = Math.max(height * 0.9, 55);
  return {
    position: [6, midY + height * 0.08, dist],
    target:   [0, midY,                  0],
  };
}
