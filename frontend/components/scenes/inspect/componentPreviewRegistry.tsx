"use client";

/**
 * componentPreviewRegistry.tsx
 *
 * Maps objectType → isolated R3F preview scene.
 * Each preview renders ONLY the selected component's geometry,
 * centered at origin so the camera can easily frame it.
 *
 * Lighting: studio 3-point (key + fill + rim). No bloom. No glow materials.
 * Rotation: slow Y-axis rotation around geometric center (0.06 rad/s).
 */

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface PreviewProps {
  rotating: boolean;
  color: string;
  accentColor: string;
  meta: {
    numHeads: number;
    kvHeads: number;
    headDim: number;
    hiddenSize: number;
    ffnSize: number;
  };
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function useSlowRotate(rotating: boolean, speed = 0.06) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current && rotating) {
      ref.current.rotation.y += dt * speed;
    }
  });
  return ref;
}

const MAT_DARK = { roughness: 0.55, metalness: 0.25 } as const;
const MAT_BRIGHT = { roughness: 0.3, metalness: 0.4 } as const;

// ─── 1. RMSNorm Preview (norm_chamber) ────────────────────────────────────────
export function NormChamberPreview({ rotating, color, accentColor }: PreviewProps) {
  const ref = useSlowRotate(rotating);
  const c = color || "#ffffff";
  const a = accentColor || "#d4d4d4";
  return (
    <group ref={ref}>
      {/* Outer cylinder shell */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.7, 32]} />
        <meshStandardMaterial color="#1e293b" {...MAT_DARK} />
      </mesh>
      {/* Pinch cone top */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.15, 0.9, 0.35, 28]} />
        <meshStandardMaterial color={c} {...MAT_DARK} />
      </mesh>
      {/* Pinch cone bottom */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.9, 0.15, 0.35, 28]} />
        <meshStandardMaterial color={c} {...MAT_DARK} />
      </mesh>
      {/* Gain ring (γ) */}
      <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.95, 0.05, 12, 32]} />
        <meshStandardMaterial color={a} roughness={0.2} metalness={0.6} />
      </mesh>
      {/* Scale filaments */}
      {Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.65, 0.4, Math.sin(angle) * 0.65]}>
            <cylinderGeometry args={[0.028, 0.028, 0.72, 6]} />
            <meshStandardMaterial color="#64748b" roughness={0.6} />
          </mesh>
        );
      })}
      {/* Input arrow block */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.25, 0.3, 0.25]} />
        <meshStandardMaterial color="#334155" {...MAT_DARK} />
      </mesh>
      {/* Output arrow block */}
      <mesh position={[0, -0.35, 0]}>
        <boxGeometry args={[0.25, 0.3, 0.25]} />
        <meshStandardMaterial color={a} roughness={0.25} metalness={0.5} />
      </mesh>
    </group>
  );
}

// ─── 2. Q Projection Preview (q_channels) ─────────────────────────────────────
export function QChannelsPreview({ rotating, color, meta }: PreviewProps) {
  const ref = useSlowRotate(rotating);
  const n = Math.min(meta.numHeads, 14);
  const slabW = 3.8 / n - 0.06;
  return (
    <group ref={ref}>
      {/* Input block */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[1.8, 0.3, 0.7]} />
        <meshStandardMaterial color="#1e293b" {...MAT_DARK} />
      </mesh>
      {/* Weight matrix slab */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[3.8, 0.5, 0.8]} />
        <meshStandardMaterial color="#0f172a" {...MAT_DARK} />
      </mesh>
      {/* Query head channels */}
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[(i - (n - 1) / 2) * (3.8 / n), -0.35, 0]}>
          <boxGeometry args={[slabW, 1.1, 0.6]} />
          <meshStandardMaterial color={color || "#22c55e"} {...MAT_BRIGHT} />
        </mesh>
      ))}
    </group>
  );
}

