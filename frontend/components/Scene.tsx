"use client";

import { useEffect, useRef, Suspense } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { useStore } from "@/lib/store";
import { SpatialArchitectureScene } from "./scenes/SpatialArchitectureScene";
import GenerationScene from "./scenes/GenerationScene";
import WalkthroughScene from "./scenes/WalkthroughScene";
import { PostProcessingPipeline } from "./scenes/PostProcessingPipeline";
import { CinematicCameraController } from "./camera/CinematicCameraController";
import { InspectCameraRig } from "./scenes/inspect/InspectCameraRig";
import {
  cameraOverview,
  cameraForLayer,
  cameraForOp,
} from "./scenes/ArchitectureLayout";

const N_LAYERS = 24;

function DebugExpose() {
  const { scene, camera, gl } = useThree();
  useFrame(() => {
    let meshes = 0, instanced = 0, instances = 0;
    scene.traverse((o) => {
      const a = o as unknown as { isMesh?: boolean; isInstancedMesh?: boolean; count?: number };
      if (a.isInstancedMesh) { instanced++; instances += a.count ?? 0; }
      else if (a.isMesh) meshes++;
    });
    (window as unknown as Record<string, unknown>).__ns = {
      children: scene.children.length,
      camPos:   camera.position.toArray().map((v) => +v.toFixed(2)),
      calls:    gl.info.render.calls,
      triangles:gl.info.render.triangles,
      meshes, instanced, instances,
    };
  });
  return null;
}

function Brightness() {
  const brightness = useStore((s) => s.brightness);
  const gl = useThree((s) => s.gl);
  useEffect(() => { gl.toneMappingExposure = brightness; }, [gl, brightness]);
  return null;
}

/**
 * Camera controller that reads from the arch3d interaction state and smoothly
 * lerps to the correct target.
 */
function CameraController({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();

  const cameraMode     = useStore((s) => s.cameraMode);
  const arch3dOpId     = useStore((s) => s.arch3dOpId);
  const arch3dLayer    = useStore((s) => s.arch3dLayer);
  const selectedTokenIndex = useStore((s) => s.selectedTokenIndex);
  const userOrbiting   = useStore((s) => s.userOrbiting);
  const setUserOrbiting = useStore((s) => s.setUserOrbiting);

  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());

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

  useEffect(() => {
    let pos: [number, number, number];
    let tgt: [number, number, number];

    switch (cameraMode) {
      case "overview": {
        const r = cameraOverview(N_LAYERS);
        pos = r.position; tgt = r.target;
        break;
      }
      case "layer": {
        const l = arch3dLayer >= 0 ? arch3dLayer : 0;
        const r = cameraForLayer(l);
        pos = r.position; tgt = r.target;
        break;
      }
      case "operation": {
        const r = cameraForOp(arch3dOpId, N_LAYERS);
        pos = r.position; tgt = r.target;
        break;
      }
      case "token_follow": {
        const tokenX = (selectedTokenIndex - 2) * 2.2 * 0.35;
        const l = arch3dLayer >= 0 ? arch3dLayer : 0;
        const { target: layerTgt } = cameraForLayer(l);
        pos = [tokenX + 4, layerTgt[1] + 2, layerTgt[2] + 12];
        tgt = [tokenX, layerTgt[1], layerTgt[2]];
        break;
      }
    }

    const dist = targetLook.current.distanceTo(new THREE.Vector3(...tgt));
    targetPos.current.set(...pos);
    targetLook.current.set(...tgt);

    // If switching views or large vertical jump (>25 units), snap immediately
    if ((dist > 25 || cameraMode === "operation") && controlsRef.current) {
      setUserOrbiting(false);
      camera.position.set(...pos);
      controlsRef.current.target.set(...tgt);
      controlsRef.current.update();
    }
  }, [cameraMode, arch3dOpId, arch3dLayer, selectedTokenIndex, camera, setUserOrbiting]);

  useFrame((_, delta) => {
    if (userOrbiting || !controlsRef.current) return;
    const factor = Math.min(delta * 6.0, 0.25);
    camera.position.lerp(targetPos.current, factor);
    controlsRef.current.target.lerp(targetLook.current, factor);
    controlsRef.current.update();
  });

  return null;
}

export default function Scene({
  onContextLost,
  onContextRestored,
}: {
  onContextLost?: () => void;
  onContextRestored?: () => void;
} = {}) {
  const mode = useStore((s) => s.mode);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const setUserOrbiting = useStore((s) => s.setUserOrbiting);

  const { position: initPos } = cameraOverview(N_LAYERS);

  return (
    <Canvas
      dpr={[1, Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 2, 2)]}
      camera={{ position: initPos, fov: 48, near: 0.1, far: 8000 }}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: "default",
        failIfMajorPerformanceCaveat: false,
      }}
      onCreated={({ gl }) => {
        if (!gl || !gl.domElement) return;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMappingExposure = 1.0;
        const canvas = gl.domElement;
        if (canvas && typeof canvas.addEventListener === "function") {
          canvas.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            onContextLost?.();
          }, false);
          canvas.addEventListener("webglcontextrestored", () => onContextRestored?.(), false);
        }
      }}
    >
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 100, 500]} />

      {/* 3-Point Studio Lighting Rig for Premium Scientific Model */}
      <ambientLight intensity={0.85} />
      <directionalLight position={[15, 30, 25]} intensity={1.8} color="#ffffff" />
      <directionalLight position={[-20, -10, 15]} intensity={0.9} color="#e5e5e5" />
      <pointLight position={[0, 25, -20]} intensity={1.2} color="#ffffff" distance={150} />

      {/* Studio Environment Map for Specular Reflections */}
      <Environment preset="studio" environmentIntensity={0.6} />

      {/* Ground Contact Shadows */}
      <ContactShadows position={[0, -360, 0]} opacity={0.4} scale={60} blur={2.5} far={30} />

      <Suspense fallback={null}>
        {mode === "explorer"    && <SpatialArchitectureScene />}
        {mode === "generation"  && <GenerationScene />}
        {mode === "walkthrough" && <WalkthroughScene />}
      </Suspense>

      <PostProcessingPipeline />
      <DebugExpose />
      <Brightness />
      <CinematicCameraController controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.07}
        minDistance={2}
        maxDistance={6000}
        onStart={() => setUserOrbiting(true)}
        onEnd={() => setUserOrbiting(false)}
      />
    </Canvas>
  );
}
