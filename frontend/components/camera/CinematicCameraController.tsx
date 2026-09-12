"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useStore } from "@/lib/store";
import {
  LAYOUT,
  cameraOverview,
  cameraForLayer,
  cameraForOp,
  nodeWorldPos,
} from "@/components/scenes/ArchitectureLayout";
import { opById } from "@/components/scenes/TransformerOperationGraph";

const N_LAYERS = 24;

export type CameraPreset =
  | "overviewShot"
  | "inputShot"
  | "embeddingShot"
  | "layerEstablishingShot"
  | "normShot"
  | "projectionShot"
  | "ropeShot"
  | "attentionShot"
  | "softmaxShot"
  | "weightedVShot"
  | "residualShot"
  | "mlpShot"
  | "swigluShot"
  | "layerTransitionShot"
  | "finalNormShot"
  | "lmHeadShot"
  | "predictionShot";

/**
 * Computes deterministic camera position & look-at target for a specific preset & layer/op state.
 */
export function getPresetTransform(
  preset: CameraPreset,
  layer: number,
  opId: string,
  numLayers = 24
): { position: [number, number, number]; target: [number, number, number] } {
  const l = Math.max(0, Math.min(layer, numLayers - 1));
  const ly = -l * LAYOUT.LAYER_HEIGHT;
  const lastY = -((numLayers - 1) * LAYOUT.LAYER_HEIGHT);

  switch (preset) {
    case "overviewShot":
      return cameraOverview(numLayers);

    case "inputShot":
      return {
        position: [0, LAYOUT.EMBED_Y + 7, 14],
        target: [0, LAYOUT.EMBED_Y + 3, 0],
      };

    case "embeddingShot":
      return {
        position: [0, LAYOUT.EMBED_Y + 2, 10],
        target: [0, LAYOUT.EMBED_Y, LAYOUT.NORM_Z],
      };

    case "layerEstablishingShot":
      return cameraForLayer(l);

    case "normShot":
      return {
        position: [0, ly + 4.5, 9],
        target: [0, ly + 2.8, LAYOUT.NORM_Z],
      };

    case "projectionShot":
      return {
        position: [0, ly + 2.5, 10],
        target: [0, ly + 1.2, LAYOUT.QKV_Z],
      };

    case "ropeShot":
      return {
        position: [LAYOUT.BRANCH_V_X, ly + 2.2, 7],
        target: [LAYOUT.BRANCH_V_X, ly + 1.2, LAYOUT.NORM_Z],
      };

    case "attentionShot":
      return {
        position: [0, ly + 0.8, 9],
        target: [0, ly - 0.5, LAYOUT.ATTN_Z],
      };

    case "softmaxShot":
      return {
        position: [0, ly + 0.2, 7.5],
        target: [0, ly - 0.5, LAYOUT.ATTN_Z],
      };

    case "weightedVShot":
      return {
        position: [1.5, ly - 0.2, 8],
        target: [0, ly - 0.8, LAYOUT.ATTN_Z],
      };

    case "residualShot":
      return {
        position: [LAYOUT.SPINE_X + 4, ly - 1.2, 8],
        target: [LAYOUT.SPINE_X, ly - 2.2, LAYOUT.SPINE_Z],
      };

    case "mlpShot":
      return {
        position: [0, ly - 4.0, 10],
        target: [0, ly - 5.5, LAYOUT.MLP_Z],
      };

    case "swigluShot":
      return {
        position: [LAYOUT.BRANCH_K_X + 2, ly - 4.2, 7.5],
        target: [LAYOUT.BRANCH_K_X, ly - 5.5, LAYOUT.MLP_Z],
      };

    case "layerTransitionShot": {
      const nextY = -(l + 1) * LAYOUT.LAYER_HEIGHT;
      const midY = (ly - 7.0 + nextY + 2.8) / 2;
      return {
        position: [LAYOUT.SPINE_X + 5, midY, 11],
        target: [LAYOUT.SPINE_X, midY, LAYOUT.SPINE_Z],
      };
    }

    case "finalNormShot":
      return {
        position: [0, lastY - LAYOUT.FINAL_NORM_Y_OFFSET + 3, 9],
        target: [0, lastY - LAYOUT.FINAL_NORM_Y_OFFSET, LAYOUT.NORM_Z],
      };

    case "lmHeadShot":
      return {
        position: [0, lastY - LAYOUT.LM_HEAD_Y_OFFSET + 1, 12],
        target: [0, lastY - LAYOUT.LM_HEAD_Y_OFFSET - 2, LAYOUT.NORM_Z],
      };

    case "predictionShot":
      return {
        position: [0, lastY - LAYOUT.LM_HEAD_Y_OFFSET - 4, 14],
        target: [0, lastY - LAYOUT.LM_HEAD_Y_OFFSET - 6, LAYOUT.NORM_Z],
      };

    default:
      return cameraForOp(opId, numLayers);
  }
}