// ─── 3. GQA Bank Preview (gqa_bank — K or V) ──────────────────────────────────
export function GqaBankPreview({ rotating, color, meta }: PreviewProps) {
  const ref = useSlowRotate(rotating);
  const kv = Math.min(meta.kvHeads, 8);
  const panelW = 3.4 / kv - 0.15;
  return (
    <group ref={ref}>
      {/* Input block */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[1.8, 0.3, 0.7]} />
        <meshStandardMaterial color="#1e293b" {...MAT_DARK} />
      </mesh>
      {/* Weight slab */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[3.4, 0.45, 0.8]} />
        <meshStandardMaterial color="#0f172a" {...MAT_DARK} />
      </mesh>
      {/* KV group panels */}
      {Array.from({ length: kv }, (_, i) => (
        <mesh key={i} position={[(i - (kv - 1) / 2) * (3.4 / kv), -0.5, 0]}>
          <boxGeometry args={[panelW, 1.2, 0.65]} />
          <meshStandardMaterial color={color || "#f97316"} {...MAT_BRIGHT} />
        </mesh>
      ))}
      {/* GQA sharing indicator — thin lines from KV to Q heads */}
      {kv > 0 && (
        <mesh position={[0, -0.05, -0.5]}>
          <boxGeometry args={[3.4, 0.03, 0.05]} />
          <meshStandardMaterial color="#64748b" roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}

// ─── 4. RoPE Preview (rope_plane) ────────────────────────────────────────────
export function RopePlanePreview({ rotating, color }: PreviewProps) {
  const ref = useSlowRotate(rotating, 0.12);
  const c = color || "#ffffff";
  return (
    <group ref={ref}>
      {/* Outer ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.06, 12, 40]} />
        <meshStandardMaterial color={c} roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Inner ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.75, 0.04, 8, 32]} />
        <meshStandardMaterial color={c} roughness={0.4} metalness={0.3} opacity={0.6} transparent />
      </mesh>
      {/* Q axis */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 2.4, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      {/* K axis */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 2.4, 8]} />
        <meshStandardMaterial color="#a3a3a3" roughness={0.3} />
      </mesh>
      {/* Rotation angle arc */}
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <torusGeometry args={[0.5, 0.035, 6, 20, Math.PI / 2]} />
        <meshStandardMaterial color={c} roughness={0.2} />
      </mesh>
    </group>
  );
}

// ─── 5. Score Matrix Preview (score_matrix) ───────────────────────────────────
export function ScoreMatrixPreview({ rotating, color }: PreviewProps) {
  const ref = useSlowRotate(rotating, 0.05);
  const c = color || "#a855f7";
  const N = 5;
  return (
    <group ref={ref} rotation={[-0.25, 0, 0]}>
      {/* Base slab */}
      <mesh>
        <boxGeometry args={[3.0, 3.0, 0.15]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} />
      </mesh>
      {/* Score bars */}
      {Array.from({ length: N }, (_, r) =>
        Array.from({ length: N }, (_, col) => {
          const h = 0.15 + (r + col) * 0.12;
          return (
            <mesh key={`${r}-${col}`} position={[(r - 2) * 0.56, (col - 2) * 0.56, h / 2 + 0.08]}>
              <boxGeometry args={[0.44, 0.44, h]} />
              <meshStandardMaterial color={c} roughness={0.3} metalness={0.2} />
            </mesh>
          );
        })
      )}
    </group>
  );
}

// ─── 6. Softmax Surface Preview (softmax_surface) ────────────────────────────
export function SoftmaxSurfacePreview({ rotating, color }: PreviewProps) {
  const ref = useSlowRotate(rotating, 0.05);
  const c = color || "#a855f7";
  const N = 5;
  return (
    <group ref={ref} rotation={[-0.25, 0, 0]}>
      <mesh>
        <boxGeometry args={[3.0, 3.0, 0.15]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} />
      </mesh>
      {Array.from({ length: N }, (_, r) =>
        Array.from({ length: N }, (_, col) => {
          if (col > r) return null; // causal mask
          const hVal = Math.max(0.05, (N - col + r) * 0.14 + 0.1);
          return (
            <mesh key={`${r}-${col}`} position={[(r - 2) * 0.56, (col - 2) * 0.56, hVal / 2 + 0.08]}>
              <boxGeometry args={[0.44, 0.44, hVal]} />
              <meshStandardMaterial color={c} roughness={0.25} metalness={0.15} />
            </mesh>
          );
        })
      )}
    </group>
  );
}

// ─── 7. Weighted Value Merge (weighted_v_merge) ───────────────────────────────
export function WeightedVMergePreview({ rotating, color, accentColor }: PreviewProps) {
  const ref = useSlowRotate(rotating);
  const c = color || "#a855f7";
  const a = accentColor || "#f97316";
  return (
    <group ref={ref}>
      {/* Attention probs (wide top fan) */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[1.5, 0.6, 0.5, 20]} />
        <meshStandardMaterial color={c} {...MAT_BRIGHT} />
      </mesh>
      {/* Values columns */}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} position={[(i - 1.5) * 0.9, 0.3, 0]}>
          <boxGeometry args={[0.6, 0.55, 0.55]} />
          <meshStandardMaterial color={a} {...MAT_BRIGHT} />
        </mesh>
      ))}
      {/* Output vector */}
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[1.0, 0.6, 0.6]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.35} metalness={0.3} />
      </mesh>
    </group>
  );
}

