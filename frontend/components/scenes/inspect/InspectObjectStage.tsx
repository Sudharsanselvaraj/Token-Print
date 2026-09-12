"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { LAYOUT, nodeWorldPos } from "../ArchitectureLayout";
import { getComponentDefinition } from "./componentDefinitions";
import { InspectLabel } from "./InspectLabel";
import { InspectLighting } from "./InspectLighting";

export function InspectObjectStage() {
  const inspectingComponentId = useStore((s) => s.inspectingComponentId);
  const arch3dLayer = useStore((s) => s.arch3dLayer);
  const inspectAutoRotate = useStore((s) => s.inspectAutoRotate);
  const arch = useStore((s) => s.arch);
  const data = useStore((s) => s.data);

  const heroGroupRef = useRef<THREE.Group>(null);

  const m = arch?.metadata;
  const meta = {
    hiddenSize: m?.hidden_size || data?.hidden_size || 896,
    numHeads: m?.num_heads || data?.num_heads || 14,
    kvHeads: m?.num_kv_heads || 2,
    headDim: Math.floor((m?.hidden_size || 896) / (m?.num_heads || 14)),
    ffnSize: m?.ffn_size || 4864,
    vocabSize: m?.vocab_size || 151936,
    totalLayers: m?.num_layers || data?.num_layers || 24,
  };

  const comp = useMemo(() => {
    if (!inspectingComponentId) return null;
    return getComponentDefinition(inspectingComponentId, arch3dLayer, meta);
  }, [inspectingComponentId, arch3dLayer, meta]);

  const worldPos = useMemo(() => {
    if (!inspectingComponentId) return [0, 0, 0] as [number, number, number];
    return nodeWorldPos(inspectingComponentId, meta.totalLayers);
  }, [inspectingComponentId, meta.totalLayers]);

  // Slow continuous turntable Y-axis rotation (0.12 rad/sec)
  useFrame((_, delta) => {
    if (heroGroupRef.current && inspectAutoRotate && inspectingComponentId) {
      heroGroupRef.current.rotation.y += delta * 0.12;
    }
  });

  if (!inspectingComponentId || !comp) return null;

  return (
    <group position={worldPos}>
      <InspectLighting />

      {/* Hero Component Turntable Group */}
      <group ref={heroGroupRef}>
        {/* Render distinct geometry representation based on objectType */}
        {comp.objectType === "norm_chamber" && (
          <mesh>
            <cylinderGeometry args={[2.5, 2.5, 1.2, 32]} />
            <meshStandardMaterial
              color="#f4f4f5"
              emissive="#ffffff"
              emissiveIntensity={0.25}
              roughness={0.2}
              metalness={0.7}
            />
          </mesh>
        )}

        {(comp.objectType === "q_channels" || comp.objectType === "gqa_bank") && (
          <group>
            <mesh>
              <boxGeometry args={[4.2, 2.0, 1.4]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#ffffff"
                emissiveIntensity={0.3}
                roughness={0.2}
                metalness={0.8}
              />
            </mesh>
            {/* Internal Channel Segments */}
            {Array.from({ length: 7 }, (_, i) => (
              <mesh key={i} position={[(i - 3) * 0.55, 0, 0.72]}>
                <boxGeometry args={[0.45, 1.8, 0.05]} />
                <meshStandardMaterial color="#d4d4d8" roughness={0.1} />
              </mesh>
            ))}
          </group>
        )}

        {comp.objectType === "rope_plane" && (
          <group>
            <mesh>
              <ringGeometry args={[1.2, 1.8, 32]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#ffffff"
                emissiveIntensity={0.5}
                side={THREE.DoubleSide}
              />
            </mesh>
            <Line points={[[-1.6, 0, 0], [1.6, 0, 0]]} color="#ffffff" lineWidth={3} />
            <Line points={[[0, -1.6, 0], [0, 1.6, 0]]} color="#a1a1aa" lineWidth={3} />
          </group>
        )}

        {comp.objectType === "score_matrix" || comp.objectType === "softmax_surface" && (
          <mesh rotation={[-Math.PI / 6, 0, 0]}>
            <boxGeometry args={[4.5, 4.5, 0.5]} />
            <meshStandardMaterial
              color="#f4f4f5"
              emissive="#ffffff"
              emissiveIntensity={0.35}
              roughness={0.2}
              metalness={0.6}
            />
          </mesh>
        )}

        {(comp.objectType === "gate_slab" || comp.objectType === "up_slab" || comp.objectType === "down_slab") && (
          <mesh>
            <boxGeometry args={[5.0, 2.2, 1.5]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.3}
              roughness={0.2}
              metalness={0.7}
            />
          </mesh>
        )}

        {comp.objectType === "swiglu_junction" && (
          <group>
            <mesh>
              <octahedronGeometry args={[1.6]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#ffffff"
                emissiveIntensity={0.6}
                roughness={0.1}
              />
            </mesh>
          </group>
        )}

        {/* Default High-Contrast Geometry for generic ops */}
        {!["norm_chamber", "q_channels", "gqa_bank", "rope_plane", "score_matrix", "softmax_surface", "gate_slab", "up_slab", "down_slab", "swiglu_junction"].includes(comp.objectType) && (
          <mesh>
            <boxGeometry args={[4.5, 2.0, 1.4]} />
            <meshStandardMaterial
              color="#f4f4f5"
              emissive="#ffffff"
              emissiveIntensity={0.3}
              roughness={0.2}
              metalness={0.7}
            />
          </mesh>
        )}

      </group>

      {/* Hero Label Overlay */}
      <InspectLabel component={comp} position={[0, 2.4, 0]} />
    </group>
  );
}
