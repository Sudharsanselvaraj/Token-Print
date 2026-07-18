"use client";

import { useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { Color, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { useStore } from "@/lib/store";
import { activeLayerOf, phaseInfo } from "@/lib/playback";
import TransformerStack, { type OpKind, type StackDims } from "./TransformerStack";

// The layer/op currently being walked lights up in the op's colour; the follow
// camera tracks it. All geometry proportions come from the real model dims (see
// TransformerStack); the highlight sequence comes from the real op catalog.
const OP_COLORS: Record<string, [number, number, number]> = {
  embedding: [0.6, 0.4, 0.95],
  norm: [0.55, 0.6, 0.72],
  "attn.q": [0.3, 0.7, 1],
  "attn.k": [0.3, 0.85, 0.9],
  "attn.v": [0.3, 0.9, 0.6],
  attention: [0.4, 0.8, 1],
  "attn.o": [0.6, 0.7, 1],
  "mlp.gate": [1, 0.72, 0.3],
  "mlp.up": [1, 0.6, 0.3],
  "mlp.down": [0.95, 0.45, 0.5],
  output: [0.9, 0.4, 0.95],
};
const GAP = 3.4; // block height — roomy enough that norm/attn/norm/mlp read distinctly
const KV_CAP = 40; // most position cells we ever draw (prompt cap)
const tmp = new Vector3();

/** Real op_key → which distinctive geometry lights up. */
function opKindOf(opKey: string | undefined): OpKind | null {
  if (!opKey) return null;
  if (opKey === "embedding") return "embedding";
  if (opKey === "output") return "output";
  if (opKey === "attention" || opKey.startsWith("attn")) return "attn";
  if (opKey.startsWith("mlp")) return "mlp";
  if (opKey.startsWith("norm") || opKey === "norm") return "norm";
  return null;
}

export default function GenerationScene() {
  const meta = useStore((s) => s.genMeta);
  const archMeta = useStore((s) => s.arch?.metadata);
  const opIndex = useStore((s) => s.opIndex);
  const followMode = useStore((s) => s.followMode);
  const view2D = useStore((s) => s.view2D);
  const playIndex = useStore((s) => s.playIndex);
  const frame = useStore((s) => (s.playIndex >= 0 ? s.genFrames[s.playIndex] : null));

  const nLayers = meta?.num_layers ?? 24;
  const catalog = meta?.op_catalog ?? [];
  const op = catalog.length ? catalog[Math.min(opIndex, catalog.length - 1)] : null;
  const activeLayer = activeLayerOf(op ?? undefined, nLayers);
  const activeKind = opKindOf(op?.op_key);

  // Real model dimensions drive every proportion in the stack geometry. Falls
  // back to the loaded model's own num_heads and Qwen2.5-0.5B defaults only if
  // architecture metadata hasn't arrived yet.
  const dims: StackDims = useMemo(
    () => ({
      numHeads: archMeta?.num_heads ?? 14,
      kvHeads: archMeta?.num_kv_heads ?? 2,
      headDim: archMeta?.head_dim ?? 64,
      hidden: archMeta?.hidden_size ?? 896,
      ffn: archMeta?.ffn_size ?? 4864,
      vocab: archMeta?.vocab_size ?? 151936,
    }),
    [archMeta],
  );

  // Real KV-cache phase for the token being replayed — drives the "new activity"
  // strip so decode visibly computes far fewer positions than pre-fill.
  const phase = phaseInfo(frame, meta?.prompt_len ?? 0, meta?.uses_kv_cache);
  const positions = phase ? Math.min(phase.positions, KV_CAP) : 0;

  // Real per-token intensity: mean |activation| at the active layer, normalized
  // within this token's own stats. Pure lighting cue — no data is altered.
  const statNorm = useMemo(() => {
    const ls = frame?.layer_stats;
    if (!ls || ls.length === 0 || activeLayer == null) return 0.5;
    const idx = Math.max(0, Math.min(activeLayer + 1, ls.length - 1));
    const max = Math.max(1e-6, ...ls);
    return Math.max(0, Math.min(ls[idx] / max, 1));
  }, [frame, activeLayer]);

  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;

  useEffect(() => {
    if (controls) controls.enabled = !followMode;
  }, [controls, followMode]);

  const opCol: [number, number, number] = op
    ? OP_COLORS[op.op_key] ?? [0.5, 0.6, 0.8]
    : [0.5, 0.6, 0.8];

  useFrame(() => {
    if (followMode && activeLayer != null && controls) {
      const y = -(activeLayer + 1) * GAP;
      const dest = view2D ? tmp.set(0, y, 11) : tmp.set(7, y + 1.2, 9);
      camera.position.lerp(dest, 0.07);
      controls.target.lerp(tmp.set(0, y, 0), 0.12);
      controls.update();
    }
  });

  const activeY = activeLayer != null ? -(activeLayer + 1) * GAP : 0;

  return (
    <group>
      <TransformerStack
        nLayers={nLayers}
        dims={dims}
        activeLayer={activeLayer}
        activeKind={activeKind}
        opColor={opCol}
        statNorm={statNorm}
        gap={GAP}
      />

      {/* Stack endpoints labelled where the geometry begins/ends. */}
      <Billboard position={[-4.4, 0, 0]}>
        <Text fontSize={0.42} anchorX="right" color="#8a97bd">
          Embeddings
        </Text>
      </Billboard>
      <Billboard position={[-3, -(nLayers + 1) * GAP, 0]}>
        <Text fontSize={0.42} anchorX="right" color="#8a97bd">
          Output
        </Text>
      </Billboard>

      {op && activeLayer != null && (
        <Billboard position={[5.6, activeY, 0]}>
          <Text
            fontSize={0.5}
            anchorX="left"
            color="#e6ecff"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {op.label}
            {op.layer != null ? ` · Layer ${op.layer}` : ""}
          </Text>
        </Billboard>
      )}

      {/* KV-cache "new activity" strip: one cell per real position computed this
          step. Pre-fill = a wide band over the whole prompt; decode = a single
          cell (with the cached prefix shown dim behind it). This is the genuine
          difference in work done, not a stylistic flourish. */}
      {phase && activeLayer != null && (
        <group position={[-6.4, activeY, 0]}>
          {/* cached (reused, not recomputed) — dim */}
          {phase.phase === "decode" &&
            Array.from({ length: Math.min(phase.cacheLen, KV_CAP) }, (_, i) => (
              <mesh key={"c" + i} position={[-0.24 * i - 0.5, 0, 0]}>
                <boxGeometry args={[0.16, 0.16, 0.16]} />
                <meshStandardMaterial
                  color="#3a3d45"
                  emissive="#3a3d45"
                  emissiveIntensity={0.2}
                  roughness={0.8}
                />
              </mesh>
            ))}
          {/* newly computed this step — bright */}
          {Array.from({ length: positions }, (_, i) => (
            <mesh key={"n" + i} position={[0.24 * i + 0.5, 0, 0]}>
              <boxGeometry args={[0.18, 0.18, 0.18]} />
              <meshStandardMaterial
                color="#e8ecf4"
                emissive="#e8ecf4"
                emissiveIntensity={1.1}
                roughness={0.4}
              />
            </mesh>
          ))}
          <Billboard position={[0, 0.7, 0]}>
            <Text
              fontSize={0.32}
              anchorX="center"
              color={phase.phase === "prefill" ? "#e6ecff" : "#9fb4d6"}
              outlineWidth={0.015}
              outlineColor="#000000"
            >
              {phase.phase === "prefill"
                ? `Pre-fill · ${phase.positions} tokens`
                : `Decode · +1 (${phase.cacheLen} cached)`}
            </Text>
          </Billboard>
        </group>
      )}

      {/* Which generated token this forward pass produces. */}
      {frame && (
        <Billboard position={[0, -(nLayers + 2.2) * GAP, 0]}>
          <Text
            fontSize={0.6}
            anchorX="center"
            color="#e6ecff"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {`token ${playIndex + 1}: “${frame.chosen.text.replace(/\n/g, "⏎")}”`}
          </Text>
        </Billboard>
      )}

      {/* Real top-k probability skyline at the output. Bar height = the real
          softmax probability streamed for this step; brightness also ∝ prob.
          Grayscale on purpose — probability is a second quantity and must not
          get its own colour (the one colour axis is layer/op depth). */}
      {frame && frame.topk?.length > 0 && (
        <group position={[0, -(nLayers + 3.4) * GAP, 0]}>
          <Billboard position={[0, 3.6, 0]}>
            <Text fontSize={0.34} anchorX="center" color="#8a97bd">
              next-token top-{frame.topk.length} · real probabilities
            </Text>
          </Billboard>
          {frame.topk.map((cand, i) => {
            const n = frame.topk.length;
            const h = Math.max(0.06, cand.prob * 3.2); // height = real prob
            const x = (i - (n - 1) / 2) * 0.62;
            const g = 0.32 + 0.62 * cand.prob; // brightness = real prob
            const col = new Color(g, g, Math.min(1, g * 1.03));
            return (
              <group key={i} position={[x, 0, 0]}>
                <mesh position={[0, h / 2, 0]}>
                  <boxGeometry args={[0.4, h, 0.4]} />
                  <meshStandardMaterial
                    color={col}
                    emissive={col}
                    emissiveIntensity={i === 0 ? 0.85 : 0.3}
                    roughness={0.5}
                    metalness={0.15}
                  />
                </mesh>
                <Billboard position={[0, h + 0.45, 0]}>
                  <Text
                    fontSize={0.26}
                    anchorX="center"
                    color={i === 0 ? "#ffffff" : "#9aa3b8"}
                    outlineWidth={0.012}
                    outlineColor="#000000"
                  >
                    {cand.text.replace(/\n/g, "⏎").trim().slice(0, 6) || "␣"}
                  </Text>
                  <Text position={[0, -0.3, 0]} fontSize={0.2} anchorX="center" color="#6f7a95">
                    {(cand.prob * 100).toFixed(1)}%
                  </Text>
                </Billboard>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}
