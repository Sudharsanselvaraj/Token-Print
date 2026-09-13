/**
 * executionGraph.ts
 *
 * Canonical Graph-based Computational Model for Transformer Execution.
 * Defines nodes, ports, edges, execution stages, and deterministic routing paths.
 */

export type ExecutionStageType =
  | "INPUT"
  | "EMBEDDING"
  | "NORM_1"
  | "QKV_PROJECTION"
  | "ROPE"
  | "QK_TRANSPOSE"
  | "SCALE"
  | "MASK"
  | "SOFTMAX"
  | "WEIGHTED_V"
  | "O_PROJECTION"
  | "RESIDUAL_1"
  | "NORM_2"
  | "GATE_UP"
  | "SWIGLU"
  | "DOWN"
  | "RESIDUAL_2"
  | "NEXT_LAYER"
  | "FINAL_NORM"
  | "LM_HEAD"
  | "LOGITS"
  | "PREDICTION";

export type PacketSemanticType =
  | "TOKEN"       // Cyan (#06b6d4)
  | "Q"           // Green (#22c55e)
  | "K"           // Blue (#3b82f6)
  | "V"           // Orange (#f97316)
  | "ATTENTION"   // Purple (#a855f7)
  | "RESIDUAL"    // Silver (#e2e8f0)
  | "MLP";        // Amber (#f59e0b)

export interface Port3D {
  id: string;
  position: [number, number, number];
}

export interface GraphNode3D {
  id: string;
  stage: ExecutionStageType;
  layer: number | null;
  label: string;
  sublabel: string;
  position: [number, number, number];
  inputPort: Port3D;
  outputPort: Port3D;
  opKey?: string;
}

export interface GraphEdge3D {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  route: [number, number, number][];
  semanticType: PacketSemanticType;
}

export type CameraShotType =
  | "ESTABLISH"
  | "APPROACH"
  | "FOLLOW"
  | "FOCUS"
  | "TRANSITION"
  | "PULLBACK"
  | "PREDICTION";

export interface TimelineStep {
  stepIndex: number;
  stage: ExecutionStageType;
  layer: number | null;
  nodeId: string;
  edgeId: string | null;
  packetType: PacketSemanticType | null;
  cameraShot: CameraShotType;
  label: string;
  sublabel: string;
  durationMs: number; // base duration at 1x speed
}

export const LAYER_GAP = 3.4;

export function getStageNodePos(stage: ExecutionStageType, layer: number | null, nLayers = 24): [number, number, number] {
  const midY = -((nLayers + 1) * LAYER_GAP) / 2;
  if (layer === null) {
    if (stage === "INPUT" || stage === "EMBEDDING") {
      return [0, 0, 0];
    }
    const outY = -(nLayers + 1) * LAYER_GAP;
    if (stage === "FINAL_NORM") return [0, outY + 1.2, 0];
    if (stage === "LM_HEAD") return [0, outY, 0];
    if (stage === "LOGITS" || stage === "PREDICTION") return [0, outY - 1.5, 0];
    return [0, midY, 0];
  }

  const ly = -(layer + 1) * LAYER_GAP;

  switch (stage) {
    case "NORM_1":          return [0, ly + 1.2, 0];
    case "QKV_PROJECTION":  return [0, ly + 0.6, 0];
    case "ROPE":            return [1.8, ly + 0.6, 0];
    case "QK_TRANSPOSE":    return [1.2, ly + 0.2, 0];
    case "SCALE":           return [0.6, ly + 0.2, 0];
    case "MASK":            return [0, ly + 0.2, 0];
    case "SOFTMAX":         return [-0.6, ly + 0.2, 0];
    case "WEIGHTED_V":      return [-1.2, ly - 0.2, 0];
    case "O_PROJECTION":    return [0, ly - 0.6, 0];
    case "RESIDUAL_1":      return [2.5, ly - 0.8, 0];
    case "NORM_2":          return [0, ly - 1.2, 0];
    case "GATE_UP":         return [-1.5, ly - 1.8, 0];
    case "SWIGLU":          return [0, ly - 2.0, 0];
    case "DOWN":            return [1.5, ly - 2.2, 0];
    case "RESIDUAL_2":      return [2.5, ly - 2.5, 0];
    case "NEXT_LAYER":      return [0, ly - LAYER_GAP, 0];
    default:                return [0, ly, 0];
  }
}

