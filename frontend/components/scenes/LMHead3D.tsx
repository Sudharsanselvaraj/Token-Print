"use client";

import React from "react";
import { Text, Billboard } from "@react-three/drei";
import { SpatialMatrixPlane } from "./SpatialMatrixPlane";
import { LAYOUT } from "./ArchitectureLayout";

interface LMHead3DProps {
  numLayers?: number;
  tokensLength?: number;
  vocabSize?: number;
  hiddenSize?: number;
  selectedTensor?: string | null;
  onSelectOp?: (opId: string) => void;
  onSelectTensor?: (name: string) => void;
}

/**
 * 3D Output Stage: Final RMSNorm, LM Head Unembedding, Logits & Next Token Prediction.
 */
export const LMHead3D = React.memo(function LMHead3D({
  numLayers = 24,
  tokensLength = 5,
  vocabSize = 151936,
  hiddenSize = 896,
  selectedTensor = null,
  onSelectOp,
  onSelectTensor,
}: LMHead3DProps) {
  const finalY = -((numLayers - 1) * LAYOUT.LAYER_HEIGHT);
  const normY  = finalY - LAYOUT.FINAL_NORM_Y_OFFSET;
  const headY  = finalY - LAYOUT.LM_HEAD_Y_OFFSET - 2;

  return (
    <group position={[0, 0, LAYOUT.NORM_Z]}>
      {/* ── Final RMSNorm ── */}
      <SpatialMatrixPlane
        position={[0, normY, 0]}
        size={[LAYOUT.NORM_SIZE[0], LAYOUT.NORM_SIZE[1]]}
        depth={LAYOUT.NORM_SIZE[2]}
        rows={1}
        cols={24}
        label="Final Norm"
        sublabel={`RMSNorm [${hiddenSize}]`}
        accentColor="#ffffff"
        selected={selectedTensor === "model.norm.weight"}
        onClick={() => {
          onSelectOp?.("op_final_norm");
          onSelectTensor?.("model.norm.weight");
        }}
      />

      {/* ── LM Head Unembedding ── */}
      <SpatialMatrixPlane
        position={[0, headY, 0]}
        size={[LAYOUT.LM_SIZE[0], LAYOUT.LM_SIZE[1]]}
        depth={LAYOUT.LM_SIZE[2]}
        rows={tokensLength}
        cols={24}
        label="LM Head (Unembedding)"
        sublabel={`${hiddenSize} → ${vocabSize.toLocaleString()} Logits`}
        accentColor="#f43f5e"
        selected={selectedTensor === "lm_head.weight"}
        onClick={() => {
          onSelectOp?.("op_lm_head");
          onSelectTensor?.("lm_head.weight");
        }}
      />

      {/* ── Predicted Next Token Readout ── */}
      <group position={[0, headY - 3.2, 0]}>
        <mesh>
          <boxGeometry args={[3.2, 1.0, 0.5]} />
          <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.4} />
        </mesh>
        <Billboard position={[0, 0, 0.28]}>
          <Text fontSize={0.25} color="#000000" anchorX="center" anchorY="middle">
            Predicted Next Token
          </Text>
        </Billboard>
      </group>
    </group>
  );
});
