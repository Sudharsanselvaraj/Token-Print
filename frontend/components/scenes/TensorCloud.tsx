"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
} from "three";

import { useStore } from "@/lib/store";
import { buildPointCloud } from "@/lib/pointcloud";

/**
 * A soft radial sprite so each point reads as a gentle disc with a bright core
 * and a falloff edge, rather than a hard flat square. Built once on a canvas and
 * reused for every point (single texture, no per-point cost).
 */
function makeSoftSprite(): CanvasTexture {
  const s = 64;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.85)");
  g.addColorStop(0.7, "rgba(255,255,255,0.28)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new CanvasTexture(cv);
}

/**
 * Real tensor point cloud. Each point comes from a real tensor (model or GGUF);
 * layers are depth-colored slabs. THREE.Points + one BufferGeometry (single
 * draw call) — the right tool for hundreds of thousands to millions of points.
 */
export default function TensorCloud() {
  const arch = useStore((s) => s.arch);
  const budget = useStore((s) => s.pointBudget);
  const colorBy = useStore((s) => s.colorBy);
  const pointSize = useStore((s) => s.pointSize);
  const setHovered = useStore((s) => s.setHoveredTensor);
  const setSelected = useStore((s) => s.setSelectedTensor);
  const { raycaster, camera } = useThree();

  const cloud = useMemo(
    () => (arch ? buildPointCloud(arch.tensors, { budget, colorBy }) : null),
    [arch, budget, colorBy],
  );

  const geom = useMemo(() => {
    if (!cloud) return null;
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(cloud.positions, 3));
    g.setAttribute("color", new BufferAttribute(cloud.colors, 3));
    // Per-point size jitter (~0.7–1.25×) so the cloud has a little organic
    // grain instead of a perfectly uniform stipple.
    const n = cloud.count;
    const scale = new Float32Array(n);
    for (let i = 0; i < n; i++) scale[i] = 0.7 + Math.random() * 0.55;
    g.setAttribute("aScale", new BufferAttribute(scale, 1));
    return g;
  }, [cloud]);

  const sprite = useMemo(() => makeSoftSprite(), []);
  useEffect(() => () => sprite.dispose(), [sprite]);

  // Wire the per-point size attribute into the built-in points shader.
  const onBeforeCompile = useMemo(
    () => (shader: { vertexShader: string }) => {
      shader.vertexShader =
        "attribute float aScale;\n" +
        shader.vertexShader.replace(
          "gl_PointSize = size;",
          "gl_PointSize = size * aScale;",
        );
    },
    [],
  );

  // Points raycasting needs a threshold to feel responsive.
  useEffect(() => {
    if (raycaster.params.Points) raycaster.params.Points.threshold = 0.3;
  }, [raycaster]);

  // Frame the whole stack at an elevated 3/4 angle so it reads as a composed
  // structure with breathing room, panels visibly receding into the fog.
  useEffect(() => {
    if (!cloud) return;
    const [, hy, hz] = cloud.half;
    camera.position.set(hz * 0.6, hy * 2.6, hz * 1.2);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [cloud, camera]);

  useEffect(() => () => geom?.dispose(), [geom]);

  if (!geom || !cloud) return null;

  const idAt = (e: { index?: number | null }) =>
    e.index != null && arch
      ? arch.tensors[cloud.ids[e.index]]?.name ?? null
      : null;

  return (
    <points
      geometry={geom}
      onPointerMove={(e) => {
        e.stopPropagation();
        setHovered(idAt(e));
      }}
      onPointerOut={() => setHovered(null)}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(idAt(e));
      }}
    >
      <pointsMaterial
        vertexColors
        size={pointSize * 0.06}
        sizeAttenuation
        map={sprite}
        alphaMap={sprite}
        transparent
        opacity={0.9}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        onBeforeCompile={onBeforeCompile}
      />
    </points>
  );
}
