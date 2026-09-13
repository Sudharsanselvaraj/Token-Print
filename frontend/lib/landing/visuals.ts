// Deterministic mathematical generators for TokenPrint line-art visualizations.
// Pure deterministic formulas — 100% hydration safe.

export function getDeterministicNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
  alpha: number;
  size: number;
}

export function generateHeroPointCloud(count: number = 800): Point3D[] {
  const points: Point3D[] = [];
  for (let i = 0; i < count; i++) {
    const seed = i + 1;
    const layer = Math.floor(i / 100);
    const angle = (i % 100) * ((Math.PI * 2) / 100);
    const radius = 80 + (i % 30) * 8 + getDeterministicNoise(seed) * 40;

    const x = Number((Math.cos(angle) * radius + (layer - 4) * 35).toFixed(2));
    const y = Number((Math.sin(angle) * (radius * 0.45) + (layer - 4) * 20).toFixed(2));
    const z = Number(((layer - 4) * 25).toFixed(2));
    const alpha = Number((0.15 + (getDeterministicNoise(seed + 100) * 0.65)).toFixed(2));
    const size = Number((1 + (getDeterministicNoise(seed + 200) * 2)).toFixed(2));

    points.push({ x, y, z, alpha, size });
  }
  return points;
}

export function generateAttentionConnections(count: number = 32): { x1: number; y1: number; x2: number; y2: number; opacity: number }[] {
  const lines = [];
  for (let i = 0; i < count; i++) {
    const seed = i + 42;
    const x1 = Number((50 + (i * 24) % 320).toFixed(2));
    const y1 = Number((40 + Math.sin(i * 0.5) * 30).toFixed(2));
    const x2 = Number((120 + ((i * 37) % 300)).toFixed(2));
    const y2 = Number((160 + Math.cos(i * 0.7) * 40).toFixed(2));
    const opacity = Number((0.1 + (getDeterministicNoise(seed) * 0.4)).toFixed(2));
    lines.push({ x1, y1, x2, y2, opacity });
  }
  return lines;
}
