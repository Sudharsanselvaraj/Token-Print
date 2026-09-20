"use client";

import { useEffect, useMemo, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Billboard, Text, Line } from "@react-three/drei";
import { Color, Group, Vector3 } from "three";
import * as THREE from "three";

import { useStore } from "@/lib/store";
import { CHAPTERS } from "@/lib/walkthrough";
import TransformerStack, {
  type StackDims,
} from "./TransformerStack";
import { KIND_COLORS, type OpKind } from "@/lib/sceneColors";

const GAP = 3.4;

// ─── World-space anchor resolution ──────────────────────────────────────────
// All anchors are named Object3D children of the TransformerStack rendered by
// WalkthroughScene. `scene.getObjectByName` is authoritative.

const tmpV = new Vector3();

function anchorPos(scene: THREE.Object3D, name: string | null): Vector3 | null {
  if (!name) return null;
  const obj = scene.getObjectByName(name);
  return obj ? obj.getWorldPosition(tmpV.clone()) : null;
}

function activeOp(
  sceneKey: string,
  mid: number,
  nLayers: number,
): { activeLayer: number | null; activeKind: OpKind | null } {
  switch (sceneKey) {
    case "embedding":
    case "tokenizer": return { activeLayer: -1, activeKind: "embedding" };
    case "norm":      return { activeLayer: mid, activeKind: "norm" };
    case "attention": return { activeLayer: mid, activeKind: "attn" };
    case "mlp":       return { activeLayer: mid, activeKind: "mlp" };
    case "softmax":   return { activeLayer: nLayers, activeKind: "output" };
    default:          return { activeLayer: null, activeKind: null };
  }
}

