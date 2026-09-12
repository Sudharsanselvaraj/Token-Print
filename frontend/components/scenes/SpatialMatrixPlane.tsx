"use client";

import React, { useState } from "react";
import * as THREE from "three";
import { Billboard, Text } from "@react-three/drei";

interface SpatialMatrixPlaneProps {
  position: [number, number, number];
  size: [number, number];
  depth?: number;
  rows?: number;
  cols?: number;
  data?: number[][];
  label: string;
  sublabel?: string;
  selected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  accentColor?: string;
  planeColor?: string;
  activeHighlight?: boolean;
  highlightOpacity?: number;
  emissiveIntensity?: number;
  detailLevel?: "lod0" | "lod1" | "lod2";
}

function MatrixDots({
  w,
  h,
  depth,
  rows = 5,
  cols = 16,
  data,
  accentColor,
  activeHighlight,
}: {
  w: number;
  h: number;
  depth: number;
  rows?: number;
  cols?: number;
  data?: number[][];
  accentColor: string;
  activeHighlight: boolean;
}) {
  const numRows = Math.min(rows, 5);
  const numCols = Math.min(cols, 18);
  const totalDots = numRows * numCols;
  const meshRef = React.useRef<THREE.InstancedMesh>(null);

  const dotGeo = React.useMemo(() => new THREE.CircleGeometry(0.048, 6), []);

  React.useLayoutEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const gridW = w - 0.44;
    const gridH = h - 0.44;

    let idx = 0;
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        // Data Policy: Use real data if captured, else display subdued state
        const val = data?.[r]?.[c];
        const hasValue = val !== undefined;

        const dx = (c / (numCols - 1 || 1)) * gridW;
        const dy = -(r / (numRows - 1 || 1)) * gridH;
        dummy.position.set(dx, dy, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);

        const dotColor = hasValue
          ? (val > 0.5 || activeHighlight ? accentColor : "#404040")
          : (activeHighlight ? accentColor : "#262626");

        color.set(dotColor);
        mesh.setColorAt(idx, color);
        idx++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [w, h, numRows, numCols, data, accentColor, activeHighlight, totalDots]);

  React.useEffect(() => {
    return () => {
      dotGeo.dispose();
    };
  }, [dotGeo]);

  return (
    <group position={[-w / 2 + 0.22, h / 2 - 0.22, depth / 2 + 0.03]}>
      <instancedMesh ref={meshRef} args={[dotGeo, undefined, totalDots]}>
        <meshBasicMaterial transparent opacity={0.8} />
      </instancedMesh>
    </group>
  );
}

/**
 * Volumetric 3D Scientific Matrix Slab.
 * Premium metallic finish (roughness 0.2, metalness 0.4) with clean wireframe outlines.
 */
export const SpatialMatrixPlane = React.memo(function SpatialMatrixPlane({
  position,
  size,
  depth = 0.8,
  rows = 5,
  cols = 16,
  data,
  label,
  sublabel,
  selected = false,
  onClick,
  onDoubleClick,
  accentColor = "#a78bfa",
  planeColor = "#171717",
  activeHighlight = false,
  highlightOpacity,
  emissiveIntensity = 0,
  detailLevel = "lod1",
}: SpatialMatrixPlaneProps) {
  const [w, h] = size;
  const [hovered, setHovered] = useState(false);

  const boxGeo = React.useMemo(() => new THREE.BoxGeometry(w, h, depth), [w, h, depth]);
  const edgesGeo = React.useMemo(() => new THREE.EdgesGeometry(boxGeo), [boxGeo]);

  React.useEffect(() => {
    return () => {
      boxGeo.dispose();
      edgesGeo.dispose();
    };
  }, [boxGeo, edgesGeo]);

  const isHighlighted = activeHighlight || selected;
  const bodyOpacity   = highlightOpacity ?? (isHighlighted ? 0.98 : hovered ? 0.92 : 0.85);
  const borderColor   = isHighlighted ? accentColor : hovered ? "#ffffff" : "#475569";
  const bodyColor     = isHighlighted ? "#334155" : hovered ? "#26334d" : planeColor;
  const emissive      = isHighlighted ? accentColor : "#000000";
  const emissiveI     = emissiveIntensity || (isHighlighted ? 0.15 : 0);
  const borderWidth   = isHighlighted ? 2.0 : hovered ? 1.4 : 0.8;

  const showDots = detailLevel !== "lod0";

  return (
    <group position={position}>
      {/* Volumetric Slab Body */}
      <mesh
        geometry={boxGeo}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={bodyColor}
          emissive={emissive}
          emissiveIntensity={emissiveI}
          roughness={0.4}
          metalness={0.2}
          transparent
          opacity={bodyOpacity}
        />
      </mesh>

      {/* Wireframe Bevel Edges */}
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color={borderColor} linewidth={borderWidth} />
      </lineSegments>

      {/* Label Overlay — Only rendered when hovered or selected to prevent 3D scene text clutter */}
      {(hovered || selected || activeHighlight) && (
        <Billboard position={[0, h / 2 + 0.24, depth / 2 + 0.05]}>
          <Text
            fontSize={0.2}
            color={selected ? "#ffffff" : activeHighlight ? accentColor : "#e5e5e5"}
            anchorX="center"
            anchorY="bottom"
          >
            {label}
          </Text>
          {sublabel && (
            <Text
              position={[0, -0.2, 0]}
              fontSize={0.14}
              color="#a3a3a3"
              anchorX="center"
              anchorY="bottom"
            >
              {sublabel}
            </Text>
          )}
        </Billboard>
      )}

      {/* Instanced Activation Dots */}
      {showDots && (
        <MatrixDots
          w={w}
          h={h}
          depth={depth}
          rows={rows}
          cols={cols}
          data={data}
          accentColor={accentColor}
          activeHighlight={activeHighlight}
        />
      )}
    </group>
  );
});
