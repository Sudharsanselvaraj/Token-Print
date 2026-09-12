"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { LAYOUT, layerOrigin } from "./ArchitectureLayout";

export function GqaVisualization3D() {
  const arch3dLayer = useStore((s) => s.arch3dLayer);
  const arch3dOpKind = useStore((s) => s.arch3dOpKind);
  const arch = useStore((s) => s.arch);
  const data = useStore((s) => s.data);

  const m = arch?.metadata;
  const numHeads = m?.num_heads || data?.num_heads || 14;
  const kvHeads = m?.num_kv_heads || 2;
  const qPerKv = Math.max(1, Math.floor(numHeads / kvHeads));

  const l = arch3dLayer >= 0 ? arch3dLayer : 0;
  const [, ly] = layerOrigin(l);

  const ropeGroupRef = useRef<THREE.Group>(null);

  // Rotate RoPE 2D component plane deterministically during RoPE step
  useFrame((_, delta) => {
    if (ropeGroupRef.current && arch3dOpKind === "rope") {
      ropeGroupRef.current.rotation.z += delta * 1.5;
    }
  });

  // Calculate 14 Q channels and 2 KV shared groups positions
  const qHeadChannels = useMemo(() => {
    const channels: [number, number, number][] = [];
    const width = 6.0;
    for (let i = 0; i < numHeads; i++) {
      const x = LAYOUT.BRANCH_Q_X - width / 2 + (i / (numHeads - 1)) * width;
      channels.push([x, ly + 1.2, LAYOUT.QKV_Z - 0.2]);
    }
    return channels;
  }, [numHeads, ly]);

  const kvGroups = useMemo(() => {
    const groups: [number, number, number][] = [];
    const width = 3.0;
    for (let i = 0; i < kvHeads; i++) {
      const x = LAYOUT.BRANCH_K_X - width / 2 + (i / Math.max(1, kvHeads - 1)) * width;
      groups.push([x, ly + 1.2, LAYOUT.QKV_Z - 0.7]);
    }
    return groups;
  }, [kvHeads, ly]);

  // Routing lines from Q channels to KV groups
  const routingWires = useMemo(() => {
    const wires: [number, number, number][][] = [];
    qHeadChannels.forEach((qPos, i) => {
      const kvIndex = Math.min(kvHeads - 1, Math.floor(i / qPerKv));
      const kvPos = kvGroups[kvIndex];
      wires.push([qPos, [kvPos[0], kvPos[1] - 0.8, kvPos[2]]]);
    });
    return wires;
  }, [qHeadChannels, kvGroups, kvHeads, qPerKv]);

  const isRopeActive = arch3dOpKind === "rope";
  const isGqaActive = arch3dOpKind === "attn_q" || arch3dOpKind === "attn_k" || arch3dOpKind === "attn_v" || arch3dOpKind === "attn_scores";
  const isSwigluActive = arch3dOpKind === "swiglu" || arch3dOpKind === "mlp_gate" || arch3dOpKind === "mlp_up";

  if (arch3dLayer < 0) return null;

  return (
    <group>
      {/* ── 1. GQA (Grouped-Query Attention) Channels ── */}
      {isGqaActive && (
        <group>
          {/* Q Channel Pillars */}
          {qHeadChannels.map((pos, i) => (
            <mesh key={`q_${i}`} position={pos}>
              <boxGeometry args={[0.25, 0.6, 0.25]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#ffffff"
                emissiveIntensity={0.4}
                roughness={0.2}
                metalness={0.8}
              />
            </mesh>
          ))}

          {/* Shared KV Group Pillars */}
          {kvGroups.map((pos, i) => (
            <group key={`kv_${i}`} position={pos}>
              <mesh>
                <boxGeometry args={[1.2, 0.7, 0.5]} />
                <meshStandardMaterial
                  color="#e4e4e7"
                  emissive="#e4e4e7"
                  emissiveIntensity={0.6}
                  roughness={0.2}
                  metalness={0.9}
                />
              </mesh>
              <Html position={[0, 0.7, 0]} center distanceFactor={14}>
                <div className="bg-black/90 text-white border border-zinc-700 px-1 py-0.5 font-mono text-[8px] whitespace-nowrap">
                  KV GROUP {i + 1} ({qPerKv} Q HEADS)
                </div>
              </Html>
            </group>
          ))}

          {/* Routing Beams linking 14 Q Heads to 2 Shared KV Groups */}
          {routingWires.map((wire, i) => (
            <Line
              key={`wire_${i}`}
              points={wire}
              color="#ffffff"
              lineWidth={1.5}
              transparent
              opacity={0.65}
            />
          ))}
        </group>
      )}

      {/* ── 2. RoPE (Rotary Positional Embedding) Plane ── */}
      {isRopeActive && (
        <group position={[LAYOUT.BRANCH_V_X + 0.4, ly + 1.2, LAYOUT.NORM_Z]}>
          <group ref={ropeGroupRef}>
            <mesh>
              <ringGeometry args={[0.6, 0.9, 32]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#ffffff"
                emissiveIntensity={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* 2D Vector Axis Line inside RoPE plane */}
            <Line
              points={[
                [-0.8, 0, 0],
                [0.8, 0, 0],
              ]}
              color="#ffffff"
              lineWidth={2}
            />
            <Line
              points={[
                [0, -0.8, 0],
                [0, 0.8, 0],
              ]}
              color="#a1a1aa"
              lineWidth={2}
            />
          </group>
          <Html position={[0, 1.2, 0]} center distanceFactor={14}>
            <div className="bg-black/90 text-white border border-zinc-700 px-1.5 py-0.5 font-mono text-[9px] whitespace-nowrap">
              RoPE 2D PHASE ROTATION PLANE
            </div>
          </Html>
        </group>
      )}

      {/* ── 3. SwiGLU Stream Parallel Flow & Merge ── */}
      {isSwigluActive && (
        <group position={[0, ly - 5.5, LAYOUT.MLP_Z]}>
          {/* Gate Stream */}
          <Line
            points={[
              [LAYOUT.BRANCH_Q_X, 0, 0],
              [LAYOUT.BRANCH_K_X - 0.5, 0, 0],
            ]}
            color="#ffffff"
            lineWidth={3}
          />
          {/* Up Stream */}
          <Line
            points={[
              [LAYOUT.BRANCH_K_X + 1.5, 0, 0],
              [LAYOUT.BRANCH_K_X + 0.5, 0, 0],
            ]}
            color="#e4e4e7"
            lineWidth={3}
          />
          {/* SwiGLU Element-Wise Merge Junction */}
          <mesh position={[LAYOUT.BRANCH_K_X, 0, 0]}>
            <octahedronGeometry args={[0.6]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.7}
              roughness={0.1}
            />
          </mesh>
          <Html position={[LAYOUT.BRANCH_K_X, 0.9, 0]} center distanceFactor={14}>
            <div className="bg-black/90 text-white border border-zinc-700 px-1.5 py-0.5 font-mono text-[9px] whitespace-nowrap">
              SwiGLU: SiLU(GATE) ⊙ UP
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