// ─── 8. O Projection (o_proj_matrix) ─────────────────────────────────────────
export function OProjMatrixPreview({ rotating, color, meta }: PreviewProps) {
  const ref = useSlowRotate(rotating);
  const c = color || "#8b5cf6";
  const n = Math.min(meta.numHeads, 14);
  return (
    <group ref={ref}>
      {/* n head output slots */}
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[(i - (n - 1) / 2) * (3.6 / n), 0.9, 0]}>
          <boxGeometry args={[3.6 / n - 0.08, 0.55, 0.5]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>
      ))}
      {/* Concat + W_O weight matrix */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[3.6, 0.5, 0.75]} />
        <meshStandardMaterial color={c} {...MAT_BRIGHT} />
      </mesh>
      {/* Output — single hidden-dim block */}
      <mesh position={[0, -0.6, 0]}>
        <boxGeometry args={[1.5, 0.6, 0.65]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.35} metalness={0.3} />
      </mesh>
    </group>
  );
}

// ─── 9. SwiGLU Junction (swiglu_junction) ────────────────────────────────────
export function SwiGLUJunctionPreview({ rotating, color }: PreviewProps) {
  const ref = useSlowRotate(rotating);
  const c = color || "#ffffff";
  return (
    <group ref={ref}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 1.4, 24]} />
        <meshStandardMaterial color={c} {...MAT_DARK} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.65, 24, 24]} />
        <meshStandardMaterial color="#d4d4d4" {...MAT_BRIGHT} />
      </mesh>
      {/* Junction merge sphere */}
      <mesh position={[0, -0.15, 0]}>
        <sphereGeometry args={[0.55, 20, 20]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.35} />
      </mesh>
      {/* ⊙ symbol — two thin cross slabs */}
      <mesh position={[0, -0.15, 0]}>
        <torusGeometry args={[0.65, 0.04, 8, 20]} />
        <meshStandardMaterial color={c} roughness={0.2} />
      </mesh>
      {/* Output */}
      <mesh position={[0, -0.9, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.55, 14]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.35} />
      </mesh>
    </group>
  );
}

// ─── 10. Gate Slab (gate_slab) ────────────────────────────────────────────────
export function GateSlabPreview({ rotating, color, meta }: PreviewProps) {
  const ref = useSlowRotate(rotating);
  const c = color || "#f59e0b";
  const ratio = Math.min(meta.ffnSize / meta.hiddenSize, 6);
  const barW = 0.4;
  const nBars = Math.min(Math.round(ratio * 3), 14);
  return (
    <group ref={ref}>
      {/* Input */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[1.2, 0.35, 0.6]} />
        <meshStandardMaterial color="#1e293b" {...MAT_DARK} />
      </mesh>
      {/* Expanded output bars */}
      {Array.from({ length: nBars }, (_, i) => (
        <mesh key={i} position={[(i - (nBars - 1) / 2) * (barW + 0.04), 0, 0]}>
          <boxGeometry args={[barW, 1.2, 0.55]} />
          <meshStandardMaterial color={c} {...MAT_BRIGHT} />
        </mesh>
      ))}
    </group>
  );
}

// ─── 11. Up Slab (up_slab) ────────────────────────────────────────────────────
export function UpSlabPreview({ rotating, color, meta }: PreviewProps) {
  const ref = useSlowRotate(rotating);
  const c = color || "#fbbf24";
  const ratio = Math.min(meta.ffnSize / meta.hiddenSize, 6);
  const nBars = Math.min(Math.round(ratio * 3), 14);
  const barW = 0.4;
  return (
    <group ref={ref}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[1.2, 0.35, 0.6]} />
        <meshStandardMaterial color="#1e293b" {...MAT_DARK} />
      </mesh>
      {Array.from({ length: nBars }, (_, i) => (
        <mesh key={i} position={[(i - (nBars - 1) / 2) * (barW + 0.04), 0, 0]}>
          <boxGeometry args={[barW, 1.2, 0.55]} />
          <meshStandardMaterial color={c} {...MAT_BRIGHT} />
        </mesh>
      ))}
    </group>
  );
}

// ─── 12. Down Slab (down_slab) ────────────────────────────────────────────────
export function DownSlabPreview({ rotating, color, meta }: PreviewProps) {
  const ref = useSlowRotate(rotating);
  const c = color || "#f59e0b";
  const ratio = Math.min(meta.ffnSize / meta.hiddenSize, 6);
  const nBarsWide = Math.min(Math.round(ratio * 3), 14);
  const barW = 0.4;
  return (
    <group ref={ref}>
      {/* Wide expanded input */}
      {Array.from({ length: nBarsWide }, (_, i) => (
        <mesh key={i} position={[(i - (nBarsWide - 1) / 2) * (barW + 0.04), 0.65, 0]}>
          <boxGeometry args={[barW, 0.6, 0.5]} />
          <meshStandardMaterial color={c} roughness={0.5} />
        </mesh>
      ))}
      {/* Down weight slab */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[nBarsWide * (barW + 0.04), 0.4, 0.6]} />
        <meshStandardMaterial color="#1e293b" {...MAT_DARK} />
      </mesh>
      {/* Narrow output */}
      <mesh position={[0, -0.7, 0]}>
        <boxGeometry args={[1.2, 0.55, 0.6]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.35} metalness={0.3} />
      </mesh>
    </group>
  );
}

