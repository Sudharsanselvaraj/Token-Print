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
import { GlobalCameraController } from "./camera/GlobalCameraController";
import { cameraOverview } from "./scenes/ArchitectureLayout";

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
      {/* Global camera controller drives smooth camera navigation across all 3D modes */}
      <GlobalCameraController controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.07}
        minDistance={2}
        maxDistance={6000}
        onStart={() => {
          useStore.getState().setNavMode("MANUAL");
          setUserOrbiting(true);
        }}
        onEnd={() => setUserOrbiting(false)}
      />
    </Canvas>
  );
}
