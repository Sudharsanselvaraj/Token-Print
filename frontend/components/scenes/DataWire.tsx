"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { Color } from "three";
import { GRAY, HOVER_GLOW } from "@/lib/sceneColors";

export interface DataWireProps {
  start: [number, number, number];
  end: [number, number, number];
  value?: number; // 0..1 scale driving thickness and opacity
  color?: string | [number, number, number];
  animated?: boolean;
  pulseSpeed?: number;
  curveBias?: [number, number, number];
  label?: string;
  hovered?: boolean;
  active?: boolean;
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

/**
 * Reusable 3D Data Wire connector component.
 * Draws an explicit glowing 3D spline curve between start and end coordinates,
 * with optional particle pulse animation traveling along the path.
 * Value determines thickness & brightness deterministically.
 */
export function DataWire({
  start,
  end,
  value = 1.0,
  color = "#38bdf8",
  animated = true,
  pulseSpeed = 1.2,
  curveBias = [0, 0.8, 0],
  label,
  hovered = false,
  active = false,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: DataWireProps) {
  const markerRef = useRef<THREE.Mesh>(null);

  const baseColor = useMemo(() => {
    if (typeof color === "string") return new Color(color);
    return new Color(color[0], color[1], color[2]);
  }, [color]);

  const displayColor = useMemo(() => {
    if (hovered && !active) return baseColor.clone().lerp(HOVER_GLOW, 0.35);
    if (active) return baseColor.clone().lerp(HOVER_GLOW, 0.15);
    return baseColor;
  }, [baseColor, hovered, active]);

  const { points, curve } = useMemo(() => {
    const p0 = new THREE.Vector3(...start);
    const p3 = new THREE.Vector3(...end);
    const dist = p0.distanceTo(p3);
    const scale = Math.min(dist * 0.4, 2.5);

    const mid = p0.clone().add(p3).multiplyScalar(0.5);
    mid.x += curveBias[0];
    mid.y += curveBias[1] * scale;
    mid.z += curveBias[2];

    const c = new THREE.QuadraticBezierCurve3(p0, mid, p3);
    const ptsVec = c.getPoints(28);
    const ptsArr = ptsVec.map((v) => [v.x, v.y, v.z] as [number, number, number]);
    return { points: ptsArr, curve: c };
  }, [start, end, curveBias]);

  // Derived thickness and opacity from data value
  const clampedVal = Math.max(0.05, Math.min(value, 1.0));
  const lineWidth = (1.5 + clampedVal * 2.5) * (hovered ? 1.4 : 1.0);
  const opacity = Math.min(1.0, 0.35 + clampedVal * 0.65);

  useFrame(({ clock }) => {
    if (animated && markerRef.current && curve) {
      const t = (clock.getElapsedTime() * pulseSpeed) % 1;
      const pt = curve.getPoint(t);
      markerRef.current.position.copy(pt);
    }
  });

  return (
    <group
      onPointerEnter={(e) => {
        e.stopPropagation();
        onPointerEnter?.();
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        onPointerLeave?.();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <Line
        points={points}
        color={displayColor}
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
      />

      {animated && (
        <mesh ref={markerRef}>
          <sphereGeometry args={[0.08 + clampedVal * 0.04, 12, 12]} />
          <meshBasicMaterial color={displayColor} />
        </mesh>
      )}

      {label && (
        <Billboard position={points[Math.floor(points.length / 2)]}>
          <Text
            fontSize={0.24}
            color={hovered ? "#ffffff" : "#94a3b8"}
            outlineWidth={0.012}
            outlineColor="#000000"
          >
            {label}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
