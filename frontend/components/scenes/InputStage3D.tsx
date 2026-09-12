"use client";

import React from "react";
import { Text, Billboard } from "@react-three/drei";
import { SpatialMatrixPlane } from "./SpatialMatrixPlane";
import { LAYOUT } from "./ArchitectureLayout";

interface InputStage3DProps {
  tokens?: Array<{ index: number; text: string; id: number }>;
  vocabSize?: number;
  hiddenSize?: number;
  selectedTensor?: string | null;
  onSelectOp?: (opId: string) => void;
  onSelectTensor?: (name: string) => void;
}

/**
 * 3D Input Stage: Token sequence blocks and Token Embedding volumetric slab.
 */
export const InputStage3D = React.memo(function InputStage3D({
  tokens = [
    { index: 0, text: "Name",    id: 2437  },
    { index: 1, text: "one",     id: 284   },
    { index: 2, text: "primary", id: 4331  },
    { index: 3, text: "color",   id: 16326 },
    { index: 4, text: ".",       id: 2456  },
  ],
  vocabSize = 151936,
  hiddenSize = 896,
  selectedTensor = null,
  onSelectOp,
  onSelectTensor,
}: InputStage3DProps) {
  return (
    <group position={[0, LAYOUT.EMBED_Y, LAYOUT.NORM_Z]}>
      {/* ── Input Token Boxes ── */}
      <group position={[0, 3.2, 0]}>
        {tokens.map((tok, idx) => {
          const x = (idx - (tokens.length - 1) / 2) * 2.2;
          return (
            <group key={idx} position={[x, 0, 0]}>
              <mesh>
                <boxGeometry args={[1.9, 0.8, 0.45]} />
                <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.3} />
              </mesh>
              <Billboard position={[0, 0, 0.25]}>
                <Text fontSize={0.22} color="#000000" anchorX="center" anchorY="middle">
                  {tok.text}
                </Text>
              </Billboard>
            </group>
          );
        })}
      </group>

      {/* ── Embedding Matrix Slab ── */}
      <SpatialMatrixPlane
        position={[0, 0, 0]}
        size={[LAYOUT.EMBED_SIZE[0], LAYOUT.EMBED_SIZE[1]]}
        depth={LAYOUT.EMBED_SIZE[2]}
        rows={tokens.length}
        cols={24}
        label="Token Embedding"
        sublabel={`${vocabSize.toLocaleString()} × ${hiddenSize}`}
        accentColor="#ffffff"
        selected={selectedTensor === "embed_tokens"}
        onClick={() => {
          onSelectOp?.("op_embed");
          onSelectTensor?.("embed_tokens");
        }}
      />
    </group>
  );
});
