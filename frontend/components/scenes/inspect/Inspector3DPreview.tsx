"use client";

/**
 * Inspector3DPreview.tsx
 *
 * Isolated 3D preview canvas for the right-side component inspector.
 * - Completely separate scene from the main transformer visualization
 * - Camera auto-fits to component bounding box
 * - Studio 3-point lighting (key + fill + rim)
 * - Slow Y-axis rotation around geometric center
 * - Rotate / Pause / Reset controls
 */

import React, { useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { getComponentDefinition } from "./componentDefinitions";
import { getPreviewComponent } from "./componentPreviewRegistry";

// ─── Monochrome accent colour per component ─────────────────────────────────────
function semanticColor(formulaType: string, id: string): { color: string; accent: string } {
  return { color: "#ffffff", accent: "#d4d4d4" };
}

// ─── Studio Lighting ──────────────────────────────────────────────────────────
function StudioLighting() {
  return (
    <>
      <ambientLight intensity={0.65} />
      {/* Key light */}
      <directionalLight position={[5, 8, 5]} intensity={2.0} color="#ffffff" />
      {/* Fill light */}
      <directionalLight position={[-4, 2, 3]} intensity={0.8} color="#e2e8f0" />
      {/* Rim light */}
      <directionalLight position={[0, -3, -5]} intensity={0.5} color="#94a3b8" />
    </>
  );
}

// ─── Auto-Fit Camera ──────────────────────────────────────────────────────────
function AutoFitCamera({ target }: { target: THREE.Vector3 }) {
  const { camera } = useThree();
  const fitted = useRef(false);

  useFrame(() => {
    if (fitted.current) return;
    // Smooth drift toward optimal framing position (Z=5.8) to fit full 3D models comfortably
    camera.position.lerp(new THREE.Vector3(0, 0, 5.8), 0.08);
    const camTarget = new THREE.Vector3(0, 0, 0);
    (camera as THREE.PerspectiveCamera).lookAt(camTarget);
    fitted.current = true;
  });

  return null;
}

// ─── Scene content ─────────────────────────────────────────────────────────────
function PreviewScene({
  componentId,
  rotating,
}: {
  componentId: string;
  rotating: boolean;
}) {
  const arch3dLayer = useStore((s) => s.arch3dLayer);
  const arch = useStore((s) => s.arch);
  const data = useStore((s) => s.data);
  const m = arch?.metadata;

  const meta = useMemo(
    () => ({
      hiddenSize: m?.hidden_size || data?.hidden_size || 896,
      numHeads:   m?.num_heads   || data?.num_heads   || 14,
      kvHeads:    m?.num_kv_heads || 2,
      headDim:    Math.floor((m?.hidden_size || 896) / (m?.num_heads || 14)),
      ffnSize:    m?.ffn_size    || 4864,
      vocabSize:  m?.vocab_size  || 151936,
      totalLayers: m?.num_layers || data?.num_layers || 24,
    }),
    [m, data]
  );

  const comp = useMemo(
    () => getComponentDefinition(componentId, arch3dLayer, meta),
    [componentId, arch3dLayer, meta]
  );

  const { color, accent } = semanticColor(comp.formulaType, comp.id);
  const PreviewMesh = getPreviewComponent(comp.objectType);

  return (
    <>
      <StudioLighting />
      <AutoFitCamera target={new THREE.Vector3(0, 0, 0)} />
      <PreviewMesh
        rotating={rotating}
        color={color}
        accentColor={accent}
        meta={meta}
      />
      <OrbitControls
        enableZoom
        enablePan={false}
        dampingFactor={0.1}
        minDistance={2}
        maxDistance={12}
      />
    </>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────
export function Inspector3DPreview({ componentId }: { componentId: string }) {
  const inspectAutoRotate = useStore((s) => s.inspectAutoRotate);
  const toggleInspectAutoRotate = useStore((s) => s.toggleInspectAutoRotate);
  const [sceneKey, setSceneKey] = useState(0);

  const resetView = useCallback(() => {
    setSceneKey((k) => k + 1);
  }, []);

  const btnBase: React.CSSProperties = {
    padding: "3px 10px",
    fontSize: "10px",
    fontFamily: "var(--mono)",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#9ca3af",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "color 0.15s, border-color 0.15s",
  };

  const btnActive: React.CSSProperties = {
    ...btnBase,
    color: "#f5f5f5",
    borderColor: "rgba(255,255,255,0.28)",
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "260px",
          background: "radial-gradient(ellipse at 50% 40%, #18181c 0%, #080808 100%)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <Canvas
          key={sceneKey}
          camera={{ position: [0, 0, 5.8], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.5]}
        >
          <PreviewScene componentId={componentId} rotating={inspectAutoRotate} />
        </Canvas>
      </div>

      {/* Controls row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "8px 0 4px",
        }}
      >
        <button
          style={inspectAutoRotate ? btnActive : btnBase}
          onClick={toggleInspectAutoRotate}
          title="Toggle rotation"
        >
          {inspectAutoRotate ? "⏸ Pause" : "▶ Rotate"}
        </button>
        <button style={btnBase} onClick={resetView} title="Reset camera">
          ↺ Reset
        </button>
      </div>
    </div>
  );
}
