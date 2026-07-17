"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry } from "three";

import { useStore } from "@/lib/store";
import { buildPointCloud } from "@/lib/pointcloud";

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
    return g;
  }, [cloud]);

  // Points raycasting needs a threshold to feel responsive.
  useEffect(() => {
    if (raycaster.params.Points) raycaster.params.Points.threshold = 0.3;
  }, [raycaster]);

  // Frame the whole stack at a 3/4 angle so the panels visibly recede.
  useEffect(() => {
    if (!cloud) return;
    const [, hy, hz] = cloud.half;
    camera.position.set(hz * 0.8, hy * 1.3, hz * 1.3);
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
        size={pointSize * 0.045}
        sizeAttenuation
        transparent
        opacity={0.92}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}
