"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { SpatialMatrixPlane } from "./SpatialMatrixPlane";
import { LAYOUT } from "./ArchitectureLayout";
import type { OperationKind } from "./TransformerOperationGraph";

interface TransformerLayer3DProps {
  position: [number, number, number];
  layerIndex: number;
  totalLayers: number;
  numHeads: number;
  kvHeads: number;
  hiddenSize: number;
  ffnSize: number;
  headDim: number;
  tokensLength: number;
  attnMatrix?: number[][] | null;
  selectedTensor?: string | null;
  onSelectTensor?: (name: string) => void;
  onSelectOp?: (opId: string) => void;
  isActive?: boolean;      // this layer is the currently focused layer
  activeOpKind?: string | null;  // the op within this layer that is active (or null)
  detailLevel?: "lod0" | "lod1" | "lod2";
}

// Map from OperationKind string to a block identifier used for highlight lookup
const OP_KIND_TO_BLOCK: Record<string, string> = {
  norm1: "norm1",
  attn_q: "q", attn_k: "k", attn_v: "v",
  rope: "v",
  attn_scores: "attn", attn_scale: "attn", attn_mask: "attn",
  attn_softmax: "attn", attn_weighted_v: "attn",
  attn_o: "o",
  res_add1: "res1",
  norm2: "norm2",
  mlp_gate: "gate", mlp_up: "up", swiglu: "up",
  mlp_down: "down",
  res_add2: "res2",
};

function isBlockActive(blockId: string, activeOpKind: string | null | undefined): boolean {
  if (!activeOpKind) return false;
  return OP_KIND_TO_BLOCK[activeOpKind] === blockId;
}

