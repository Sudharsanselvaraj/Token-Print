"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useStore } from "@/lib/store";
import {
  cameraOverview,
  cameraOverviewForMode,
  cameraForLayer,
  cameraForOp,
  nodeWorldPos,
  LAYOUT,
} from "@/components/scenes/ArchitectureLayout";
import { getPresetTransform, opToPreset } from "./CinematicCameraController";

const DEFAULT_LAYERS = 24;

export function GlobalCameraController({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();

  const mode = useStore((s) => s.mode);
  const navMode = useStore((s) => s.navMode);
  const cameraMode = useStore((s) => s.cameraMode);
  const userOrbiting = useStore((s) => s.userOrbiting);
  const setUserOrbiting = useStore((s) => s.setUserOrbiting);
  const inspectingComponentId = useStore((s) => s.inspectingComponentId);

  // Architecture mode state
  const arch3dOpId = useStore((s) => s.arch3dOpId);
  const arch3dLayer = useStore((s) => s.arch3dLayer);
  const arch3dPlaying = useStore((s) => s.arch3dPlaying);
  const arch3dSpeed = useStore((s) => s.arch3dSpeed);
  const selectedTokenIndex = useStore((s) => s.selectedTokenIndex);

  // Generation mode state
  const opIndex = useStore((s) => s.opIndex);
  const opPlaying = useStore((s) => s.opPlaying);
  const playIndex = useStore((s) => s.playIndex);
  const isPlaying = useStore((s) => s.isPlaying);
  const genMeta = useStore((s) => s.genMeta);
  const selectedLayer = useStore((s) => s.selectedLayer);

  // Walkthrough state
  const wtChapter = useStore((s) => s.wtChapter);
  const wtPlaying = useStore((s) => s.wtPlaying);

  const numLayers = genMeta?.num_layers ?? DEFAULT_LAYERS;

  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());

  const fov = (camera as THREE.PerspectiveCamera).fov ?? 48;

  // Set initial camera view on mount using mode-specific bounds framing
  useEffect(() => {
    const { position, target } = cameraOverviewForMode(mode, numLayers, fov);
    targetPos.current.set(...position);
    targetLook.current.set(...target);
    camera.position.set(...position);
    if (controlsRef.current) {
      controlsRef.current.target.set(...target);
      controlsRef.current.update();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, numLayers, fov]);

  // Compute transform target based on navMode & mode
  const getTargetTransform = (): { position: [number, number, number]; target: [number, number, number] } => {
    const activeNav = navMode === "MANUAL" ? (cameraMode === "overview" ? "OVERVIEW" : "MANUAL") : navMode;

    switch (activeNav) {
      case "OVERVIEW":
        return cameraOverviewForMode(mode, numLayers, fov);

      case "LAYER_FOCUS": {
        let l = 0;
        if (mode === "explorer") {
          l = arch3dLayer >= 0 ? arch3dLayer : selectedLayer;
          l = Math.max(0, Math.min(l, numLayers - 1));
          return cameraForLayer(l);
        } else if (mode === "generation") {
          const catalogOp = genMeta?.op_catalog?.[opIndex];
          l = catalogOp?.layer ?? selectedLayer;
          l = Math.max(0, Math.min(l, numLayers - 1));
          const ly = -(l + 1) * 2.6;
          return {
            position: [0, ly + 2.8, 10.5],
            target: [0, ly, 0],
          };
        } else {
          l = Math.max(0, Math.min(selectedLayer, numLayers - 1));
          const ly = -(l + 1) * 3.4;
          return {
            position: [0, ly + 3.2, 12],
            target: [0, ly, 0],
          };
        }
      }

      case "OP_FOCUS": {
        if (mode === "explorer") {
          const preset = opToPreset(arch3dOpId);
          const l = arch3dLayer >= 0 ? arch3dLayer : selectedLayer;
          return getPresetTransform(preset, l, arch3dOpId, numLayers);
        } else if (mode === "generation") {
          const catalogOp = genMeta?.op_catalog?.[opIndex];
          const l = catalogOp?.layer ?? 0;
          const ly = -(l + 1) * 2.6;
          return {
            position: [0, ly + 2.2, 9.5],
            target: [0, ly, 0],
          };
        } else {
          const l = Math.min(wtChapter, numLayers - 1);
          const ly = -(l + 1) * 3.4;
          return {
            position: [0, ly + 2.5, 11],
            target: [0, ly, 0],
          };
        }
      }

      case "FOLLOW": {
        if (mode === "explorer") {
          const l = arch3dLayer >= 0 ? arch3dLayer : 0;
          const [, ly] = nodeWorldPos(arch3dOpId, numLayers);
          const tokenX = (selectedTokenIndex - 2) * 0.77;
          return {
            position: [tokenX + 4.5, ly + 2.5, 11],
            target: [tokenX, ly, 0],
          };
        } else if (mode === "generation") {
          const catalogOp = genMeta?.op_catalog?.[opIndex];
          const l = catalogOp?.layer ?? (playIndex >= 0 ? playIndex % numLayers : 0);
          const ly = -(l + 1) * 2.6;
          return {
            position: [4.5, ly + 2.2, 10.5],
            target: [0, ly, 0],
          };
        } else {
          // Walkthrough follow
          const l = Math.min(wtChapter, numLayers - 1);
          const ly = -(l + 1) * 3.4;
          return {
            position: [4.5, ly + 3.0, 13],
            target: [0, ly, 0],
          };
        }
      }

      case "MANUAL":
      default:
        return {
          position: camera.position.toArray() as [number, number, number],
          target: controlsRef.current ? (controlsRef.current.target.toArray() as [number, number, number]) : [0, 0, 0],
        };
    }
  };

  // Recompute camera target on state changes
  useEffect(() => {
    if (navMode === "MANUAL" || userOrbiting) return;

    const { position: pos, target: tgt } = getTargetTransform();
    const dist = targetLook.current.distanceTo(new THREE.Vector3(...tgt));

    targetPos.current.set(...pos);
    targetLook.current.set(...tgt);

    // Snap directly for large jumps (>30 units) if not playing animation
    if (dist > 30 && controlsRef.current && !arch3dPlaying && !opPlaying && !wtPlaying) {
      setUserOrbiting(false);
      camera.position.set(...pos);
      controlsRef.current.target.set(...tgt);
      controlsRef.current.update();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    navMode,
    mode,
    arch3dOpId,
    arch3dLayer,
    opIndex,
    playIndex,
    wtChapter,
    selectedTokenIndex,
    selectedLayer,
  ]);

  // Frame update loop
  useFrame((_, delta) => {
    if (inspectingComponentId || userOrbiting || !controlsRef.current || navMode === "MANUAL") return;

    // Continuous target calculation during active playback in FOLLOW mode
    if (navMode === "FOLLOW" && (arch3dPlaying || opPlaying || isPlaying || wtPlaying)) {
      const { position: pos, target: tgt } = getTargetTransform();
      targetPos.current.set(...pos);
      targetLook.current.set(...tgt);
    }

    const speedFactor = mode === "explorer" ? arch3dSpeed : 1.0;
    const damping = Math.min(delta * 5.5 * speedFactor, 0.25);

    camera.position.lerp(targetPos.current, damping);
    controlsRef.current.target.lerp(targetLook.current, damping);
    controlsRef.current.update();
  });

  return null;
}