/**
 * Maps an operation ID to its corresponding cinematic preset.
 */
export function opToPreset(opId: string): CameraPreset {
  if (opId === "op_embed") return "embeddingShot";
  if (opId === "op_final_norm") return "finalNormShot";
  if (opId === "op_lm_head") return "lmHeadShot";

  const match = opId.match(/^op_l\d+_(.+)$/);
  if (!match) return "overviewShot";

  const kind = match[1];
  switch (kind) {
    case "norm1":           return "normShot";
    case "attn_q":
    case "attn_k":
    case "attn_v":          return "projectionShot";
    case "rope":            return "ropeShot";
    case "attn_scores":
    case "attn_scale":
    case "attn_mask":       return "attentionShot";
    case "attn_softmax":    return "softmaxShot";
    case "attn_weighted_v": return "weightedVShot";
    case "attn_o":
    case "res_add1":        return "residualShot";
    case "norm2":           return "normShot";
    case "mlp_gate":
    case "mlp_up":          return "mlpShot";
    case "swiglu":          return "swigluShot";
    case "mlp_down":
    case "res_add2":        return "residualShot";
    default:                return "overviewShot";
  }
}

export function CinematicCameraController({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();

  const cameraMode = useStore((s) => s.cameraMode);
  const arch3dOpId = useStore((s) => s.arch3dOpId);
  const arch3dLayer = useStore((s) => s.arch3dLayer);
  const arch3dPlaying = useStore((s) => s.arch3dPlaying);
  const arch3dSpeed = useStore((s) => s.arch3dSpeed);
  const selectedTokenIndex = useStore((s) => s.selectedTokenIndex);
  const userOrbiting = useStore((s) => s.userOrbiting);
  const setUserOrbiting = useStore((s) => s.setUserOrbiting);

  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const transitionProgressRef = useRef<number>(1.0);

  // Initialize camera position on mount
  useEffect(() => {
    const { position, target } = cameraOverview(N_LAYERS);
    targetPos.current.set(...position);
    targetLook.current.set(...target);
    camera.position.set(...position);
    if (controlsRef.current) {
      controlsRef.current.target.set(...target);
      controlsRef.current.update();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute camera target whenever selection or mode changes
  useEffect(() => {
    let pos: [number, number, number];
    let tgt: [number, number, number];

    if (cameraMode === "overview") {
      const r = cameraOverview(N_LAYERS);
      pos = r.position;
      tgt = r.target;
    } else if (cameraMode === "layer") {
      const l = arch3dLayer >= 0 ? arch3dLayer : 0;
      const r = cameraForLayer(l);
      pos = r.position;
      tgt = r.target;
    } else if (cameraMode === "token_follow") {
      const tokenX = (selectedTokenIndex - 2) * 2.2 * 0.35;
      const l = arch3dLayer >= 0 ? arch3dLayer : 0;
      const [, ly] = nodeWorldPos(arch3dOpId, N_LAYERS);
      pos = [tokenX + 4.5, ly + 2.5, 11];
      tgt = [tokenX, ly, 0];
    } else {
      // "operation" mode
      const preset = opToPreset(arch3dOpId);
      const r = getPresetTransform(preset, arch3dLayer >= 0 ? arch3dLayer : 0, arch3dOpId, N_LAYERS);
      pos = r.position;
      tgt = r.target;
    }

    const dist = targetLook.current.distanceTo(new THREE.Vector3(...tgt));
    targetPos.current.set(...pos);
    targetLook.current.set(...tgt);
    transitionProgressRef.current = 0;

    // Direct snap for huge vertical jumps when user clicks far away
    if (dist > 30 && controlsRef.current && !arch3dPlaying) {
      setUserOrbiting(false);
      camera.position.set(...pos);
      controlsRef.current.target.set(...tgt);
      controlsRef.current.update();
    }
  }, [
    cameraMode,
    arch3dOpId,
    arch3dLayer,
    selectedTokenIndex,
    arch3dPlaying,
    camera,
    setUserOrbiting,
  ]);

  const inspectingComponentId = useStore((s) => s.inspectingComponentId);

  // Smooth R3F frame loop with spring/damped lerping
  useFrame((_, delta) => {
    if (inspectingComponentId || userOrbiting || !controlsRef.current) return;

    // Adapt speed to arch3dSpeed
    const damping = Math.min(delta * 5.0 * arch3dSpeed, 0.22);
    camera.position.lerp(targetPos.current, damping);
    controlsRef.current.target.lerp(targetLook.current, damping);
    controlsRef.current.update();

    if (transitionProgressRef.current < 1) {
      transitionProgressRef.current = Math.min(
        1.0,
        transitionProgressRef.current + delta * 2.0 * arch3dSpeed
      );
    }
  });

  return null;
}
