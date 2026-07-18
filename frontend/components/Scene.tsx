"use client";

import { useEffect, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Group } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { useStore } from "@/lib/store";
import TensorCloud from "./scenes/TensorCloud";
import GenerationScene from "./scenes/GenerationScene";
import WalkthroughScene from "./scenes/WalkthroughScene";

/** Dev aid: expose scene stats + an on-demand framebuffer grab for verification. */
function DebugExpose() {
  const { scene, camera, gl } = useThree();
  useFrame(() => {
    let meshes = 0;
    let instanced = 0;
    let instances = 0;
    scene.traverse((o) => {
      const anyO = o as unknown as { isMesh?: boolean; isInstancedMesh?: boolean; count?: number };
      if (anyO.isInstancedMesh) {
        instanced++;
        instances += anyO.count ?? 0;
      } else if (anyO.isMesh) meshes++;
    });
    (window as unknown as Record<string, unknown>).__ns = {
      children: scene.children.length,
      camPos: camera.position.toArray().map((v) => +v.toFixed(2)),
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      meshes,
      instanced,
      instances,
    };
  });
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__grabFB = () => {
      const ctx = gl.getContext();
      const w = ctx.drawingBufferWidth;
      const h = ctx.drawingBufferHeight;
      if (!w || !h) return null;
      const buf = new Uint8Array(w * h * 4);
      ctx.readPixels(0, 0, w, h, ctx.RGBA, ctx.UNSIGNED_BYTE, buf);
      const flipped = new Uint8ClampedArray(w * h * 4);
      for (let row = 0; row < h; row++) {
        const s = row * w * 4;
        flipped.set(buf.subarray(s, s + w * 4), (h - 1 - row) * w * 4);
      }
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      off.getContext("2d")!.putImageData(new ImageData(flipped, w, h), 0, 0);
      return off.toDataURL("image/png");
    };
  }, [gl]);
  return null;
}

/**
 * Barely-perceptible idle motion so the scene reads as alive, not a screenshot.
 * The content group drifts a fraction of a degree per second about Y; any user
 * interaction with OrbitControls pauses it and it eases back a couple of seconds
 * after you let go. This rotates the *content*, never the camera, so free-roam
 * orbit/zoom stays exactly as responsive as before. Off in generation follow
 * mode (the camera is already gliding there) and in the performance preset.
 */
function IdleDrift({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const ref = useRef<Group>(null);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const interacting = useRef(false);
  const resumeAt = useRef(0);

  useEffect(() => {
    if (!controls) return;
    const onStart = () => {
      interacting.current = true;
    };
    const onEnd = () => {
      interacting.current = false;
      resumeAt.current = performance.now() + 2200;
    };
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);
    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
    };
  }, [controls]);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const active =
      enabled && !interacting.current && performance.now() >= resumeAt.current;
    // ~0.55°/s — perceptible only over several seconds.
    if (active) g.rotation.y += dt * 0.0096;
  });

  return <group ref={ref}>{children}</group>;
}

/** Global scene-brightness preference → renderer exposure (user setting). */
function Brightness() {
  const brightness = useStore((s) => s.brightness);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMappingExposure = brightness;
  }, [gl, brightness]);
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
  const quality = useStore((s) => s.quality);
  const followMode = useStore((s) => s.followMode);

  const idle = quality === "cinematic" && !(mode === "generation" && followMode);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 60], fov: 50, near: 0.1, far: 4000 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        // Calling preventDefault on 'webglcontextlost' lets the browser restore
        // the SAME context (and three re-uploads GPU resources) instead of
        // killing it permanently — otherwise a lost context is a dead canvas.
        canvas.addEventListener(
          "webglcontextlost",
          (e) => {
            e.preventDefault();
            onContextLost?.();
          },
          false,
        );
        canvas.addEventListener(
          "webglcontextrestored",
          () => onContextRestored?.(),
          false,
        );
      }}
    >
      <color attach="background" args={["#000000"]} />
      {/* Subtle atmospheric fade on distant geometry — a restrained depth cue,
          not thick fog. Still legible enough to hover far tensors. */}
      <fog attach="fog" args={["#000000", 90, 340]} />

      {/* Three-point studio lighting: a soft key from front-upper-right, a dim
          fill from the opposite side to keep shadows from going black, and a
          cool rim from behind so slab silhouettes and the zigzag edges read.
          Quiet single-studio-light feel — no gaming RGB. */}
      <ambientLight intensity={0.32} />
      <directionalLight position={[18, 26, 22]} intensity={1.15} color="#ffffff" />
      <directionalLight position={[-22, 6, 10]} intensity={0.35} color="#c8ccd6" />
      <directionalLight position={[-6, 14, -26]} intensity={0.7} color="#dfe4ee" />

      <IdleDrift enabled={idle}>
        {mode === "explorer" && <TensorCloud />}
        {mode === "generation" && <GenerationScene />}
        {mode === "walkthrough" && <WalkthroughScene />}
      </IdleDrift>

      <DebugExpose />
      <Brightness />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={2} maxDistance={2000} />
    </Canvas>
  );
}
