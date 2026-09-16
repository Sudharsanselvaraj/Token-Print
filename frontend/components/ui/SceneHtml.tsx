"use client";

import { Html } from "@react-three/drei";
import type { ComponentProps } from "react";
import { SCENE_OVERLAY_Z } from "@/lib/layers";

type SceneHtmlProps = ComponentProps<typeof Html>;

/**
 * SceneHtml — the only sanctioned way to project DOM overlays inside the 3D
 * scene.
 *
 * drei's <Html> defaults to zIndexRange=[16_777_271, 0]: near-camera labels
 * get inline z-indexes in the millions, painting them *above* every modal in
 * the app (HF picker 10500, trace gallery 10000, contributor drawer 99999).
 * We clamp the entire class of scene-owned overlays below the global modal
 * layer so no scene label can ever escape above a dialog.
 *
 * Callers may still pass an explicit zIndexRange top; it is clamped to
 * SCENE_OVERLAY_Z at most. The bottom is always 0 so nearer labels still
 * stack above farther ones.
 */
export function SceneHtml({ zIndexRange, ...props }: SceneHtmlProps) {
  const top = zIndexRange
    ? Math.min(zIndexRange[0], SCENE_OVERLAY_Z)
    : SCENE_OVERLAY_Z;
  return <Html zIndexRange={[top, 0]} {...props} />;
}