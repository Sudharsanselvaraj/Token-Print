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
 * Mathematical frequency mapping functions (Phase 5.8a / #301).
 *
 * NOTE ON ATTENTION TELEMETRY:
 * Full attention weight tensors [layer, head, from, to] are emitted during static
 * analysis (`/analyze`), but omitted from the streaming generation WebSocket payload
 * for throughput reasons. Therefore, layer-transition pitch is explicitly documented
 * as layer-depth progression (150-500 Hz), while chord frequencies are driven by real
 * output distribution entropy and hidden state activation norm.
 */

export function computeLayerPitch(layerIndex: number, totalLayers: number): number {
  const safeTotal = Math.max(Number.isFinite(totalLayers) ? totalLayers : 1, 1);
  const safeLayer = Math.max(0, Math.min(Number.isFinite(layerIndex) ? layerIndex : 0, safeTotal - 1));
  const denominator = Math.max(safeTotal - 1, 1);
  const progress = safeTotal === 1 ? 0 : safeLayer / denominator;
  return 150 + progress * 350;
}

export function computeChordFrequencies(entropyNorm: number, norm: number, headSpread = 0.5) {
  const safeEntropy = Math.max(0, Math.min(1, Number.isFinite(entropyNorm) ? entropyNorm : 0));
  const safeNorm = Math.max(0, Number.isFinite(norm) ? norm : 0);
  const safeSpread = Math.max(0, Math.min(1, Number.isFinite(headSpread) ? headSpread : 0.5));

  const baseFreq = 200 + safeEntropy * 600;
  const normClamped = Math.min(safeNorm / 50, 1);
  const harmonic = baseFreq * (1.5 + normClamped);
  const brightFreq = baseFreq * (2 + safeSpread * 0.5);
  return { baseFreq, harmonic, brightFreq };
}

/**
 * Sonify a single generation frame.
 * Plays a chord based on output entropy and layer activation magnitude.
 * @param entropyNorm   0..1 — normalized Shannon entropy of the output distribution (real telemetry)
 * @param norm          scalar norm of the hidden state (real telemetry)
 * @param headSpread    0..1 — attention spread (approximated when stream omits raw attention matrices)
 */
export function sonifyFrame(
  entropyNorm: number,
  norm: number,
  headSpread = 0.5
): void {
  if (!sonificationEnabled) return;

  const { baseFreq, harmonic, brightFreq } = computeChordFrequencies(entropyNorm, norm, headSpread);

  playTone(baseFreq, 140, "sine", 0.04);
  playTone(harmonic, 80, "triangle", 0.015);
  playTone(brightFreq, 60, "sine", 0.008);
}

/**
 * Sonify a layer transition (called as the playback descends through layers).
 * Directional frequency sweep from 150 Hz to 500 Hz mapped to layer progression.
 */
export function sonifyLayerTransition(layerIndex: number, totalLayers: number): void {
  if (!sonificationEnabled) return;
  const freq = computeLayerPitch(layerIndex, totalLayers);
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
