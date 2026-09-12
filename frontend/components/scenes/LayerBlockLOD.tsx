"use client";

import React, { useCallback } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { LAYOUT } from "./ArchitectureLayout";

// Shared, module-level static geometry and materials for LOD0 layers (Monochrome Pass).
// IMPORTANT: Shared across all LOD0 layer instances. Do NOT dispose in unmount handlers.

const LOD0_ATTN_GEO = new THREE.BoxGeometry(9, 3.5, 1.5);
const LOD0_MLP_GEO  = new THREE.BoxGeometry(9, 2.8, 1.2);
const LOD0_FRAME_GEO = new THREE.EdgesGeometry(new THREE.BoxGeometry(14, 11, 4));

const LOD0_CONNECTOR_GEO = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(LAYOUT.SPINE_X, -7.0, LAYOUT.SPINE_Z),
  new THREE.Vector3(LAYOUT.SPINE_X, -14.0, LAYOUT.SPINE_Z),
]);

const LOD0_ATTN_MAT = new THREE.MeshStandardMaterial({
  color: "#e5e5e5",
  roughness: 0.3,
  metalness: 0.25,
  transparent: true,
  opacity: 0.75,
});

const LOD0_MLP_MAT = new THREE.MeshStandardMaterial({
  color: "#a3a3a3",
  roughness: 0.3,
  metalness: 0.25,
  transparent: true,
  opacity: 0.70,
});

const LOD0_LINE_MAT = new THREE.LineBasicMaterial({
  color: "#525252",
  transparent: true,
  opacity: 0.5,
});

const LOD0_ACTIVE_FRAME_MAT = new THREE.LineBasicMaterial({
  color: "#ffffff",
  transparent: true,
  opacity: 0.9,
});

const LOD0_INACTIVE_FRAME_MAT = new THREE.LineBasicMaterial({
  color: "#404040",
  transparent: true,
  opacity: 0.3,
});

interface LayerBlockLODProps {
  position: [number, number, number];
  layerIndex: number;
}

/**
 * Lightweight Level-of-Detail 0 representation for an inactive 3D Transformer Layer.
 * Pure monochrome aesthetics with proportioned 3D volume, lit metallic surfaces,
 * and continuous inter-layer spine connection.
 */
export const LayerBlockLOD = React.memo(function LayerBlockLOD({
  position,
  layerIndex,
}: LayerBlockLODProps) {
  const isActive = useStore(
    useCallback((s) => s.arch3dLayer === layerIndex, [layerIndex])
  );
  const enterInspectMode = useStore((s) => s.enterInspectMode);

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    enterInspectMode(`op_l${layerIndex}_norm1`);
  };

  return (
    <group position={position} onClick={handleClick}>
      {/* Layer outer bounding frame */}
      <lineSegments
        geometry={LOD0_FRAME_GEO}
        material={isActive ? LOD0_ACTIVE_FRAME_MAT : LOD0_INACTIVE_FRAME_MAT}
      />

      {/* Attention section */}
      <mesh
        geometry={LOD0_ATTN_GEO}
        material={LOD0_ATTN_MAT}
        position={[0, -0.5, LAYOUT.ATTN_Z]}
      />

      {/* MLP section */}
      <mesh
        geometry={LOD0_MLP_GEO}
        material={LOD0_MLP_MAT}
        position={[0, -5.5, LAYOUT.MLP_Z]}
      />

      {/* Inter-layer connector line to next layer */}
      <lineSegments
        geometry={LOD0_CONNECTOR_GEO}
        material={LOD0_LINE_MAT}
      />
    </group>
  );
});