// ─── 13. Residual Junction (res_junction) ─────────────────────────────────────
export function ResJunctionPreview({ rotating, color }: PreviewProps) {
  const ref = useSlowRotate(rotating, 0.04);
  const a = color || "#38bdf8";
  return (
    <group ref={ref}>
      {/* Residual stream tube */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 2.8, 10]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>
      {/* Branch input */}
      <mesh position={[0, -0.7, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 1.1, 10]} />
        <meshStandardMaterial color={a} roughness={0.3} />
      </mesh>
      {/* Junction node */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.38, 20, 20]} />
        <meshStandardMaterial color="#ffffff" roughness={0.25} metalness={0.4} />
      </mesh>
      {/* + ring */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.45, 0.04, 8, 24]} />
        <meshStandardMaterial color={a} roughness={0.2} />
      </mesh>
    </group>
  );
}

// ─── 14. Embedding Lookup (matrix_lookup) ─────────────────────────────────────
export function MatrixLookupPreview({ rotating, color }: PreviewProps) {
  const ref = useSlowRotate(rotating, 0.04);
  const c = color || "#06b6d4";
  return (
    <group ref={ref}>
      {/* Vocabulary matrix (5 slabs) */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[0, (i - 2) * 0.28 + 0.2, 0]}>
          <boxGeometry args={[2.4, 0.2, 0.5]} />
          <meshStandardMaterial
            color={i === 2 ? c : "#1e293b"}
            roughness={0.6}
            emissive={i === 2 ? c : "#000000"}
            emissiveIntensity={i === 2 ? 0.4 : 0}
          />
        </mesh>
      ))}
      {/* Lookup indicator */}
      <mesh position={[-1.4, 0.2, 0]}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
        <meshStandardMaterial color={c} roughness={0.3} />
      </mesh>
      {/* Selected embedding output */}
      <mesh position={[0, -0.8, 0]}>
        <boxGeometry args={[1.8, 0.28, 0.5]} />
        <meshStandardMaterial color={c} roughness={0.3} metalness={0.35} />
      </mesh>
    </group>
  );
}

// ─── 15. Unembed Matrix (unembed_matrix) ──────────────────────────────────────
export function UnembedMatrixPreview({ rotating, color }: PreviewProps) {
  const ref = useSlowRotate(rotating, 0.04);
  const c = color || "#06b6d4";
  return (
    <group ref={ref}>
      {/* Input hidden state */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[1.2, 0.35, 0.6]} />
        <meshStandardMaterial color="#1e293b" {...MAT_DARK} />
      </mesh>
      {/* W_lm weight slab */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[3.5, 0.4, 0.7]} />
        <meshStandardMaterial color={c} {...MAT_BRIGHT} />
      </mesh>
      {/* Logit fan: many thin bars representing vocab distribution */}
      {Array.from({ length: 16 }, (_, i) => {
        const h = 0.15 + Math.abs(Math.sin(i * 0.9)) * 0.9;
        return (
          <mesh key={i} position={[(i - 7.5) * 0.22, -0.55 + h / 2, 0]}>
            <boxGeometry args={[0.16, h, 0.45]} />
            <meshStandardMaterial color={c} roughness={0.3} opacity={0.7} transparent />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Registry Map ─────────────────────────────────────────────────────────────

export type PreviewComponent = React.FC<PreviewProps>;

export const PREVIEW_REGISTRY: Record<string, PreviewComponent> = {
  norm_chamber:      NormChamberPreview,
  q_channels:        QChannelsPreview,
  gqa_bank:          GqaBankPreview,
  rope_plane:        RopePlanePreview,
  score_matrix:      ScoreMatrixPreview,
  softmax_surface:   SoftmaxSurfacePreview,
  weighted_v_merge:  WeightedVMergePreview,
  o_proj_matrix:     OProjMatrixPreview,
  swiglu_junction:   SwiGLUJunctionPreview,
  gate_slab:         GateSlabPreview,
  up_slab:           UpSlabPreview,
  down_slab:         DownSlabPreview,
  res_junction:      ResJunctionPreview,
  matrix_lookup:     MatrixLookupPreview,
  unembed_matrix:    UnembedMatrixPreview,
};

export function getPreviewComponent(objectType: string): PreviewComponent {
  return PREVIEW_REGISTRY[objectType] ?? NormChamberPreview;
}
