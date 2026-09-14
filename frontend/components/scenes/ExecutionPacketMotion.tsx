"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "../../lib/store";
import { EXECUTION_GRAPH, PacketSemanticType } from "../../lib/executionGraph";

const MAX_PACKETS = 32;

const SEMANTIC_COLORS: Record<PacketSemanticType, THREE.Color> = {
  TOKEN:     new THREE.Color("#06b6d4"), // Cyan
  Q:         new THREE.Color("#22c55e"), // Green
  K:         new THREE.Color("#3b82f6"), // Blue
  V:         new THREE.Color("#f97316"), // Orange
  ATTENTION: new THREE.Color("#a855f7"), // Purple
  RESIDUAL:  new THREE.Color("#e2e8f0"), // Silver
  MLP:       new THREE.Color("#f59e0b"), // Amber
};

export function ExecutionPacketMotion() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const mode = useStore((s) => s.mode);
  const opPlaying = useStore((s) => s.opPlaying);
  const opIndex = useStore((s) => s.opIndex);
  const genMeta = useStore((s) => s.genMeta);
  const playSpeed = useStore((s) => s.playSpeed);

  const nLayers = genMeta?.num_layers ?? 24;

  const currentTimelineStep = useMemo(() => {
    const catalog = genMeta?.op_catalog ?? [];
    if (!catalog.length) {
      const idx = Math.min(opIndex, EXECUTION_GRAPH.timeline.length - 1);
      return EXECUTION_GRAPH.timeline[idx] ?? EXECUTION_GRAPH.timeline[0];
    }
    const currentOp = catalog[Math.min(opIndex, catalog.length - 1)];
    const l = currentOp?.layer ?? null;
    const key = (currentOp?.op_key ?? "").toLowerCase();

    return EXECUTION_GRAPH.timeline.find((t) => {
      if (t.layer !== l) return false;
      if (key.includes("norm1")) return t.stage === "NORM_1";
      if (key.includes("q_proj") || key.includes("k_proj") || key.includes("v_proj")) return t.stage === "QKV_PROJECTION";
      if (key.includes("rope")) return t.stage === "ROPE";
      if (key.includes("attn") || key.includes("softmax")) return t.stage === "SOFTMAX";
      if (key.includes("o_proj")) return t.stage === "O_PROJECTION";
      if (key.includes("norm2")) return t.stage === "NORM_2";
      if (key.includes("mlp") || key.includes("swiglu")) return t.stage === "SWIGLU";
      return t.layer === l;
    }) ?? EXECUTION_GRAPH.timeline[0];
  }, [opIndex, genMeta, nLayers]);

  const activeEdge = useMemo(() => {
    if (!currentTimelineStep?.edgeId) return null;
    return EXECUTION_GRAPH.edges.get(currentTimelineStep.edgeId) ?? null;
  }, [currentTimelineStep]);

  const progressRef = useRef(0);

  useFrame((_, delta) => {
    if (mode !== "generation" || !meshRef.current) return;

    if (opPlaying && activeEdge) {
      const speed = Math.max(0.25, playSpeed);
      progressRef.current = (progressRef.current + delta * 2.2 * speed) % 1.0;
    } else {
      progressRef.current = 0.5;
    }

    if (!activeEdge) {
      meshRef.current.count = 0;
      return;
    }

    meshRef.current.count = 1;

    const route = activeEdge.route;
    const p1 = new THREE.Vector3(...route[0]);
    const p2 = new THREE.Vector3(...route[1]);
    const p3 = new THREE.Vector3(...route[2]);

    const t = progressRef.current;
    const currentPos = new THREE.Vector3();

    // Quadratic Bezier interpolation: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
    currentPos.x = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * p2.x + t * t * p3.x;
    currentPos.y = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * p2.y + t * t * p3.y;
    currentPos.z = (1 - t) * (1 - t) * p1.z + 2 * (1 - t) * t * p2.z + t * t * p3.z;

    dummy.position.copy(currentPos);
    dummy.scale.setScalar(0.45);
    dummy.updateMatrix();

    meshRef.current.setMatrixAt(0, dummy.matrix);

    const col = SEMANTIC_COLORS[activeEdge.semanticType] || SEMANTIC_COLORS.TOKEN;
    meshRef.current.setColorAt(0, col);

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_PACKETS]}
      frustumCulled={false}
    >
      <boxGeometry args={[0.35, 0.35, 0.35]} />
      <meshStandardMaterial
        roughness={0.2}
        metalness={0.8}
        emissiveIntensity={0.6}
      />
    </instancedMesh>
  );
}
