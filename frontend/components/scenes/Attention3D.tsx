"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Line, Text, Billboard } from "@react-three/drei";
import { SpatialMatrixPlane } from "./SpatialMatrixPlane";
import { LAYOUT } from "./ArchitectureLayout";
import { getLayerPorts } from "./TransformerPortSystem3D";

interface Attention3DProps {
  layerIndex: number;
  numHeads?: number;       // default 14 Q heads for Qwen2.5-0.5B
  kvHeads?: number;        // default 2 KV heads for Qwen2.5-0.5B
  hiddenSize?: number;     // 896
  headDim?: number;        // 64
  tokensLength?: number;
  attnMatrix?: number[][] | null;
  selectedTensor?: string | null;
  activeOpKind?: string | null;
  isActiveLayer?: boolean;
  onSelectOp?: (opId: string) => void;
  onSelectTensor?: (name: string) => void;
}

/**
 * High-Fidelity Multi-Head Attention Assembly with GQA (14 Q heads -> 2 KV head groups),
 * RoPE rotational ring stage, floating 2D attention matrix surface, and semantic accent colors.
 *
 * Semantic Accent Mapping:
 *   Attention / Q / K / V / O -> Cyan / Blue (#38bdf8)
 *   RoPE                      -> Violet (#a855f7)
 *   Softmax / Attention       -> Purple (#c084fc)
 */
