"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import gsap from "gsap";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { useStore } from "@/lib/store";
import { CHAPTERS } from "@/lib/walkthrough";
import TokenizerDistrict from "../districts/TokenizerDistrict";
import EmbeddingDistrict from "../districts/EmbeddingDistrict";
import AttentionDistrict from "../districts/AttentionDistrict";
import TransformerStack, {
  type StackDims,
} from "./TransformerStack";
import { KIND_COLORS, type OpKind } from "@/lib/sceneColors";

const GAP = 3.4;

/**
 * The real Qwen block geometry (same component as Generation) framed for a
 * walkthrough chapter: one representative block's relevant component lights up
 * so the reading pane and the 3D always describe the same real operation.
 * Dimensions come from the real loaded model, not the scale selector.
 */
function WalkStack({ kind, hoveredLayer, hoveredKind, onHover, onClick }: {
  kind: OpKind | null;
  hoveredLayer?: number | null;
  hoveredKind?: OpKind | null;
  onHover?: (layer: number | null, kind: OpKind | null) => void;
  onClick?: (layer: number, kind: OpKind) => void;
}) {
  const m = useStore((s) => s.arch?.metadata);
  const nLayers = m?.num_layers ?? 24;
  const dims: StackDims = useMemo(
    () => ({
      numHeads: m?.num_heads ?? 14,
      kvHeads: m?.num_kv_heads ?? 2,
      headDim: m?.head_dim ?? 64,
      hidden: m?.hidden_size ?? 896,
      ffn: m?.ffn_size ?? 4864,
      vocab: m?.vocab_size ?? 151936,
    }),
    [m],
  );
  const mid = Math.floor(nLayers / 2);
  const activeLayer =
    kind == null
      ? null
      : kind === "output"
        ? nLayers
        : kind === "embedding"
          ? -1
          : mid;
  const opColor = (kind && KIND_COLORS[kind]) || [0.5, 0.6, 0.8];

  return (
    <TransformerStack
      nLayers={nLayers}
      dims={dims}
      activeLayer={activeLayer}
      activeKind={kind}
      opColor={opColor}
      statNorm={0.7}
      gap={GAP}
      hoveredLayer={hoveredLayer}
      hoveredKind={hoveredKind}
      onHover={onHover}
      onClick={onClick}
    />
  );
}

export default function WalkthroughScene() {
  const chapterIdx = useStore((s) => s.wtChapter);
  const archMeta = useStore((s) => s.arch?.metadata);
  const data = useStore((s) => s.data);
  const loading = useStore((s) => s.loading);
  const ch = CHAPTERS[Math.min(chapterIdx, CHAPTERS.length - 1)];
  const nLayers = archMeta?.num_layers ?? 24;
  const [hoveredLayer, setHoveredLayer] = useState<number | null>(null);
  const [hoveredKind, setHoveredKind] = useState<OpKind | null>(null);

  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  // Camera framing per chapter: districts sit at the origin; the stack is tall,
  // so structural chapters focus on the relevant block/region.
  const framing = useMemo(() => {
    const mid = Math.floor(nLayers / 2);
    const layerY = (i: number) => -(i + 1) * GAP;
    const midStackY = -((nLayers + 1) * GAP) / 2;
    const map: Record<string, { pos: [number, number, number]; target: [number, number, number] }> = {
      overview: { pos: [30, midStackY, 100], target: [0, midStackY, 0] },
      tokenizer: { pos: [0, 2, 18], target: [0, 0, 0] },
      embedding: { pos: [0, 3, 28], target: [0, 0, 0] },
      norm: { pos: [8, layerY(mid) + 1.2, 11], target: [0, layerY(mid), 0] },
      attention: { pos: [0, 1, 24], target: [0, 0, 0] },
      mlp: { pos: [8, layerY(mid) + 1.2, 11], target: [0, layerY(mid), 0] },
      softmax: { pos: [8, layerY(nLayers) + 1.2, 11], target: [0, layerY(nLayers), 0] },
    };
    return map[ch.scene] ?? { pos: [0, 0, 24] as [number, number, number], target: [0, 0, 0] as [number, number, number] };
  }, [ch.scene, nLayers]);

  useEffect(() => {
    const { pos, target } = framing;
    // First frame (no controls yet): snap. Otherwise glide with an eased tween.
    if (!controls) {
      camera.position.set(pos[0], pos[1], pos[2]);
      camera.lookAt(target[0], target[1], target[2]);
      camera.updateProjectionMatrix();
      return;
    }
    tweenRef.current?.kill();
    controls.enabled = false;
    const state = {
      px: camera.position.x,
      py: camera.position.y,
      pz: camera.position.z,
      tx: controls.target.x,
      ty: controls.target.y,
      tz: controls.target.z,
    };
    tweenRef.current = gsap.to(state, {
      duration: 1.4,
      ease: "power2.inOut",
      px: pos[0],
      py: pos[1],
      pz: pos[2],
      tx: target[0],
      ty: target[1],
      tz: target[2],
      onUpdate: () => {
        camera.position.set(state.px, state.py, state.pz);
        controls.target.set(state.tx, state.ty, state.tz);
        controls.update();
      },
      onComplete: () => {
        controls.enabled = true;
      },
    });
    return () => {
      tweenRef.current?.kill();
    };
  }, [framing, camera, controls]);

  // Gate on data — never render an empty canvas or placeholders.
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

  const hoverProps = {
    hoveredLayer,
    hoveredKind,
    onHover: (layer: number | null, kind: OpKind | null) => {
      setHoveredLayer(layer);
      setHoveredKind(kind);
    },
  };

  switch (ch.scene) {
    case "tokenizer":
      return <TokenizerDistrict />;
    case "embedding":
      return <EmbeddingDistrict />;
    case "attention":
      return <AttentionDistrict />;
    case "norm":
      return <WalkStack kind="norm" {...hoverProps} />;
    case "mlp":
      return <WalkStack kind="mlp" {...hoverProps} />;
    case "softmax":
      return <WalkStack kind="output" {...hoverProps} />;
    default:
      return <WalkStack kind={null} {...hoverProps} />;
  }
}
