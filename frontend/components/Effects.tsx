"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

import { useStore } from "@/lib/store";

/**
 * Cinematic post-processing (Phase 4). Bloom makes the additive attention beams
 * and emissive nodes glow; a subtle vignette focuses the eye. Gated behind the
 * "cinematic" quality preset so it can be turned off on weaker GPUs — the M5
 * handles bloom comfortably, so it's the default.
 *
 * DOF / volumetric fog are intentionally NOT enabled by default: they are the
 * most expensive effects on an integrated GPU. Bloom-only is the safe default.
 */
export default function Effects() {
  const quality = useStore((s) => s.quality);
  if (quality !== "cinematic") return null;

  return (
    <EffectComposer>
      <Bloom
        intensity={0.85}
        luminanceThreshold={0.22}
        luminanceSmoothing={0.35}
        mipmapBlur
        radius={0.72}
      />
      <Vignette offset={0.28} darkness={0.72} eskil={false} />
    </EffectComposer>
  );
}
