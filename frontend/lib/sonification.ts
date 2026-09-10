// Phase 5: Activation Sonification
// Extends the existing sound.ts infrastructure with data-driven tones.
// Maps activation entropy, attention spread, and MLP norms to audio.

import { playTone } from "./sound";

export type SonifyMode = "entropy" | "norm" | "attention";

let sonificationEnabled = false;

export function setSonificationEnabled(b: boolean) {
  sonificationEnabled = b;
}

export function isSonificationEnabled() {
  return sonificationEnabled;
}

/**
 * Sonify a single generation frame.
 * Plays a chord based on the layer statistics available in the frame.
 * @param entropyNorm   0..1 — normalized entropy of the output distribution
 * @param norm          scalar norm of the hidden state (typically 0..50)
 * @param headSpread    0..1 — how spread vs peaked the attention is
 */
export function sonifyFrame(
  entropyNorm: number,
  norm: number,
  headSpread: number
): void {
  if (!sonificationEnabled) return;

  // Map entropy → fundamental frequency (200–800 Hz)
  // High entropy → higher, more uncertain tone
  const baseFreq = 200 + entropyNorm * 600;

  // Map hidden norm → overtone harmonic (adds texture based on magnitude)
  const normClamped = Math.min(norm / 50, 1);
  const harmonic = baseFreq * (1.5 + normClamped);

  // Map attention spread → chord brightness (wide attention → brighter chord)
  const brightFreq = baseFreq * (2 + headSpread * 0.5);

  playTone(baseFreq, 140, "sine", 0.04);
  playTone(harmonic, 80, "triangle", 0.015);
  playTone(brightFreq, 60, "sine", 0.008);
}

/**
 * Sonify a layer transition (called when the op advances between layers).
 * Short, directional sweep.
 */
export function sonifyLayerTransition(layerIndex: number, totalLayers: number): void {
  if (!sonificationEnabled) return;
  const progress = layerIndex / Math.max(totalLayers - 1, 1);
  // Sweep from low → high as we advance through layers
  const freq = 150 + progress * 350;
  playTone(freq, 55, "sawtooth", 0.02);
}

/**
 * Sonify an anomaly (NaN/Inf sentinel triggered, or entropy spike).
 */
export function sonifyAnomaly(): void {
  if (!sonificationEnabled) return;
  playTone(880, 300, "sawtooth", 0.08);
  setTimeout(() => playTone(440, 200, "sawtooth", 0.04), 150);
}
