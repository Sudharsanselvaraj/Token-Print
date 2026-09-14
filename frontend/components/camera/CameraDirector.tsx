"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useStore } from "@/lib/store";
import { getOpFromCatalogOrIndex } from "@/lib/playback";

const N_LAYERS = 24;
const GAP = 3.4;

export function getOpWorldTransform(
  op: { layer?: number | null; op_key?: string } | null,
  view2D: boolean,
  nLayers = 24,
  statNorm = 0.5,
  top1Prob = 0.5
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const l = op?.layer ?? (op?.op_key === "embed" ? -1 : op?.op_key === "lm_head" ? nLayers : 0);
  const baseLy = -(l + 1) * GAP;
  const key = (op?.op_key ?? "").toLowerCase();

  const target = new THREE.Vector3(0, baseLy, 0);
  const position = new THREE.Vector3(0, baseLy, 13);

  // Input Embedding Shot
  if (key.includes("embed")) {
    target.set(0, 0, 0);
    position.set(0, view2D ? 0 : 2.8, view2D ? 14 : 11);
    return { position, target };
  }

  // Token Sampling Reveal Shot — driven by real top-1 probability confidence
  if (key.includes("lm_head") || key.includes("output")) {
    const outY = -(nLayers + 1) * GAP;
    target.set(0, outY - 3.4, 0);
    if (view2D) {
      position.set(0, outY - 3.4, 15);
    } else {
      // High confidence (top1Prob >= 0.75) -> close focus on chosen token; low confidence -> wider skyline view
      const zoomZ = top1Prob >= 0.75 ? 8.5 : 12.5;
      const zoomY = top1Prob >= 0.75 ? outY - 2.8 : outY - 2.2;
      position.set(0, zoomY, zoomZ);
    }
    return { position, target };
  }

  // Calculate sub-station Y offset within the block
  let stationY = baseLy;
  if (key.includes("norm1")) {
    stationY = baseLy + GAP * 0.36;
  } else if (key.includes("attn") || key.includes("q_proj") || key.includes("k_proj") || key.includes("v_proj") || key.includes("rope") || key.includes("softmax")) {
    stationY = baseLy + GAP * 0.12;
  } else if (key.includes("norm2")) {
    stationY = baseLy - GAP * 0.14;
  } else if (key.includes("mlp") || key.includes("swiglu") || key.includes("gate") || key.includes("up") || key.includes("down")) {
    stationY = baseLy - GAP * 0.36;
  } else if (key.includes("res_add")) {
    stationY = baseLy;
  }

  if (view2D) {
    target.set(0, stationY, 0);
    position.set(0, stationY, 13);
  } else {
    // 3D Cinematic Perspective Shots with real activation magnitude push-in (statNorm)
    const pushIn = 1.0 - 0.15 * Math.max(0, statNorm - 0.5);

    if (key.includes("norm1") || key.includes("norm2")) {
      target.set(0, stationY, 0);
      position.set(0, stationY + 1.6, 8.2 * pushIn);
    } else if (key.includes("rope")) {
      target.set(3.6, stationY, 0);
      position.set(4.8, stationY + 1.2, 7.2 * pushIn);
    } else if (key.includes("attn_q") || key.includes("q_proj")) {
      target.set(-1.8, stationY, 0);
      position.set(-2.5, stationY + 1.4, 8.5 * pushIn);
    } else if (key.includes("attn_v") || key.includes("v_proj")) {
      target.set(1.8, stationY, 0);
      position.set(2.5, stationY + 1.4, 8.5 * pushIn);
    } else if (key.includes("attn") || key.includes("softmax") || key.includes("weighted_v")) {
      target.set(0, stationY, 0);
      position.set(2.8, stationY + 1.1, 8.0 * pushIn);
    } else if (key.includes("swiglu") || key.includes("mlp_gate") || key.includes("mlp_up")) {
      target.set(0, stationY, 0);
      position.set(-2.6, stationY - 0.5, 8.6 * pushIn);
    } else if (key.includes("mlp_down") || key.includes("mlp")) {
      target.set(0, stationY, 0);
      position.set(0, stationY - 0.8, 9.0 * pushIn);
    } else if (key.includes("res_add")) {
      target.set(0, stationY, 0);
      position.set(-3.2, stationY + 0.6, 9.2 * pushIn);
    } else {
      target.set(0, stationY, 0);
      position.set(3.2, stationY + 0.8, 9.2 * pushIn);
    }
  }

  return { position, target };
}

