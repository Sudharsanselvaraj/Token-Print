/**
 * TransformerPortSystem3D.ts
 *
 * Single source of truth for 3D port coordinates (InputPort, OutputPort)
 * across all transformer layer components.
 * Guarantees that routed 3D line connections terminate at exact physical ports.
 */

import { LAYOUT } from "./ArchitectureLayout";

export interface Port3D {
  id: string;
  pos: [number, number, number]; // [X, Y, Z] relative to layer origin
}

export interface ComponentPorts3D {
  inputPorts: Record<string, [number, number, number]>;
  outputPorts: Record<string, [number, number, number]>;
}

export function getLayerPorts(layerIndex: number): ComponentPorts3D {
  const qX = LAYOUT.BRANCH_Q_X; // -5.2
  const kX = LAYOUT.BRANCH_K_X; //  0.0
  const vX = LAYOUT.BRANCH_V_X; //  5.2
  const spineX = LAYOUT.SPINE_X; // -8.5

  const NORM1_Y  = 2.8;
  const QKV_Y    = 1.2;
  const ROPE_Y   = 0.2;
  const MATMUL_Y = -0.8;
  const O_Y      = -2.4;
  const RES1_Y   = -2.4;

  const NORM2_Y  = -4.2;
  const MLP_Y    = -5.5;
  const SWIGLU_Y = -6.3;
  const RES2_Y   = -7.2;

  const normZ  = LAYOUT.NORM_Z;  // 0.0
  const qkvZ   = LAYOUT.QKV_Z;   // -2.0
  const ropeZ  = LAYOUT.ROPE_Z;  // -4.0
  const attnZ  = LAYOUT.ATTN_Z;  // -6.0
  const mlpZ   = LAYOUT.MLP_Z;   // +3.0
  const spineZ = LAYOUT.SPINE_Z; // 0.0

  return {
    inputPorts: {
      norm1: [0, NORM1_Y + 0.45, normZ],
      q: [qX, QKV_Y + 0.8, qkvZ],
      k: [kX, QKV_Y + 0.8, qkvZ],
      v: [vX, QKV_Y + 0.8, qkvZ],
      rope: [kX, ROPE_Y + 0.2, ropeZ],
      attn_q: [qX, MATMUL_Y + 0.9, attnZ],
      attn_k: [kX, MATMUL_Y + 0.9, attnZ],
      attn_v: [vX, MATMUL_Y + 0.9, attnZ],
      o: [0, O_Y + 0.7, qkvZ],
      res1_attn: [spineX, RES1_Y, spineZ],
      norm2: [0, NORM2_Y + 0.45, normZ],
      gate: [qX, MLP_Y + 0.8, mlpZ],
      up: [kX, MLP_Y + 0.8, mlpZ],
      swiglu_gate: [qX, SWIGLU_Y + 0.28, mlpZ],
      swiglu_up: [kX, SWIGLU_Y + 0.28, mlpZ],
      down: [vX, MLP_Y + 0.8, mlpZ],
      res2_mlp: [spineX, RES2_Y, spineZ],
    },
    outputPorts: {
      norm1: [0, NORM1_Y - 0.45, normZ],
      q: [qX, QKV_Y - 0.8, qkvZ],
      k: [kX, QKV_Y - 0.8, qkvZ],
      v: [vX, QKV_Y - 0.8, qkvZ],
      rope: [kX, ROPE_Y - 0.2, ropeZ],
      attn: [0, MATMUL_Y - 0.9, attnZ],
      o: [0, O_Y - 0.7, qkvZ],
      res1: [spineX, RES1_Y - 0.35, spineZ],
      norm2: [0, NORM2_Y - 0.45, normZ],
      gate: [qX, MLP_Y - 0.8, mlpZ],
      up: [kX, MLP_Y - 0.8, mlpZ],
      swiglu: [kX, SWIGLU_Y - 0.28, mlpZ],
      down: [vX, MLP_Y - 0.8, mlpZ],
      res2: [spineX, RES2_Y - 0.35, spineZ],
    },
  };
}
