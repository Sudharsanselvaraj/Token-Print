"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Billboard, Text } from "@react-three/drei";
import { Color, Euler, InstancedMesh, Matrix4, Quaternion, Vector3 } from "three";
import AnnotationsOverlay from "./AnnotationsOverlay";

// §4 Visual Mapping — distinctive per-operation geometry, faithful to the REAL
// Qwen2 decoder block (verified against Qwen2.5-0.5B config.json):
//   pre-RMSNorm → self-attention (GQA) → post-RMSNorm → SwiGLU MLP, wrapped by a
//   continuous residual stream. Every proportion is a real model dimension:
//     • Attention → one blade PER REAL QUERY HEAD (num_heads), thickness ∝ head_dim,
//       clustered into num_kv_heads groups to show GQA (14 Q sharing 2 KV).
//     • MLP       → SwiGLU funnel: two input prongs (gate + up) → wide belly whose
//       radius ∝ real ffn/hidden ratio → down-projection back to hidden.
//     • RMSNorm   → TWO thin pinched waists per block (input + post-attention).
//     • Embedding → a volume whose width ∝ log2(real vocab_size).
//     • Residual  → one continuous through-line spanning the whole stack.

export type OpKind = "embedding" | "norm" | "attn" | "mlp" | "output";

export interface StackDims {
  numHeads: number;
  kvHeads: number;
  headDim: number;
  hidden: number;
  ffn: number;
  vocab: number;
}

const GRAY = new Color(0.44, 0.48, 0.56);
const DIM = new Color(0.28, 0.31, 0.38);
const HOVER_GLOW = new Color(1, 1, 1);

function hoverColor(base: Color, hovered: boolean, active: boolean): Color {
  if (hovered && !active) return base.clone().lerp(HOVER_GLOW, 0.25);
  return base;
}

/** RMSNorm waist: two cones pinched to a narrow neck — the smallest block form.
 *  The glowing ring at the neck represents the learnable scale vector (γ). */
function NormWaist({
  y,
  active,
  hovered,
  color,
  intensity,
  onPointerEnter,
  onPointerLeave,
  onClick,
}: {
  y: number;
  active: boolean;
  hovered: boolean;
  color: Color;
  intensity: number;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onClick?: () => void;
}) {
  const c = active ? color : GRAY;
  const finalColor = hoverColor(c, hovered, active);
  const NECK = 0.14;
  const WIDE = 0.46;
  const H = 0.42;
  const sc = hovered ? 1.12 : 1;
  return (
    <group position={[0, y, 0]} scale={sc}>
      <mesh
        position={[0, H / 2, 0]}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
      >
        <cylinderGeometry args={[WIDE, NECK, H, 28]} />
        <meshStandardMaterial
          color={finalColor}
          emissive={finalColor}
          emissiveIntensity={active || hovered ? intensity : 0.06}
          roughness={0.55}
          metalness={0.22}
        />
      </mesh>
      <mesh position={[0, -H / 2, 0]}>
        <cylinderGeometry args={[NECK, WIDE, H, 28]} />
        <meshStandardMaterial
          color={finalColor}
          emissive={finalColor}
          emissiveIntensity={active || hovered ? intensity : 0.06}
          roughness={0.55}
          metalness={0.22}
        />
      </mesh>
      {/* Learnable-scale collar: a thin ring at the neck representing γ (gain). */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[NECK * 0.85, 0.025, 8, 20]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={active ? 0.8 : hovered ? 0.5 : 0.25}
        />
      </mesh>
    </group>
  );
}

/** SwiGLU MLP: gate+up input prongs → wide belly (ffn) → down-projection.
 *  The gate prong and up prong combine at a junction node,
 *  representing the element-wise gating that distinguishes SwiGLU from plain ReLU. */
function MlpFunnel({
  y,
  radius,
  active,
  hovered,
  color,
  intensity,
  onPointerEnter,
  onPointerLeave,
  onClick,
}: {
  y: number;
  radius: number;
  active: boolean;
  hovered: boolean;
  color: Color;
  intensity: number;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onClick?: () => void;
}) {
  const c = active ? color : GRAY;
  const finalColor = hoverColor(c, hovered, active);
  const sc = hovered ? 1.12 : 1;
  return (
    <group position={[0, y, 0]} scale={sc}>
      {/* Gate prong (left) — Swish activation.
          Up prong (right) — linear projection. */}
      <mesh
        position={[-0.28, 0.62, 0]}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
      >
        <cylinderGeometry args={[0.14, 0.14, 0.5, 12]} />
        <meshStandardMaterial
          color="#d4d4d4"
          emissive="#d4d4d4"
          emissiveIntensity={active || hovered ? intensity : 0.08}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0.28, 0.62, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.5, 12]} />
        <meshStandardMaterial
          color="#a3a3a3"
          emissive="#a3a3a3"
          emissiveIntensity={active || hovered ? intensity : 0.08}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>
      {/* Junction: element-wise multiplication of gate × up */}
      <mesh position={[0, 0.38, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={active ? 0.9 : 0.4} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[radius, 0.28, 0.5, 32]} />
        <meshStandardMaterial
          color={finalColor}
          emissive={finalColor}
          emissiveIntensity={active || hovered ? intensity : 0.06}
          roughness={0.5}
          metalness={0.24}
        />
      </mesh>
      <mesh position={[0, -0.36, 0]}>
        <cylinderGeometry args={[0.24, radius, 0.5, 32]} />
        <meshStandardMaterial
          color={finalColor}
          emissive={finalColor}
          emissiveIntensity={active || hovered ? intensity : 0.06}
          roughness={0.5}
          metalness={0.24}
        />
      </mesh>
    </group>
  );
}