export const TransformerLayer3D = React.memo(function TransformerLayer3D({
  position,
  layerIndex,
  totalLayers,
  numHeads,
  kvHeads,
  hiddenSize,
  ffnSize,
  headDim,
  tokensLength,
  attnMatrix,
  selectedTensor,
  onSelectTensor,
  onSelectOp,
  isActive = false,
  activeOpKind = null,
  detailLevel = "lod1",
}: TransformerLayer3DProps) {
  const l = layerIndex;

  // Layer bounding frame geometries (exclusively owned by this instance)
  const frameBoxGeo = useMemo(() => new THREE.BoxGeometry(14, 11, 4), []);
  const frameEdgesGeo = useMemo(() => new THREE.EdgesGeometry(frameBoxGeo), [frameBoxGeo]);

  React.useEffect(() => {
    return () => {
      frameBoxGeo.dispose();
      frameEdgesGeo.dispose();
    };
  }, [frameBoxGeo, frameEdgesGeo]);

  const handleOp = (opKind: string, tensorName?: string) => {
    const opId = `op_l${l}_${opKind}`;
    onSelectOp?.(opId);
    if (tensorName) onSelectTensor?.(tensorName);
  };

  // Block dimensions
  const NORM_W   = LAYOUT.NORM_SIZE[0];
  const NORM_H   = LAYOUT.NORM_SIZE[1];
  const NORM_D   = LAYOUT.NORM_SIZE[2];
  const QKV_W    = LAYOUT.QKV_SIZE[0];
  const QKV_H    = LAYOUT.QKV_SIZE[1];
  const QKV_D    = LAYOUT.QKV_SIZE[2];
  const ATTN_W   = LAYOUT.ATTN_SIZE[0];
  const ATTN_H   = LAYOUT.ATTN_SIZE[1];
  const ATTN_D   = LAYOUT.ATTN_SIZE[2];
  const O_W      = LAYOUT.O_SIZE[0];
  const O_H      = LAYOUT.O_SIZE[1];
  const O_D      = LAYOUT.O_SIZE[2];
  const RES_W    = LAYOUT.RES_SIZE[0];
  const RES_H    = LAYOUT.RES_SIZE[1];
  const RES_D    = LAYOUT.RES_SIZE[2];

  // Y positions within the layer (relative to layer origin)
  const NORM1_Y   =  2.8;
  const QKV_Y     =  1.2;
  const ATTN_Y    = -0.5;
  const O_Y       = -2.2;
  const RES1_Y    = -2.2;
  const NORM2_Y   = -4.0;
  const MLP_Y     = -5.5;
  const RES2_Y    = -7.0;

  // Neutral wire connector channels within the layer
  const wires = useMemo((): Array<{ pts: [number, number, number][]; color: string }> => [
    // Norm1 → Q
    { pts: [[0, NORM1_Y, LAYOUT.NORM_Z], [LAYOUT.BRANCH_Q_X, QKV_Y, LAYOUT.QKV_Z]], color: "#525252" },
    // Norm1 → K
    { pts: [[0, NORM1_Y, LAYOUT.NORM_Z], [LAYOUT.BRANCH_K_X, QKV_Y, LAYOUT.QKV_Z - 0.5]], color: "#525252" },
    // Norm1 → V
    { pts: [[0, NORM1_Y, LAYOUT.NORM_Z], [LAYOUT.BRANCH_V_X, QKV_Y, LAYOUT.QKV_Z]], color: "#525252" },
    // Q → Attn
    { pts: [[LAYOUT.BRANCH_Q_X, QKV_Y - QKV_H / 2, LAYOUT.QKV_Z], [0, ATTN_Y, LAYOUT.ATTN_Z]], color: "#64748b" },
    // K → Attn
    { pts: [[LAYOUT.BRANCH_K_X, QKV_Y - QKV_H / 2, LAYOUT.QKV_Z - 0.5], [0, ATTN_Y, LAYOUT.ATTN_Z]], color: "#64748b" },
    // V → Attn
    { pts: [[LAYOUT.BRANCH_V_X, QKV_Y - QKV_H / 2, LAYOUT.QKV_Z], [0, ATTN_Y, LAYOUT.ATTN_Z]], color: "#64748b" },
    // Attn → O
    { pts: [[0, ATTN_Y - ATTN_H / 2, LAYOUT.ATTN_Z], [0, O_Y, LAYOUT.QKV_Z]], color: "#525252" },
    // O → Res1
    { pts: [[0, O_Y - O_H / 2, LAYOUT.QKV_Z], [LAYOUT.SPINE_X, RES1_Y, LAYOUT.SPINE_Z]], color: "#737373" },
    // Res1 → Norm2
    { pts: [[LAYOUT.SPINE_X, RES1_Y, LAYOUT.SPINE_Z], [0, NORM2_Y, LAYOUT.NORM_Z]], color: "#737373" },
    // Norm2 → Gate
    { pts: [[0, NORM2_Y, LAYOUT.NORM_Z], [LAYOUT.BRANCH_Q_X, MLP_Y, LAYOUT.MLP_Z]], color: "#525252" },
    // Norm2 → Up
    { pts: [[0, NORM2_Y, LAYOUT.NORM_Z], [LAYOUT.BRANCH_K_X, MLP_Y, LAYOUT.MLP_Z - 0.4]], color: "#525252" },
    // Gate+Up → Down
    { pts: [[LAYOUT.BRANCH_Q_X, MLP_Y - QKV_H / 2, LAYOUT.MLP_Z], [LAYOUT.BRANCH_V_X, MLP_Y, LAYOUT.MLP_Z]], color: "#525252" },
    // Down → Res2
    { pts: [[LAYOUT.BRANCH_V_X, MLP_Y - QKV_H / 2, LAYOUT.MLP_Z], [LAYOUT.SPINE_X, RES2_Y, LAYOUT.SPINE_Z]], color: "#737373" },
  ], []);

  // Dim inactive blocks when another layer is playing
  const baseOpacity    = isActive ? 1.0  : 0.75;
  const activeOpacity  = 1.0;

  const blockActive = (blockId: string) => isActive && isBlockActive(blockId, activeOpKind);
  const blockOpacity = (blockId: string) =>
    isActive ? (isBlockActive(blockId, activeOpKind) ? activeOpacity : baseOpacity * 0.7) : baseOpacity;
  const blockEmissive = (blockId: string): number =>
    blockActive(blockId) ? 0.35 : 0;

  return (
    <group position={position}>
      {/* Thin frame to delineate the layer at overview zoom */}
      <lineSegments geometry={frameEdgesGeo}>
        <lineBasicMaterial
          color={isActive ? "#ffffff" : "#404040"}
          linewidth={isActive ? 1.5 : 0.8}
          transparent
          opacity={isActive ? 0.6 : 0.25}
        />
      </lineSegments>

      {/* ── Semantic Wire Channels ── */}
      {wires.map((w, i) => (
        <Line
          key={i}
          points={w.pts}
          color={w.color}
          lineWidth={1.5}
          transparent
          opacity={isActive ? 0.85 : 0.35}
        />
      ))}

      {/* ── 1. RMSNorm 1 ── */}
      <SpatialMatrixPlane
        position={[0, NORM1_Y, LAYOUT.NORM_Z]}
        size={[NORM_W, NORM_H]}
        depth={NORM_D}
        rows={1} cols={16}
        label={`L${l} Norm 1`}
        sublabel={`RMSNorm [${hiddenSize}]`}
        accentColor="#ffffff"
        selected={selectedTensor === `model.layers.${l}.input_layernorm.weight`}
        activeHighlight={blockActive("norm1")}
        highlightOpacity={blockOpacity("norm1")}
        emissiveIntensity={blockEmissive("norm1")}
        onClick={() => handleOp("norm1", `model.layers.${l}.input_layernorm.weight`)}
      />

      {/* ── 2. QK Circuit & OV Circuit Projections ── */}
      {/* QK Sub-Path: Determines WHERE to look (W_Q^T W_K) */}
      <SpatialMatrixPlane
        position={[LAYOUT.BRANCH_Q_X, QKV_Y, LAYOUT.QKV_Z]}
        size={[QKV_W, QKV_H]}
        depth={QKV_D}
        rows={tokensLength} cols={10}
        label="QK: Q Proj"
        sublabel={`Query [${hiddenSize}→${numHeads}×${headDim}]`}
        accentColor="#ffffff"
        selected={selectedTensor === `model.layers.${l}.self_attn.q_proj.weight`}
        activeHighlight={blockActive("q")}
        highlightOpacity={blockOpacity("q")}
        emissiveIntensity={blockEmissive("q")}
        onClick={() => handleOp("attn_q", `model.layers.${l}.self_attn.q_proj.weight`)}
      />
      <SpatialMatrixPlane
        position={[LAYOUT.BRANCH_K_X, QKV_Y, LAYOUT.QKV_Z - 0.5]}
        size={[QKV_W, QKV_H]}
        depth={QKV_D}
        rows={tokensLength} cols={10}
        label="QK: K Proj"
        sublabel={`Key [${hiddenSize}→${kvHeads}×${headDim}]`}
        accentColor="#e5e5e5"
        selected={selectedTensor === `model.layers.${l}.self_attn.k_proj.weight`}
        activeHighlight={blockActive("k")}
        highlightOpacity={blockOpacity("k")}
        emissiveIntensity={blockEmissive("k")}
        onClick={() => handleOp("attn_k", `model.layers.${l}.self_attn.k_proj.weight`)}
      />

      {/* OV Sub-Path: Determines WHAT to write back to residual stream (W_O W_V) */}
      <SpatialMatrixPlane
        position={[LAYOUT.BRANCH_V_X, QKV_Y, LAYOUT.QKV_Z]}
        size={[QKV_W, QKV_H]}
        depth={QKV_D}
        rows={tokensLength} cols={10}
        label="OV: V Proj"
        sublabel={`Value [${hiddenSize}→${kvHeads}×${headDim}]`}
        accentColor="#d4d4d4"
        selected={selectedTensor === `model.layers.${l}.self_attn.v_proj.weight`}
        activeHighlight={blockActive("v")}
        highlightOpacity={blockOpacity("v")}
        emissiveIntensity={blockEmissive("v")}
        onClick={() => handleOp("attn_v", `model.layers.${l}.self_attn.v_proj.weight`)}
      />

      {/* ── 3. Attention Block (QK Pattern × OV Value Sum) ── */}
      <SpatialMatrixPlane
        position={[0, ATTN_Y, LAYOUT.ATTN_Z]}
        size={[ATTN_W, ATTN_H]}
        depth={ATTN_D}
        rows={tokensLength} cols={tokensLength}
        data={attnMatrix || undefined}
        label="QK Pattern → OV Mix"
        sublabel={`Softmax(QKᵀ/√d_k) · V`}
        accentColor="#ffffff"
        activeHighlight={blockActive("attn")}
        highlightOpacity={blockOpacity("attn")}
        emissiveIntensity={blockEmissive("attn")}
        onClick={() => handleOp("attn_softmax")}
      />

      {/* ── 4. OV Projection (Write back to Residual Stream) ── */}
      <SpatialMatrixPlane
        position={[0, O_Y, LAYOUT.QKV_Z]}
        size={[O_W, O_H]}
        depth={O_D}
        rows={tokensLength} cols={16}
        label="OV: O Proj"
        sublabel={`W_O · Attn [→${hiddenSize}]`}
        accentColor="#ffffff"
        selected={selectedTensor === `model.layers.${l}.self_attn.o_proj.weight`}
        activeHighlight={blockActive("o")}
        highlightOpacity={blockOpacity("o")}
        emissiveIntensity={blockEmissive("o")}
        onClick={() => handleOp("attn_o", `model.layers.${l}.self_attn.o_proj.weight`)}
      />

      {/* ── 5. Residual Add 1 (on spine) ── */}
      <SpatialMatrixPlane
        position={[LAYOUT.SPINE_X, RES1_Y, LAYOUT.SPINE_Z]}
        size={[RES_W, RES_H]}
        depth={RES_D}
        rows={1} cols={8}
        label="+ Res"
        sublabel="x = x + Attn"
        accentColor="#ffffff"
        activeHighlight={blockActive("res1")}
        highlightOpacity={blockOpacity("res1")}
        emissiveIntensity={blockEmissive("res1")}
        onClick={() => handleOp("res_add1")}
      />

      {/* ── 6. RMSNorm 2 ── */}
      <SpatialMatrixPlane
        position={[0, NORM2_Y, LAYOUT.NORM_Z]}
        size={[NORM_W, NORM_H]}
        depth={NORM_D}
        rows={1} cols={16}
        label="Norm 2"
        sublabel={`RMSNorm [${hiddenSize}]`}
        accentColor="#ffffff"
        selected={selectedTensor === `model.layers.${l}.post_attention_layernorm.weight`}
        activeHighlight={blockActive("norm2")}
        highlightOpacity={blockOpacity("norm2")}
        emissiveIntensity={blockEmissive("norm2")}
        onClick={() => handleOp("norm2", `model.layers.${l}.post_attention_layernorm.weight`)}
      />

      {/* ── 7. MLP: Key-Value Memory (Gate & Up = Keys c_k, Down = Values V_k, Geva et al. 2021) ── */}
      <SpatialMatrixPlane
        position={[LAYOUT.BRANCH_Q_X, MLP_Y, LAYOUT.MLP_Z]}
        size={[QKV_W, QKV_H]}
        depth={QKV_D}
        rows={tokensLength} cols={10}
        label="MLP Key: Gate"
        sublabel={`Key Act c_k [${hiddenSize}→${ffnSize}]`}
        accentColor="#ffffff"
        selected={selectedTensor === `model.layers.${l}.mlp.gate_proj.weight`}
        activeHighlight={blockActive("gate")}
        highlightOpacity={blockOpacity("gate")}
        emissiveIntensity={blockEmissive("gate")}
        onClick={() => handleOp("mlp_gate", `model.layers.${l}.mlp.gate_proj.weight`)}
      />
      <SpatialMatrixPlane
        position={[LAYOUT.BRANCH_K_X, MLP_Y, LAYOUT.MLP_Z - 0.4]}
        size={[QKV_W, QKV_H]}
        depth={QKV_D}
        rows={tokensLength} cols={10}
        label="MLP Key: Up"
        sublabel={`SiLU(xW_g)⊙xW_u [${ffnSize}]`}
        accentColor="#e5e5e5"
        selected={selectedTensor === `model.layers.${l}.mlp.up_proj.weight`}
        activeHighlight={blockActive("up")}
        highlightOpacity={blockOpacity("up")}
        emissiveIntensity={blockEmissive("up")}
        onClick={() => handleOp("mlp_up", `model.layers.${l}.mlp.up_proj.weight`)}
      />
      <SpatialMatrixPlane
        position={[LAYOUT.BRANCH_V_X, MLP_Y, LAYOUT.MLP_Z]}
        size={[QKV_W, QKV_H]}
        depth={QKV_D}
        rows={tokensLength} cols={10}
        label="MLP Value: Down"
        sublabel={`Value Vec V_k [${ffnSize}→${hiddenSize}]`}
        accentColor="#d4d4d4"
        selected={selectedTensor === `model.layers.${l}.mlp.down_proj.weight`}
        activeHighlight={blockActive("down")}
        highlightOpacity={blockOpacity("down")}
        emissiveIntensity={blockEmissive("down")}
        onClick={() => handleOp("mlp_down", `model.layers.${l}.mlp.down_proj.weight`)}
      />

      {/* ── 8. Residual Add 2 (on spine) ── */}
      <SpatialMatrixPlane
        position={[LAYOUT.SPINE_X, RES2_Y, LAYOUT.SPINE_Z]}
        size={[RES_W, RES_H]}
        depth={RES_D}
        rows={1} cols={8}
        label="+ Res"
        sublabel="x = x + MLP"
        accentColor="#ffffff"
        activeHighlight={blockActive("res2")}
        highlightOpacity={blockOpacity("res2")}
        emissiveIntensity={blockEmissive("res2")}
        onClick={() => handleOp("res_add2")}
      />
    </group>
  );
});