export default function WalkthroughScene() {
  const chapterIdx  = useStore((s) => s.wtChapter);
  const archMeta    = useStore((s) => s.arch?.metadata);
  const data        = useStore((s) => s.data);
  const loading     = useStore((s) => s.loading);
  const ch    = CHAPTERS[Math.min(chapterIdx, CHAPTERS.length - 1)];
  const m     = archMeta;
  const nLayers = m?.num_layers ?? 24;
  const mid   = Math.floor(nLayers / 2);

  const dims: StackDims = useMemo(
    () => ({
      numHeads:  m?.num_heads ?? 14,
      kvHeads:   m?.num_kv_heads ?? 2,
      headDim:   m?.head_dim ?? 64,
      hidden:    m?.hidden_size ?? 896,
      ffn:       m?.ffn_size ?? 4864,
      vocab:     m?.vocab_size ?? 151936,
    }),
    [m],
  );

  const { activeLayer, activeKind } = activeOp(ch.scene, mid, nLayers);
  const opColor = (activeKind && KIND_COLORS[activeKind]) || [0.5, 0.6, 0.8];

  const tokens = data?.tokens ?? [];

  // ─── Gate: no data yet ────────────────────────────────────────────────────
  if (!data) {
    return (
      <Billboard>
        <Text
          fontSize={0.9}
          color="#5b678c"
          anchorX="center"
          anchorY="middle"
          maxWidth={14}
          textAlign="center"
        >
          {loading
            ? "Running forward pass…\n(loading real data)"
            : "No data yet.\nClick a chapter to load the example."}
        </Text>
      </Billboard>
    );
  }

  return (
    <group>
      {/* ── Camera controller ──────────────────────────────────────────── */}


      {/* ── Backdrop ───────────────────────────────────────────────────── */}
      {(() => {
        const stackH = (nLayers + 2) * GAP + 3;
        const homeY  = -stackH / 2;
        return (
          <mesh position={[0, homeY, 0]}>
            <boxGeometry args={[17, stackH + 3, 6]} />
            <meshBasicMaterial color="#262a33" transparent opacity={0.38} depthWrite={false} />
          </mesh>
        );
      })()}

      {/* ── Active-region emphasis band ─────────────────────────────────── */}
      {activeLayer != null && (
        <mesh position={[0, -(activeLayer + 1) * GAP, 0]}>
          <boxGeometry args={[11, GAP * 1.5, 3.2]} />
          <meshBasicMaterial
            color={new Color(...opColor)}
            transparent
            opacity={0.14}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* ── Transformer stack ──────────────────────────────────────────── */}
      <TransformerStack
        nLayers={nLayers}
        dims={dims}
        activeLayer={activeLayer}
        activeKind={activeKind}
        opColor={opColor}
        statNorm={0.7}
        gap={GAP}
      />

      {/* ── Token beads (real sentence → token IDs, visible on input-focused chapters) ─── */}
      {(ch.scene === "tokenizer" || ch.scene === "embedding" || ch.scene === "overview") && tokens.length > 0 && (
        <group position={[0, -GAP * 1.2, 1.4]}>
          {tokens.slice(0, 12).map((tok, i) => {
            const n   = Math.min(tokens.length, 12);
            const x   = (i - (n - 1) / 2) * 1.15;
            const lbl = tok.text.replace(/\n/g, "⏎").trim() || "␣";
            return (
              <group key={i} position={[x, 0, 0]}>
                <mesh>
                  <sphereGeometry args={[lbl.length <= 1 ? 0.12 : 0.16, 12, 12]} />
                  <meshBasicMaterial
                    color={ch.scene === "tokenizer" ? "#bfa8e8" : "#70c4b8"}
                    transparent
                    opacity={0.82}
                  />
                </mesh>
                <Billboard position={[0, -0.42, 0]}>
                  <Text
                    fontSize={0.22}
                    anchorX="center"
                    color="#8892a4"
                    outlineWidth={0.01}
                    outlineColor="#000000"
                  >
                    {lbl.length > 8 ? lbl.slice(0, 7) + "…" : lbl}
                  </Text>
                </Billboard>
              </group>
            );
          })}
        </group>
      )}

      {/* ── Token packet travelling through the stack ───────────────────── */}
      <group position={[2.2, 0, 0]}>
        <TokenPacket sceneKey={ch.scene} gap={GAP} nLayers={nLayers} />
      </group>

      {/* ── Endpoint labels (subtle scientific annotations) ─────────────── */}
      <Billboard position={[-4.2, 0, 0]}>
        <Text fontSize={0.22} anchorX="right" color="#6b7590">
          embeddings
        </Text>
      </Billboard>
      <Billboard position={[-3.2, -(nLayers + 1) * GAP, 0]}>
        <Text fontSize={0.22} anchorX="right" color="#6b7590">
          lm_head
        </Text>
      </Billboard>

      {/* ── Chapter accent (small scientific annotation anchored near op) ── */}
      <ChapterLabel sceneKey={ch.scene} title={ch.title} nLayers={nLayers} gap={GAP} />

      {/* ── Output prediction line (softmax chapter only) ────────────────── */}
      {ch.scene === "softmax" && data.logit_lens?.length > 0 && (
        <Billboard position={[0, -(nLayers + 2.4) * GAP, 0]}>
          <Text
            fontSize={0.28}
            anchorX="center"
            color="#8a97bd"
            outlineWidth={0.01}
            outlineColor="#000000"
          >
            {(() => {
              const top1 = data.logit_lens[data.logit_lens.length - 1][0]?.[0];
              return top1
                ? `P(next) = \u201c${top1.text}\u201d  ·  ${(top1.prob * 100).toFixed(1)}%`
                : "predicting next token\u2026";
            })()}
          </Text>
        </Billboard>
      )}

    </group>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

/** Animated token packet that tracks the active operation down the stack. */
function TokenPacket({
  sceneKey,
  gap,
  nLayers,
}: {
  sceneKey: string;
  gap: number;
  nLayers: number;
}) {
  const mid = Math.floor(nLayers / 2);
  const ref = useRef<Group>(null);
  const y   = useRef(0);
  const pulse = useRef(0);
  const wtPlaying = useStore((s) => s.wtPlaying);

  const targetY = useMemo(() => {
    switch (sceneKey) {
      case "tokenizer":
      case "embedding":
      case "overview": return -gap * 0.6;
      case "norm":
      case "attention":
      case "mlp":      return -(mid + 1) * gap + 0.6;
      case "softmax":  return -(nLayers + 1) * gap;
      default:         return -gap;
    }
  }, [sceneKey, gap, mid, nLayers]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    y.current += (targetY - y.current) * Math.min(delta * 2.2, 1);
    ref.current.position.y = y.current;
    pulse.current += delta * (wtPlaying ? 3 : 1.4);
    const s = 1 + 0.11 * Math.sin(pulse.current);
    ref.current.scale.set(s, s, s);
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial color="#70c4b8" transparent opacity={0.92} />
      </mesh>
      <Line
        points={[new Vector3(0, -2.6, 0), new Vector3(0, 0, 0)]}
        color="#70c4b8"
        lineWidth={1}
        transparent
        opacity={0.24}
      />
    </group>
  );
}

/**
 * Small chapter accent label positioned near the active operation.
 * Rendered as a monospace scientific annotation — NOT a giant UI title.
 */
function ChapterLabel({
  sceneKey,
  title,
  nLayers,
  gap,
}: {
  sceneKey: string;
  title: string;
  nLayers: number;
  gap: number;
}) {
  const scene = useThree((s) => s.scene);
  const ref = useRef<Group>(null);

  // Resolve anchor world position each render (chapter change). This label is
  // lightweight so per-render resolution is acceptable.
  const pos = useMemo(() => {
    const mid   = Math.floor(nLayers / 2);
    let anchor: string | null = null;
    switch (sceneKey) {
      case "tokenizer":
      case "embedding": anchor = "wt_embedding"; break;
      case "norm":      anchor = `wt_norm_${mid}`; break;
      case "attention": anchor = `wt_attn_${mid}`; break;
      case "mlp":       anchor = `wt_mlp_${mid}`; break;
      case "softmax":   anchor = "wt_output"; break;
      default:          anchor = null;
    }
    const wp = anchorPos(scene, anchor);
    if (wp) return [wp.x - 3.4, wp.y + 0.25, wp.z + 5] as [number, number, number];
    // Fallback (overview): centered, upper third of stack
    const homeY = -((nLayers + 1) * gap) / 2;
    return [-3.4, homeY + 8, 5] as [number, number, number];
  }, [sceneKey, scene, nLayers, gap]);

  return (
    <group ref={ref} position={pos}>
      <Billboard>
        <Text
          fontSize={0.18}
          anchorX="right"
          color="#6b7590"
          outlineWidth={0.008}
          outlineColor="#000000"
        >
          {title.toUpperCase()}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── End of file ─────────────────────────────────────────────────────────────