export const Attention3D = React.memo(function Attention3D({
  layerIndex: l,
  numHeads = 14,
  kvHeads = 2,
  hiddenSize = 896,
  headDim = 64,
  tokensLength = 5,
  attnMatrix = null,
  selectedTensor = null,
  activeOpKind = null,
  isActiveLayer = false,
  onSelectOp,
  onSelectTensor,
}: Attention3DProps) {
  const handleOp = (opKind: string, tensorName?: string) => {
    const opId = `op_l${l}_${opKind}`;
    onSelectOp?.(opId);
    if (tensorName) onSelectTensor?.(tensorName);
  };

  const isOpActive = (opKind: string) => isActiveLayer && activeOpKind === opKind;
  const qPerKv = Math.ceil(numHeads / kvHeads);

  const ports = useMemo(() => getLayerPorts(l), [l]);
  const inp = ports.inputPorts;
  const out = ports.outputPorts;

  // Exact Port-to-Port 3D lines
  const portWires = useMemo(() => {
    return [
      { pts: [out.norm1, inp.q], active: isOpActive("attn_q") },
      { pts: [out.norm1, inp.k], active: isOpActive("attn_k") },
      { pts: [out.norm1, inp.v], active: isOpActive("attn_v") },
      { pts: [out.q, inp.attn_q], active: isOpActive("attn_q") },
      { pts: [out.k, inp.rope], active: isOpActive("attn_k") || isOpActive("rope") },
      { pts: [out.rope, inp.attn_k], active: isOpActive("rope") || isOpActive("attn_softmax") },
      { pts: [out.v, inp.attn_v], active: isOpActive("attn_v") },
      { pts: [out.attn, inp.o], active: isOpActive("attn_softmax") || isOpActive("attn_o") },
    ];
  }, [inp, out, isOpActive]);

  const NORM1_Y  = 2.8;
  const QKV_Y    = 1.2;
  const ROPE_Y   = 0.2;
  const MATMUL_Y = -0.8;
  const O_Y      = -2.4;

  return (
    <group>
      {/* ── 1. RMSNorm 1 (Clean Rectangular Module) ── */}
      <group
        position={[0, NORM1_Y, LAYOUT.NORM_Z]}
        onClick={(e) => {
          e.stopPropagation();
          handleOp("norm1", `model.layers.${l}.input_layernorm.weight`);
        }}
      >
        <mesh>
          <boxGeometry args={[LAYOUT.NORM_SIZE[0], LAYOUT.NORM_SIZE[1], LAYOUT.NORM_SIZE[2]]} />
          <meshStandardMaterial
            color={isOpActive("norm1") ? "#334155" : "#1e293b"}
            roughness={0.45}
            metalness={0.2}
          />
        </mesh>
        <Billboard position={[0, LAYOUT.NORM_SIZE[1] / 2 + 0.25, 0]}>
          <Text fontSize={0.16} color={isOpActive("norm1") ? "#ffffff" : "#cbd5e1"} anchorX="center" anchorY="bottom">
            RMSNorm 1
          </Text>
        </Billboard>
      </group>

      {/* ── 2. Q Projection (Green #10b981) ── */}
      <SpatialMatrixPlane
        position={[LAYOUT.BRANCH_Q_X, QKV_Y, LAYOUT.QKV_Z]}
        size={[LAYOUT.QKV_SIZE[0], LAYOUT.QKV_SIZE[1]]}
        depth={LAYOUT.QKV_SIZE[2]}
        rows={tokensLength} cols={14}
        label="Q Projection"
        sublabel={`${numHeads} heads × ${headDim}d`}
        accentColor="#10b981"
        selected={selectedTensor === `model.layers.${l}.self_attn.q_proj.weight`}
        activeHighlight={isOpActive("attn_q")}
        onClick={() => handleOp("attn_q", `model.layers.${l}.self_attn.q_proj.weight`)}
      />

      {/* K Projection */}
      <SpatialMatrixPlane
        position={[LAYOUT.BRANCH_K_X, QKV_Y, LAYOUT.QKV_Z]}
        size={[LAYOUT.QKV_SIZE[0] * 0.85, LAYOUT.QKV_SIZE[1]]}
        depth={LAYOUT.QKV_SIZE[2]}
        rows={tokensLength} cols={2}
        label="K Projection"
        sublabel={`2 KV groups (${qPerKv}:1)`}
        accentColor="#e5e5e5"
        selected={selectedTensor === `model.layers.${l}.self_attn.k_proj.weight`}
        activeHighlight={isOpActive("attn_k")}
        onClick={() => handleOp("attn_k", `model.layers.${l}.self_attn.k_proj.weight`)}
      />

      {/* V Projection */}
      <SpatialMatrixPlane
        position={[LAYOUT.BRANCH_V_X, QKV_Y, LAYOUT.QKV_Z]}
        size={[LAYOUT.QKV_SIZE[0] * 0.85, LAYOUT.QKV_SIZE[1]]}
        depth={LAYOUT.QKV_SIZE[2]}
        rows={tokensLength} cols={2}
        label="V Projection"
        sublabel={`2 KV groups (${qPerKv}:1)`}
        accentColor="#d4d4d4"
        selected={selectedTensor === `model.layers.${l}.self_attn.v_proj.weight`}
        activeHighlight={isOpActive("attn_v")}
        onClick={() => handleOp("attn_v", `model.layers.${l}.self_attn.v_proj.weight`)}
      />

      {/* ── 3. RoPE Compact Technical Module ── */}
      <group
        position={[LAYOUT.BRANCH_K_X, ROPE_Y, LAYOUT.ROPE_Z]}
        onClick={(e) => { e.stopPropagation(); handleOp("rope"); }}
      >
        <mesh>
          <boxGeometry args={[2.4, 0.9, 0.6]} />
          <meshStandardMaterial
            color={isOpActive("rope") ? "#252525" : "#111111"}
            roughness={0.4}
            metalness={0.2}
          />
        </mesh>
        <Billboard position={[0, 0.6, 0]}>
          <Text fontSize={0.16} color={isOpActive("rope") ? "#ffffff" : "#a3a3a3"} anchorX="center" anchorY="bottom">
            RoPE
          </Text>
        </Billboard>
      </group>

      {/* ── 4. QKᵀ Softmax Matrix ── */}
      <SpatialMatrixPlane
        position={[0, MATMUL_Y, LAYOUT.ATTN_Z]}
        size={[LAYOUT.ATTN_SIZE[0], LAYOUT.ATTN_SIZE[1]]}
        depth={LAYOUT.ATTN_SIZE[2]}
        rows={tokensLength} cols={tokensLength}
        data={attnMatrix || undefined}
        label="QKᵀ Softmax"
        sublabel="Softmax(Q · Kᵀ / √d_k) · V"
        accentColor="#ffffff"
        activeHighlight={
          isOpActive("attn_scores") ||
          isOpActive("attn_softmax") ||
          isOpActive("attn_weighted_v")
        }
        onClick={() => handleOp("attn_softmax")}
      />

      {/* ── 5. Output Projection O Proj ── */}
      <SpatialMatrixPlane
        position={[0, O_Y, LAYOUT.QKV_Z]}
        size={[LAYOUT.O_SIZE[0], LAYOUT.O_SIZE[1]]}
        depth={LAYOUT.O_SIZE[2]}
        rows={tokensLength} cols={16}
        label="O Projection"
        sublabel={`W_O · Attn [→${hiddenSize}]`}
        accentColor="#38bdf8"
        selected={selectedTensor === `model.layers.${l}.self_attn.o_proj.weight`}
        activeHighlight={isOpActive("attn_o")}
        onClick={() => handleOp("attn_o", `model.layers.${l}.self_attn.o_proj.weight`)}
      />

      {/* Port-to-Port Wires */}
      {portWires.map((w, i) => (
        <Line
          key={`port-wire-attn-${i}`}
          points={w.pts}
          color={w.active ? "#38bdf8" : "#475569"}
          lineWidth={w.active ? 2.0 : 1.0}
          transparent
          opacity={w.active ? 1.0 : isActiveLayer ? 0.7 : 0.3}
        />
      ))}
    </group>
  );
});
