import { Vector3 } from "three";

import type { District } from "./types";

// Shared 3D layout math.
//
// Tokens are placed on a ring in the XY plane (facing the camera). Straight
// "beam" cylinders are then drawn as chords between ring nodes — chords stay
// legible and non-overlapping, unlike beams between colinear tokens.

/** Ring radius grows with token count so labels never crowd. */
export function radiusForCount(n: number): number {
  return Math.max(4.5, (n * 2.6) / (2 * Math.PI));
}

// World-space centers of the three districts (laid out along X). The camera
// flies between them (Phase 2 waypoint navigation).
export const DISTRICT_CENTERS: Record<District, [number, number, number]> = {
  tokenizer: [-72, 0, 0],
  embedding: [0, 0, 0],
  attention: [72, 0, 0],
  generation: [144, 0, 0],
};

export interface Waypoint {
  position: [number, number, number];
  target: [number, number, number];
}

/** Camera waypoint (position + look-at target) for each district. */
export function waypointFor(district: District, tokenCount: number): Waypoint {
  const c = DISTRICT_CENTERS[district];
  if (district === "attention") {
    const dist = radiusForCount(tokenCount || 7) * 2.4;
    return { position: [c[0], 0, c[2] + dist], target: [c[0], c[1], c[2]] };
  }
  if (district === "embedding") {
    return { position: [c[0], 2, c[2] + 26], target: [c[0], c[1], c[2]] };
  }
  if (district === "generation") {
    // Look slightly down the layer stack + skyline from the front.
    return { position: [c[0] + 2, 6, c[2] + 30], target: [c[0], 6, c[2]] };
  }
  // tokenizer: scale camera distance with token count so non-Latin byte-fragmented sequences fit without clipping
  const dist = Math.max(22, ((tokenCount || 7) * 2.6) * 0.65);
  return { position: [c[0], 0, c[2] + dist], target: [c[0], c[1], c[2]] };
}

/** Positions of `n` tokens on the ring: index 0 at top, going clockwise. */
export function ringPositions(n: number): Vector3[] {
  const R = radiusForCount(n);
  const out: Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 - (i / n) * Math.PI * 2;
    out.push(new Vector3(Math.cos(a) * R, Math.sin(a) * R, 0));
  }
  return out;
}
