"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useStore } from "@/lib/store";
import { LAYOUT, nodeWorldPos, cameraOverview } from "../ArchitectureLayout";
import { getComponentDefinition } from "./componentDefinitions";

const N_LAYERS = 24;

export function InspectCameraRig({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();

  const inspectingComponentId = useStore((s) => s.inspectingComponentId);
  const arch3dLayer = useStore((s) => s.arch3dLayer);
  const userOrbiting = useStore((s) => s.userOrbiting);
  const arch = useStore((s) => s.arch);
  const data = useStore((s) => s.data);

  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const prevCamPos = useRef<THREE.Vector3 | null>(null);
  const prevCamLook = useRef<THREE.Vector3 | null>(null);

  // Calculate inspect camera framing dynamically
  useEffect(() => {
    if (!inspectingComponentId) {
      // Exiting inspect mode: restore previous camera view
      if (prevCamPos.current && prevCamLook.current) {
        targetPos.current.copy(prevCamPos.current);
        targetLook.current.copy(prevCamLook.current);
      }
      return;
    }

    // Entering inspect mode: save previous camera position & target first
    if (controlsRef.current) {
      prevCamPos.current = camera.position.clone();
      prevCamLook.current = controlsRef.current.target.clone();
    } else {
      const overview = cameraOverview(N_LAYERS);
      prevCamPos.current = new THREE.Vector3(...overview.position);
      prevCamLook.current = new THREE.Vector3(...overview.target);
    }

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

    const comp = getComponentDefinition(inspectingComponentId, arch3dLayer, meta);
    const [tx, ty, tz] = nodeWorldPos(inspectingComponentId, N_LAYERS);

    // Calculate component bounding distance dynamically
    const dist = (() => {
      switch (comp.category) {
        case "Normalization":
          return 7.0;
        case "Attention":
          return 9.0;
        case "MLP":
          return 10.0;
        case "Embedding":
        case "Output":
          return 12.0;
        case "Residual":
          return 7.5;
        default:
          return 8.5;
      }
    })();

    targetLook.current.set(tx, ty, tz);
    targetPos.current.set(tx + 2.5, ty + 1.8, tz + dist);
  }, [inspectingComponentId, arch3dLayer, arch, data, camera, controlsRef]);

  // Smooth lerp camera movement
  useFrame((_, delta) => {
    if (!inspectingComponentId || userOrbiting || !controlsRef.current) return;

    const factor = Math.min(delta * 6.0, 0.25);
    camera.position.lerp(targetPos.current, factor);
    controlsRef.current.target.lerp(targetLook.current, factor);
    controlsRef.current.update();
  });

  return null;
}
