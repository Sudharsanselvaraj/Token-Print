"use client";

import { useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";

/**
 * Performance & Draw Call Monitor for 3D Renderer.
 *
 * Attaches real-time renderer metrics (draw calls, triangles, memory geometries)
 * to window.__ns for automated and manual performance verification.
 * Runs imperatively without React state re-renders.
 */
export function PerfMonitor() {
  const { gl } = useThree();
  const fpsRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useFrame(() => {
    frameCountRef.current++;
    const now = performance.now();
    const elapsed = now - lastTimeRef.current;

    if (elapsed >= 500) {
      fpsRef.current = Math.round((frameCountRef.current * 1000) / elapsed);
      frameCountRef.current = 0;
      lastTimeRef.current = now;

      const calls = gl.info.render.calls;
      const triangles = gl.info.render.triangles;
      const geometries = gl.info.memory.geometries;
      const textures = gl.info.memory.textures;

      if (typeof window !== "undefined") {
        (window as any).__ns = {
          calls,
          triangles,
          geometries,
          textures,
          fps: fpsRef.current,
        };
      }
    }
  });

  return null;
}