export function CameraDirector({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();

  const mode = useStore((s) => s.mode);
  const opIndex = useStore((s) => s.opIndex);
  const playIndex = useStore((s) => s.playIndex);
  const genFrames = useStore((s) => s.genFrames);
  const genMeta = useStore((s) => s.genMeta);
  const followMode = useStore((s) => s.followMode);
  const view2D = useStore((s) => s.view2D);
  const userOrbiting = useStore((s) => s.userOrbiting);
  const cameraMode = useStore((s) => s.cameraMode);
  const playSpeed = useStore((s) => s.playSpeed);

  const nLayers = genMeta?.num_layers ?? N_LAYERS;
  const activeOp = useMemo(
    () => getOpFromCatalogOrIndex(genMeta?.op_catalog, opIndex, nLayers),
    [genMeta?.op_catalog, opIndex, nLayers]
  );

  const frame = playIndex >= 0 ? genFrames[playIndex] : null;
  const activeLayer = activeOp.layer;

  // Real activation magnitude normalized per layer (from real frame.layer_stats)
  const statNorm = useMemo(() => {
    const ls = frame?.layer_stats;
    if (!ls || ls.length === 0 || activeLayer == null) return 0.5;
    const idx = Math.max(0, Math.min(activeLayer + 1, ls.length - 1));
    const max = Math.max(1e-6, ...ls);
    return Math.max(0, Math.min(ls[idx] / max, 1));
  }, [frame, activeLayer]);

  // Real top-1 token probability (from real frame.topk)
  const top1Prob = useMemo(() => {
    return frame?.topk?.[0]?.prob ?? 0.5;
  }, [frame]);

  // Memoized camera target position & look-at vector — 0 per-frame heap allocations
  const { position: desiredPos, target: desiredTgt } = useMemo(
    () => getOpWorldTransform(activeOp, view2D, nLayers, statNorm, top1Prob),
    [activeOp, view2D, nLayers, statNorm, top1Prob]
  );

  const currentPos = useRef(new THREE.Vector3(0, -GAP, 14));
  const currentTarget = useRef(new THREE.Vector3(0, -GAP, 0));

  // Global debug storage for HUD inspection
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__ns_cam_debug = {
      desiredPos: desiredPos.toArray().map((v) => +v.toFixed(2)),
      desiredTgt: desiredTgt.toArray().map((v) => +v.toFixed(2)),
      actualPos: camera.position.toArray().map((v) => +v.toFixed(2)),
      actualTgt: controlsRef.current ? controlsRef.current.target.toArray().map((v) => +v.toFixed(2)) : [0, 0, 0],
      statNorm: +statNorm.toFixed(2),
      top1Prob: +(top1Prob * 100).toFixed(1),
    };
  });

  // Re-frame whenever active op or view settings change in CINEMATIC_CAMERA mode
  useEffect(() => {
    if (mode !== "generation" || !followMode) return;

    currentPos.current.copy(desiredPos);
    currentTarget.current.copy(desiredTgt);

    if (cameraMode !== "overview" && controlsRef.current) {
      // Direct position update when jumping or manually triggering frame active op
      camera.position.copy(desiredPos);
      controlsRef.current.target.copy(desiredTgt);
      controlsRef.current.update();
    }
  }, [mode, followMode, cameraMode, desiredPos, desiredTgt, camera, controlsRef]);

  // Continuous frame-by-frame camera driver with dynamic dwell time
  useFrame((_, delta) => {
    if (mode !== "generation" || !followMode || !controlsRef.current) return;

    // In overview mode or when user is actively orbiting, OrbitControls owns camera 100%
    if (userOrbiting || cameraMode === "overview") {
      controlsRef.current.enabled = true;
      return;
    }

    // Dynamic dwell time pacing: higher activation magnitude (statNorm) scales lerp speed for a subtle hold/linger
    const baseSpeed = 6.2 + 2.0 * (1.0 - statNorm);
    const lerpFactor = Math.min(delta * baseSpeed * Math.max(0.6, playSpeed), 0.35);

    camera.position.lerp(desiredPos, lerpFactor);
    controlsRef.current.target.lerp(desiredTgt, lerpFactor);

    // Keep OrbitControls synced with cinematic camera without resetting position
    controlsRef.current.update();

    // Log debug state for window inspection
    (window as unknown as Record<string, unknown>).__ns_cam_debug = {
      opIndex,
      layer: activeOp.layer,
      opKey: activeOp.op_key,
      statNorm: +statNorm.toFixed(2),
      top1Prob: +(top1Prob * 100).toFixed(1),
      desiredPos: desiredPos.toArray().map((v) => +v.toFixed(2)),
      desiredTgt: desiredTgt.toArray().map((v) => +v.toFixed(2)),
      actualPos: camera.position.toArray().map((v) => +v.toFixed(2)),
      actualTgt: controlsRef.current.target.toArray().map((v) => +v.toFixed(2)),
    };
  });

  return null;
}