export default function TransformerStack({
  nLayers,
  dims,
  activeLayer,
  activeKind,
  opColor,
  statNorm,
  gap,
  hoveredLayer,
  hoveredKind,
  onHover,
  onClick,
}: {
  nLayers: number;
  dims: StackDims;
  activeLayer: number | null;
  activeKind: OpKind | null;
  opColor: [number, number, number];
  statNorm: number;
  gap: number;
  hoveredLayer?: number | null;
  hoveredKind?: OpKind | null;
  onHover?: (layer: number | null, kind: OpKind | null) => void;
  onClick?: (layer: number, kind: OpKind) => void;
}) {
  const opCol = useMemo(() => new Color(...opColor), [opColor]);
  const activeIntensity = 1.15 + 1.2 * statNorm;
  const layerY = (i: number) => -(i + 1) * gap;

  // Real, dimension-driven proportions.
  const bladeThickness = 0.05 + Math.min(dims.headDim / 128, 1) * 0.1;
  const ffnRatio = dims.hidden > 0 ? dims.ffn / dims.hidden : 1;
  const funnelRadius = 0.55 + Math.min((ffnRatio - 1) / 5, 1) * 1.15; // wide belly
  const embWidth = Math.max(3, Math.log2(Math.max(2, dims.vocab)) * 0.42);
  const embDepth = 2.5 + Math.min(dims.hidden / 320, 4);

  const kvGroups = Math.max(1, Math.min(dims.kvHeads, dims.numHeads));
  const perGroup = Math.max(1, Math.round(dims.numHeads / kvGroups));

  // Sub-station heights within a block (compute order, top → bottom).
  const yNorm1 = (i: number) => layerY(i) + gap * 0.36;
  const yAttn = (i: number) => layerY(i) + gap * 0.12;
  const yNorm2 = (i: number) => layerY(i) - gap * 0.14;
  const yMlp = (i: number) => layerY(i) - gap * 0.36;

  // --- Attention blades: one InstancedMesh, one instance per (layer, head),
  // angularly CLUSTERED into num_kv_heads groups so GQA is legible. --- //
  const bladeMesh = useRef<InstancedMesh>(null);
  const bladeCount = nLayers * Math.max(1, dims.numHeads);

  const bladeMatrices = useMemo(() => {
    const arr: Matrix4[] = [];
    const pos = new Vector3();
    const quat = new Quaternion();
    const eul = new Euler();
    const scale = new Vector3(bladeThickness, 0.5, 0.95); // standing fin
    const Rc = 1.25;
    const groupGap = 0.55; // radians between KV groups
    const groupSpan = (Math.PI * 2) / kvGroups - groupGap;
    for (let li = 0; li < nLayers; li++) {
      const y = yAttn(li);
      for (let h = 0; h < dims.numHeads; h++) {
        const g = Math.floor(h / perGroup);
        const withinN = Math.min(perGroup, dims.numHeads - g * perGroup);
        const i = h - g * perGroup;
        const gStart = g * ((Math.PI * 2) / kvGroups) + groupGap / 2;
        const a = withinN > 1 ? gStart + (i / (withinN - 1)) * groupSpan : gStart + groupSpan / 2;
        pos.set(Rc * Math.sin(a), y, Rc * Math.cos(a));
        eul.set(0, a, 0);
        quat.setFromEuler(eul);
        arr.push(new Matrix4().compose(pos, quat, scale));
      }
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nLayers, dims.numHeads, kvGroups, perGroup, bladeThickness, gap]);

  useEffect(() => {
    const m = bladeMesh.current;
    if (!m) return;
    for (let i = 0; i < bladeMatrices.length; i++) m.setMatrixAt(i, bladeMatrices[i]);
    m.instanceMatrix.needsUpdate = true;
  }, [bladeMatrices]);

  useEffect(() => {
    const m = bladeMesh.current;
    if (!m) return;
    const nh = Math.max(1, dims.numHeads);
    const activeBlade = activeKind === "attn";
    for (let li = 0; li < nLayers; li++) {
      const isActive = li === activeLayer;
      const c = isActive ? (activeBlade ? opCol : opCol.clone().lerp(GRAY, 0.5)) : DIM;
      for (let h = 0; h < nh; h++) m.setColorAt(li * nh + h, c);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [activeLayer, activeKind, opCol, nLayers, dims.numHeads]);

  const [hoveredInstance, setHoveredInstance] = useState<number | null>(null);
  const stackHeight = (nLayers + 2) * gap;
  const midY = -((nLayers + 1) * gap) / 2;
  const nh = Math.max(1, dims.numHeads);

  const handleEnter = useCallback(
    (layer: number, kind: OpKind) => () => onHover?.(layer, kind),
    [onHover],
  );
  const handleLeave = useCallback(
    () => onHover?.(null, null),
    [onHover],
  );
  const handleClick = useCallback(
    (layer: number, kind: OpKind) => () => onClick?.(layer, kind),
    [onClick],
  );

  return (
    <group>
      {/* Residual stream — one continuous through-line down the whole stack. */}
      <mesh
        position={[0, midY, 0]}
        onPointerEnter={() => onHover?.(999, "norm")}
        onPointerLeave={handleLeave}
        onClick={() => onClick?.(0, "norm")}
      >
        <cylinderGeometry args={[0.07, 0.07, stackHeight, 10]} />
        <meshStandardMaterial
          color={"#9aa3ba"}
          emissive={"#5a6278"}
          emissiveIntensity={hoveredKind === "norm" && hoveredLayer === 999 ? 1.2 : 0.5}
          roughness={0.45}
        />
      </mesh>

      {/* Token embedding volume (width ∝ log2 vocab, depth ∝ embedding dim). */}
      <mesh
        position={[0, layerY(-1), 0]}
        onPointerEnter={handleEnter(-1, "embedding")}
        onPointerLeave={handleLeave}
        onClick={handleClick(-1, "embedding")}
        scale={hoveredLayer === -1 && hoveredKind === "embedding" ? 1.08 : 1}
      >
        <boxGeometry args={[embWidth, 0.9, embDepth]} />
        <meshStandardMaterial
          color={activeKind === "embedding" || (hoveredLayer === -1 && hoveredKind === "embedding") ? opCol : GRAY}
          emissive={activeKind === "embedding" || (hoveredLayer === -1 && hoveredKind === "embedding") ? opCol : GRAY}
          emissiveIntensity={activeKind === "embedding" ? activeIntensity : (hoveredLayer === -1 && hoveredKind === "embedding") ? 1.0 : 0.06}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      {/* Per-layer blocks: two RMSNorm waists + SwiGLU funnel (blades instanced). */}
      {Array.from({ length: nLayers }, (_, li) => {
        const isActive = li === activeLayer;
        const isHovered = li === hoveredLayer;
        return (
          <group key={li}>
            <NormWaist
              y={yNorm1(li)}
              active={isActive && activeKind === "norm"}
              hovered={isHovered && hoveredKind === "norm"}
              color={opCol}
              intensity={activeIntensity}
              onPointerEnter={handleEnter(li, "norm")}
              onPointerLeave={handleLeave}
              onClick={handleClick(li, "norm")}
            />
            <NormWaist
              y={yNorm2(li)}
              active={isActive && activeKind === "norm"}
              hovered={isHovered && hoveredKind === "norm"}
              color={opCol}
              intensity={activeIntensity}
              onPointerEnter={handleEnter(li, "norm")}
              onPointerLeave={handleLeave}
              onClick={handleClick(li, "norm")}
            />

            {/* Branch / merge nodes — show the residual stream splitting and
                recombining at each layer. Green = branch (copy from residual),
                blue = merge (add back into residual). */}
            {Array.from({ length: 2 }, (_, side) => {
              const yB = side === 0 ? yNorm1(li) : yNorm2(li);
              const yM = side === 0 ? yAttn(li) : yMlp(li);
              return (
                <group key={`res-${side}`}>
                  <mesh position={[0.18, yB, 0]}>
                    <sphereGeometry args={[0.06, 8, 8]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={isActive ? 0.9 : 0.35} />
                  </mesh>
                  <mesh position={[-0.18, yM, 0]}>
                    <sphereGeometry args={[0.06, 8, 8]} />
                    <meshBasicMaterial color="#d4d4d4" transparent opacity={isActive ? 0.8 : 0.3} />
                  </mesh>
                  {/* Subtle connecting arc from merge back toward the residual axis. */}
                  <mesh position={[-0.1, yM, 0]}>
                    <boxGeometry args={[0.16, 0.02, 0.02]} />
                    <meshBasicMaterial color="#a3a3a3" transparent opacity={isActive ? 0.6 : 0.2} />
                  </mesh>
                </group>
              );
            })}

            <MlpFunnel
              y={yMlp(li)}
              radius={funnelRadius}
              active={isActive && activeKind === "mlp"}
              hovered={isHovered && hoveredKind === "mlp"}
              color={opCol}
              intensity={activeIntensity}
              onPointerEnter={handleEnter(li, "mlp")}
              onPointerLeave={handleLeave}
              onClick={handleClick(li, "mlp")}
            />
          </group>
        );
      })}

      <instancedMesh
        key={bladeCount}
        ref={bladeMesh}
        args={[undefined as never, undefined as never, bladeCount]}
        frustumCulled={false}
        onPointerMove={(e) => {
          const id = e.instanceId;
          if (id != null) {
            const layer = Math.floor(id / nh);
            setHoveredInstance(id);
            onHover?.(layer, "attn");
          }
        }}
        onPointerLeave={() => {
          setHoveredInstance(null);
          onHover?.(null, null);
        }}
        onClick={(e) => {
          const id = e.instanceId;
          if (id != null) {
            const layer = Math.floor(id / nh);
            onClick?.(layer, "attn");
          }
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.4} metalness={0.32} vertexColors />
      </instancedMesh>

      {/* Hovered attention instance highlight */}
      {hoveredInstance != null && (
        <mesh
          position={new Vector3().fromArray([
            (() => {
              const Rc = 1.25;
              const h = hoveredInstance % nh;
              const g = Math.floor(h / perGroup);
              const withinN = Math.min(perGroup, dims.numHeads - g * perGroup);
              const i = h - g * perGroup;
              const groupGap = 0.55;
              const groupSpan = (Math.PI * 2) / kvGroups - groupGap;
              const gStart = g * ((Math.PI * 2) / kvGroups) + groupGap / 2;
              const a = withinN > 1 ? gStart + (i / (withinN - 1)) * groupSpan : gStart + groupSpan / 2;
              return Rc * Math.sin(a);
            })(),
            yAttn(Math.floor(hoveredInstance / nh)),
            (() => {
              const Rc = 1.25;
              const h = hoveredInstance % nh;
              const g = Math.floor(h / perGroup);
              const withinN = Math.min(perGroup, dims.numHeads - g * perGroup);
              const i = h - g * perGroup;
              const groupGap = 0.55;
              const groupSpan = (Math.PI * 2) / kvGroups - groupGap;
              const gStart = g * ((Math.PI * 2) / kvGroups) + groupGap / 2;
              const a = withinN > 1 ? gStart + (i / (withinN - 1)) * groupSpan : gStart + groupSpan / 2;
              return Rc * Math.cos(a);
            })(),
          ])}
        >
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      )}

      {/* GQA label at the active layer's attention station. */}
      {activeLayer != null && activeLayer >= 0 && activeKind === "attn" && (
        <Billboard position={[3.4, yAttn(activeLayer), 0]}>
          <Text fontSize={0.36} anchorX="left" color="#9fb4d6" outlineWidth={0.015} outlineColor="#000000">
            GQA · {dims.numHeads} Q / {dims.kvHeads} KV heads
          </Text>
        </Billboard>
      )}

      {/* Output: converging funnel toward the vocabulary distribution. */}
      <group position={[0, layerY(nLayers), 0]}>
        <mesh
          onPointerEnter={handleEnter(nLayers, "output")}
          onPointerLeave={handleLeave}
          onClick={handleClick(nLayers, "output")}
          scale={hoveredLayer === nLayers && hoveredKind === "output" ? 1.08 : 1}
        >
          <cylinderGeometry args={[1.3, 0.16, 1.0, 32]} />
          <meshStandardMaterial
            color={activeKind === "output" || (hoveredLayer === nLayers && hoveredKind === "output") ? opCol : GRAY}
            emissive={activeKind === "output" || (hoveredLayer === nLayers && hoveredKind === "output") ? opCol : GRAY}
            emissiveIntensity={activeKind === "output" ? activeIntensity : (hoveredLayer === nLayers && hoveredKind === "output") ? 1.0 : 0.06}
            roughness={0.5}
            metalness={0.24}
          />
        </mesh>
      </group>

      <AnnotationsOverlay />
    </group>
  );
}
