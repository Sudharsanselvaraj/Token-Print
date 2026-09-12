"use client";

import React, { useMemo } from "react";
import { Line } from "@react-three/drei";
import { useStore } from "@/lib/store";
import { LAYOUT, layerOrigin } from "./ArchitectureLayout";

export function AttentionBeams3D() {
  const arch3dLayer = useStore((s) => s.arch3dLayer);
  const arch3dOpKind = useStore((s) => s.arch3dOpKind);
  const selectedTokenIndex = useStore((s) => s.selectedTokenIndex);
  const data = useStore((s) => s.data);
  const minWeight = useStore((s) => s.minWeight);

  const l = arch3dLayer >= 0 ? arch3dLayer : 0;
  const [, ly] = layerOrigin(l);

  // Attention matrix for active layer
  const attnMatrix = data?.attention?.[l]?.[0] || null;
  const tokens = data?.tokens || [];
  const numTokens = tokens.length || 5;

  const beams = useMemo(() => {
    const isAttnStage =
      arch3dOpKind === "attn_scores" ||
      arch3dOpKind === "attn_softmax" ||
      arch3dOpKind === "attn_weighted_v";

    if (!isAttnStage || !attnMatrix || selectedTokenIndex >= attnMatrix.length) {
      return [];
    }

    const row = attnMatrix[selectedTokenIndex] || [];
    const queryX = (selectedTokenIndex - (numTokens - 1) / 2) * 1.5;
    const queryPos: [number, number, number] = [queryX, ly - 0.5, LAYOUT.ATTN_Z];

    const result: { points: [number, number, number][]; weight: number; key: string }[] = [];

    row.forEach((weight, targetIdx) => {
      if (weight >= Math.max(minWeight, 0.05)) {
        const targetX = (targetIdx - (numTokens - 1) / 2) * 1.5;
        const targetPos: [number, number, number] = [targetX, ly + 1.2, LAYOUT.QKV_Z];
        result.push({
          points: [queryPos, targetPos],
          weight,
          key: `beam_${selectedTokenIndex}_${targetIdx}`,
        });
      }
    });

    return result;
  }, [arch3dOpKind, attnMatrix, selectedTokenIndex, numTokens, ly, minWeight]);

  if (beams.length === 0) return null;

  return (
    <group>
      {beams.map((beam) => (
        <Line
          key={beam.key}
          points={beam.points}
          color="#ffffff"
          lineWidth={Math.max(1, beam.weight * 6)}
          transparent
          opacity={Math.min(1.0, 0.3 + beam.weight * 0.7)}
        />
      ))}
    </group>
  );
}
