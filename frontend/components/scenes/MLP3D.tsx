"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Line, Text, Billboard } from "@react-three/drei";
import { SpatialMatrixPlane } from "./SpatialMatrixPlane";
import { LAYOUT } from "./ArchitectureLayout";
import { getLayerPorts } from "./TransformerPortSystem3D";

interface MLP3DProps {
  layerIndex: number;
  hiddenSize?: number; // 896
  ffnSize?: number;    // 4864
  tokensLength?: number;
  selectedTensor?: string | null;
  activeOpKind?: string | null;
  isActiveLayer?: boolean;
  onSelectOp?: (opId: string) => void;
  onSelectTensor?: (name: string) => void;
}

/**
 * SwiGLU Feed-Forward Network Assembly
 * Physical branching geometry at Z = +3 with exact 3D port-to-port connections and warm amber/orange (#f97316) semantic accent.
 */
export const MLP3D = React.memo(function MLP3D({
  layerIndex: l,
  hiddenSize = 896,
  ffnSize = 4864,
  tokensLength = 5,
  selectedTensor = null,
  activeOpKind = null,
  isActiveLayer = false,
  onSelectOp,
  onSelectTensor,
}: MLP3DProps) {
  const handleOp = (opKind: string, tensorName?: string) => {
    const opId = `op_l${l}_${opKind}`;
    onSelectOp?.(opId);
    if (tensorName) onSelectTensor?.(tensorName);
  };

  const isOpActive = (opKind: string) => isActiveLayer && activeOpKind === opKind;

  const ports = useMemo(() => getLayerPorts(l), [l]);
  const inp = ports.inputPorts;
  const out = ports.outputPorts;

  // Exact Port-to-Port 3D lines with active state tracking
  const portWires = useMemo(() => {
    return [
      { pts: [out.norm2, inp.gate], active: isOpActive("mlp_gate") },
      { pts: [out.norm2, inp.up], active: isOpActive("mlp_up") },
      { pts: [out.gate, inp.swiglu_gate], active: isOpActive("mlp_gate") || isOpActive("swiglu") },
      { pts: [out.up, inp.swiglu_up], active: isOpActive("mlp_up") || isOpActive("swiglu") },
      { pts: [out.swiglu, inp.down], active: isOpActive("swiglu") || isOpActive("mlp_down") },
    ];
  }, [inp, out, isOpActive]);

  const NORM2_Y  = -4.2;
  const MLP_Y    = -5.5;
  const SWIGLU_Y = -6.3;

  return (
    <group>
      {/* ── 1. RMSNorm 2 (Clean Rectangular Module) ── */}
      <group
        position={[0, NORM2_Y, LAYOUT.NORM_Z]}
        onClick={(e) => {
          e.stopPropagation();
          handleOp("norm2", `model.layers.${l}.post_attention_layernorm.weight`);
        }}
      >
        <mesh>
          <boxGeometry args={[LAYOUT.NORM_SIZE[0], LAYOUT.NORM_SIZE[1], LAYOUT.NORM_SIZE[2]]} />
          <meshStandardMaterial
            color={isOpActive("norm2") ? "#334155" : "#1e293b"}
            roughness={0.45}
            metalness={0.2}
          />
        </mesh>
        <Billboard position={[0, LAYOUT.NORM_SIZE[1] / 2 + 0.25, 0]}>
          <Text fontSize={0.16} color={isOpActive("norm2") ? "#ffffff" : "#cbd5e1"} anchorX="center" anchorY="bottom">
            RMSNorm 2
          </Text>
        </Billboard>
      </group>

      {/* ── 2. Gate Projection ── */}
      <SpatialMatrixPlane
        position={[LAYOUT.BRANCH_Q_X, MLP_Y, LAYOUT.MLP_Z]}
        size={[LAYOUT.MLP_SIZE[0], LAYOUT.MLP_SIZE[1]]}
        depth={LAYOUT.MLP_SIZE[2]}
        rows={tokensLength} cols={10}
        label="Gate"
        sublabel={`W_gate [${hiddenSize}→${ffnSize}]`}
        accentColor="#ea580c"
        selected={selectedTensor === `model.layers.${l}.mlp.gate_proj.weight`}
        activeHighlight={isOpActive("mlp_gate")}
        onClick={() => handleOp("mlp_gate", `model.layers.${l}.mlp.gate_proj.weight`)}
      />

      {/* ── 3. Up Projection ── */}
      <SpatialMatrixPlane
        position={[LAYOUT.BRANCH_K_X, MLP_Y, LAYOUT.MLP_Z]}
        size={[LAYOUT.MLP_SIZE[0], LAYOUT.MLP_SIZE[1]]}
        depth={LAYOUT.MLP_SIZE[2]}
        rows={tokensLength} cols={10}
        label="Up"
        sublabel={`W_up [${hiddenSize}→${ffnSize}]`}
        accentColor="#ea580c"
        selected={selectedTensor === `model.layers.${l}.mlp.up_proj.weight`}
        activeHighlight={isOpActive("mlp_up")}
        onClick={() => handleOp("mlp_up", `model.layers.${l}.mlp.up_proj.weight`)}
      />

      {/* ── 4. SwiGLU Activation Merge Block ── */}
      <group
        position={[LAYOUT.BRANCH_K_X, SWIGLU_Y, LAYOUT.MLP_Z]}
        onClick={(e) => { e.stopPropagation(); handleOp("swiglu"); }}
      >
        <mesh>
          <boxGeometry args={[2.2, 0.55, 0.5]} />
          <meshStandardMaterial
            color={isOpActive("swiglu") ? "#ea580c" : "#1e293b"}
            roughness={0.4}
            metalness={0.2}
          />
        </mesh>
        <Billboard position={[0, 0.42, 0]}>
          <Text fontSize={0.16} color={isOpActive("swiglu") ? "#ffedd5" : "#cbd5e1"} anchorX="center" anchorY="bottom">
            SwiGLU
          </Text>
        </Billboard>
      </group>

      {/* ── 5. Down Projection ── */}
      <SpatialMatrixPlane
        position={[LAYOUT.BRANCH_V_X, MLP_Y, LAYOUT.MLP_Z]}
        size={[LAYOUT.MLP_SIZE[0], LAYOUT.MLP_SIZE[1]]}
        depth={LAYOUT.MLP_SIZE[2]}
        rows={tokensLength} cols={10}
        label="Down"
        sublabel={`W_down [${ffnSize}→${hiddenSize}]`}
        accentColor="#ea580c"
        selected={selectedTensor === `model.layers.${l}.mlp.down_proj.weight`}
        activeHighlight={isOpActive("mlp_down")}
        onClick={() => handleOp("mlp_down", `model.layers.${l}.mlp.down_proj.weight`)}
      />

      {/* Port Wires */}
      {portWires.map((w, i) => (
        <Line
          key={`port-wire-mlp-${i}`}
          points={w.pts}
          color={w.active ? "#ea580c" : "#475569"}
          lineWidth={w.active ? 2.0 : 1.0}
          transparent
          opacity={w.active ? 1.0 : isActiveLayer ? 0.7 : 0.3}
        />
      ))}
    </group>
  );
});
