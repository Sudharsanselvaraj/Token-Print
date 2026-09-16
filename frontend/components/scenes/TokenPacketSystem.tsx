"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { SceneHtml } from "@/components/ui/SceneHtml";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { LAYOUT, nodeWorldPos } from "./ArchitectureLayout";

const DEFAULT_TOKENS = [
  { index: 0, text: "Name", id: 2437 },
  { index: 1, text: "one", id: 284 },
  { index: 2, text: "primary", id: 4331 },
  { index: 3, text: "color", id: 16326 },
  { index: 4, text: ".", id: 2456 },
];

export function TokenPacketSystem() {
  const data = useStore((s) => s.data);
  const arch3dOpId = useStore((s) => s.arch3dOpId);
  const arch3dPlaying = useStore((s) => s.arch3dPlaying);
  const arch3dSpeed = useStore((s) => s.arch3dSpeed);
  const selectedTokenIndex = useStore((s) => s.selectedTokenIndex);

  const tokens = data?.tokens || DEFAULT_TOKENS;

  // Compute current physical 3D world position of the active operation
  const targetOpPos = useMemo(() => {
    return new THREE.Vector3(...nodeWorldPos(arch3dOpId, 24));
  }, [arch3dOpId]);

  const packetGroupRef = useRef<THREE.Group>(null);
  const currentPosRef = useRef<THREE.Vector3>(
    new THREE.Vector3(
      (selectedTokenIndex - (tokens.length - 1) / 2) * 2.2,
      LAYOUT.EMBED_Y + 3,
      LAYOUT.SPINE_Z
    )
  );

  // Smooth physical motion lerp with acceleration/deceleration
  useFrame((_, delta) => {
    if (!packetGroupRef.current) return;

    if (arch3dPlaying) {
      const speedFactor = Math.min(delta * 6.0 * arch3dSpeed, 0.35);
      currentPosRef.current.lerp(targetOpPos, speedFactor);
    } else {
      currentPosRef.current.lerp(targetOpPos, Math.min(delta * 8.0, 0.4));
    }

    packetGroupRef.current.position.copy(currentPosRef.current);
  });

  const activeToken = tokens[selectedTokenIndex] || tokens[0];

  return (
    <group ref={packetGroupRef}>
      {/* Clean Floating Token Name — Token Word Alone Travels without any 3D box/sphere structure */}
      <SceneHtml
        position={[0, 0, 0]}
        center
        distanceFactor={16}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div style={{
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: 800,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.05em",
          textShadow: "0 0 10px rgba(0,0,0,0.95), 0 2px 5px rgba(0,0,0,0.9)",
          whiteSpace: "nowrap",
        }}>
          {activeToken.text}
        </div>
      </SceneHtml>
    </group>
  );
}