/**
 * Builds the complete deterministic execution graph for all layers.
 */
export function buildExecutionGraph(nLayers = 24): {
  nodes: Map<string, GraphNode3D>;
  edges: Map<string, GraphEdge3D>;
  timeline: TimelineStep[];
} {
  const nodes = new Map<string, GraphNode3D>();
  const edges = new Map<string, GraphEdge3D>();
  const timeline: TimelineStep[] = [];

  let stepIdx = 0;

  function addNode(
    id: string,
    stage: ExecutionStageType,
    layer: number | null,
    label: string,
    sublabel: string,
    opKey?: string
  ): GraphNode3D {
    const pos = getStageNodePos(stage, layer, nLayers);
    const node: GraphNode3D = {
      id,
      stage,
      layer,
      label,
      sublabel,
      position: pos,
      inputPort: { id: `${id}_in`, position: [pos[0], pos[1] + 0.2, pos[2]] },
      outputPort: { id: `${id}_out`, position: [pos[0], pos[1] - 0.2, pos[2]] },
      opKey,
    };
    nodes.set(id, node);
    return node;
  }

  function addEdge(
    id: string,
    sourceId: string,
    targetId: string,
    semanticType: PacketSemanticType
  ): GraphEdge3D {
    const srcNode = nodes.get(sourceId)!;
    const tgtNode = nodes.get(targetId)!;
    const route: [number, number, number][] = [
      srcNode.outputPort.position,
      [
        (srcNode.outputPort.position[0] + tgtNode.inputPort.position[0]) / 2,
        (srcNode.outputPort.position[1] + tgtNode.inputPort.position[1]) / 2,
        (srcNode.outputPort.position[2] + tgtNode.inputPort.position[2]) / 2,
      ],
      tgtNode.inputPort.position,
    ];
    const edge: GraphEdge3D = { id, sourceNodeId: sourceId, targetNodeId: targetId, route, semanticType };
    edges.set(id, edge);
    return edge;
  }

  // 1. INPUT & EMBEDDING
  const nInput = addNode("node_input", "INPUT", null, "Token Input", "Prompt/Previous token", "embed");
  const nEmbed = addNode("node_embed", "EMBEDDING", null, "Input Embedding", "Token + Positional Embedding", "embed");
  addEdge("edge_input_embed", nInput.id, nEmbed.id, "TOKEN");

  timeline.push({
    stepIndex: stepIdx++,
    stage: "INPUT",
    layer: null,
    nodeId: nInput.id,
    edgeId: null,
    packetType: "TOKEN",
    cameraShot: "ESTABLISH",
    label: "Token Input",
    sublabel: "Reading token ID from sequence",
    durationMs: 400,
  });

  timeline.push({
    stepIndex: stepIdx++,
    stage: "EMBEDDING",
    layer: null,
    nodeId: nEmbed.id,
    edgeId: "edge_input_embed",
    packetType: "TOKEN",
    cameraShot: "APPROACH",
    label: "Embedding Lookup",
    sublabel: "x = Embed(token)",
    durationMs: 500,
  });

  let prevNodeId = nEmbed.id;

  // 2. PER-LAYER EXECUTION
  for (let l = 0; l < nLayers; l++) {
    const nNorm1 = addNode(`node_l${l}_norm1`, "NORM_1", l, "RMSNorm 1", "Pre-attention normalization", `model.layers.${l}.input_layernorm`);
    const eNorm1 = addEdge(`edge_l${l}_prev_norm1`, prevNodeId, nNorm1.id, "RESIDUAL");
    timeline.push({
      stepIndex: stepIdx++,
      stage: "NORM_1",
      layer: l,
      nodeId: nNorm1.id,
      edgeId: eNorm1.id,
      packetType: "RESIDUAL",
      cameraShot: l === 0 ? "APPROACH" : "FOCUS",
      label: `Layer ${l} RMSNorm 1`,
      sublabel: "x_norm = RMSNorm(x)",
      durationMs: 450,
    });

    const nQKV = addNode(`node_l${l}_qkv`, "QKV_PROJECTION", l, "QKV Projection", "W_q, W_k, W_v projections", `model.layers.${l}.self_attn.q_proj`);
    const eQKV = addEdge(`edge_l${l}_norm1_qkv`, nNorm1.id, nQKV.id, "RESIDUAL");
    timeline.push({
      stepIndex: stepIdx++,
      stage: "QKV_PROJECTION",
      layer: l,
      nodeId: nQKV.id,
      edgeId: eQKV.id,
      packetType: "RESIDUAL",
      cameraShot: "FOCUS",
      label: `Layer ${l} QKV Projection`,
      sublabel: "Compute Q, K, V representations",
      durationMs: 550,
    });

    const nRope = addNode(`node_l${l}_rope`, "ROPE", l, "RoPE Embedding", "Rotary position embedding", `model.layers.${l}.self_attn.rope`);
    const eRope = addEdge(`edge_l${l}_qkv_rope`, nQKV.id, nRope.id, "Q");
    timeline.push({
      stepIndex: stepIdx++,
      stage: "ROPE",
      layer: l,
      nodeId: nRope.id,
      edgeId: eRope.id,
      packetType: "Q",
      cameraShot: "FOLLOW",
      label: `Layer ${l} RoPE`,
      sublabel: "Apply rotation to Q & K",
      durationMs: 450,
    });

    const nAttn = addNode(`node_l${l}_attn`, "SOFTMAX", l, "Scaled Dot-Product Attn", "Softmax(QKᵀ / √d_k)", `model.layers.${l}.self_attn`);
    const eAttn = addEdge(`edge_l${l}_rope_attn`, nRope.id, nAttn.id, "ATTENTION");
    timeline.push({
      stepIndex: stepIdx++,
      stage: "SOFTMAX",
      layer: l,
      nodeId: nAttn.id,
      edgeId: eAttn.id,
      packetType: "ATTENTION",
      cameraShot: "FOCUS",
      label: `Layer ${l} Attention Softmax`,
      sublabel: "Score attention weights across tokens",
      durationMs: 600,
    });

    const nOProj = addNode(`node_l${l}_oproj`, "O_PROJECTION", l, "O Projection", "W_o output projection", `model.layers.${l}.self_attn.o_proj`);
    const eOProj = addEdge(`edge_l${l}_attn_oproj`, nAttn.id, nOProj.id, "V");
    timeline.push({
      stepIndex: stepIdx++,
      stage: "O_PROJECTION",
      layer: l,
      nodeId: nOProj.id,
      edgeId: eOProj.id,
      packetType: "V",
      cameraShot: "FOLLOW",
      label: `Layer ${l} Output Projection`,
      sublabel: "Project attention context back to model dim",
      durationMs: 500,
    });

    const nRes1 = addNode(`node_l${l}_res1`, "RESIDUAL_1", l, "Residual Add 1", "x = x + Attn(x)", `model.layers.${l}.self_attn.res_add1`);
    const eRes1 = addEdge(`edge_l${l}_oproj_res1`, nOProj.id, nRes1.id, "RESIDUAL");
    timeline.push({
      stepIndex: stepIdx++,
      stage: "RESIDUAL_1",
      layer: l,
      nodeId: nRes1.id,
      edgeId: eRes1.id,
      packetType: "RESIDUAL",
      cameraShot: "TRANSITION",
      label: `Layer ${l} Residual Stream Add`,
      sublabel: "Accumulate attention onto residual stream",
      durationMs: 450,
    });

    const nNorm2 = addNode(`node_l${l}_norm2`, "NORM_2", l, "RMSNorm 2", "Pre-MLP normalization", `model.layers.${l}.post_attention_layernorm`);
    const eNorm2 = addEdge(`edge_l${l}_res1_norm2`, nRes1.id, nNorm2.id, "RESIDUAL");
    timeline.push({
      stepIndex: stepIdx++,
      stage: "NORM_2",
      layer: l,
      nodeId: nNorm2.id,
      edgeId: eNorm2.id,
      packetType: "RESIDUAL",
      cameraShot: "FOCUS",
      label: `Layer ${l} RMSNorm 2`,
      sublabel: "Normalize before feed-forward SwiGLU",
      durationMs: 450,
    });

    const nSwiglu = addNode(`node_l${l}_swiglu`, "SWIGLU", l, "SwiGLU MLP", "SiLU(Gate) ⊙ Up -> Down", `model.layers.${l}.mlp`);
    const eSwiglu = addEdge(`edge_l${l}_norm2_swiglu`, nNorm2.id, nSwiglu.id, "MLP");
    timeline.push({
      stepIndex: stepIdx++,
      stage: "SWIGLU",
      layer: l,
      nodeId: nSwiglu.id,
      edgeId: eSwiglu.id,
      packetType: "MLP",
      cameraShot: "FOCUS",
      label: `Layer ${l} SwiGLU MLP`,
      sublabel: "Non-linear feed-forward transformation",
      durationMs: 600,
    });

    const nRes2 = addNode(`node_l${l}_res2`, "RESIDUAL_2", l, "Residual Add 2", "x = x + MLP(x)", `model.layers.${l}.mlp.res_add2`);
    const eRes2 = addEdge(`edge_l${l}_swiglu_res2`, nSwiglu.id, nRes2.id, "RESIDUAL");
    timeline.push({
      stepIndex: stepIdx++,
      stage: "RESIDUAL_2",
      layer: l,
      nodeId: nRes2.id,
      edgeId: eRes2.id,
      packetType: "RESIDUAL",
      cameraShot: "PULLBACK",
      label: `Layer ${l} Layer Output`,
      sublabel: "Layer output ready for stream",
      durationMs: 450,
    });

    prevNodeId = nRes2.id;
  }

  // 3. FINAL NORM, LM HEAD, LOGITS, PREDICTION
  const nFinalNorm = addNode("node_final_norm", "FINAL_NORM", null, "Final RMSNorm", "RMSNorm(x_final)", "model.norm");
  const eFinalNorm = addEdge("edge_res_final_norm", prevNodeId, nFinalNorm.id, "RESIDUAL");
  timeline.push({
    stepIndex: stepIdx++,
    stage: "FINAL_NORM",
    layer: null,
    nodeId: nFinalNorm.id,
    edgeId: eFinalNorm.id,
    packetType: "RESIDUAL",
    cameraShot: "PULLBACK",
    label: "Final RMSNorm",
    sublabel: "Final sequence normalization",
    durationMs: 500,
  });

  const nLmHead = addNode("node_lm_head", "LM_HEAD", null, "LM Head", "Logits = W_lm · x", "lm_head");
  const eLmHead = addEdge("edge_fn_lm_head", nFinalNorm.id, nLmHead.id, "TOKEN");
  timeline.push({
    stepIndex: stepIdx++,
    stage: "LM_HEAD",
    layer: null,
    nodeId: nLmHead.id,
    edgeId: eLmHead.id,
    packetType: "TOKEN",
    cameraShot: "APPROACH",
    label: "Language Model Head",
    sublabel: "Vocabulary projection to logits",
    durationMs: 550,
  });

  const nLogits = addNode("node_logits", "LOGITS", null, "Logits Distribution", "Softmax over vocab logits", "lm_head.logits");
  const eLogits = addEdge("edge_lm_logits", nLmHead.id, nLogits.id, "TOKEN");
  timeline.push({
    stepIndex: stepIdx++,
    stage: "LOGITS",
    layer: null,
    nodeId: nLogits.id,
    edgeId: eLogits.id,
    packetType: "TOKEN",
    cameraShot: "FOCUS",
    label: "Logits Distribution",
    sublabel: "Sample probability distribution",
    durationMs: 500,
  });

  const nPred = addNode("node_prediction", "PREDICTION", null, "Next Token Prediction", "Top-1 sampled token output", "prediction");
  const ePred = addEdge("edge_logits_pred", nLogits.id, nPred.id, "TOKEN");
  timeline.push({
    stepIndex: stepIdx++,
    stage: "PREDICTION",
    layer: null,
    nodeId: nPred.id,
    edgeId: ePred.id,
    packetType: "TOKEN",
    cameraShot: "PREDICTION",
    label: "Token Prediction",
    sublabel: "Selected next token output",
    durationMs: 650,
  });

  return { nodes, edges, timeline };
}

export const EXECUTION_GRAPH = buildExecutionGraph(24);
