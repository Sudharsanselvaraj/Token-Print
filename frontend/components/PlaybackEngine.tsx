"use client";

import { useEffect } from "react";

import { useStore } from "@/lib/store";
import { layerAnchors, anchorPosFor } from "@/lib/playback";
import { CHAPTERS } from "@/lib/walkthrough";
import { sonifyLayerTransition, sonifyFrame } from "@/lib/sonification";

// Pacing is NORMALIZED, not derived from real per-op/per-token compute time.
// Every step takes the same wall-clock time, scaled only by playSpeed.
const GEN_LAYER_MS  = 480;  // one "layer by layer" step at 1× speed
const GEN_FRAME_MS  = 900;  // one frame step (no-op-catalog trace) at 1×
const WT_CHAPTER_MS = 4200; // one chapter at 1× speed (reading pace)
const ARCH_OP_MS    = 480;  // one architecture-op step at 1× speed

/**
 * Headless autoplay engine for all temporal sequences:
 *  - Generation mode: recorded trace token-by-token, layer-by-layer.
 *  - Walkthrough mode: auto-advances chapters.
 *  - Explorer / Architecture mode: steps through canonical op graph (arch3d).
 */
export default function PlaybackEngine() {
  const mode        = useStore((s) => s.mode);
  const opPlaying   = useStore((s) => s.opPlaying);
  const wtPlaying   = useStore((s) => s.wtPlaying);
  const playSpeed   = useStore((s) => s.playSpeed);
  const framesLen   = useStore((s) => s.genFrames.length);
  const autoStarted = useStore((s) => s.autoStarted);

  // Architecture-mode playback state
  const arch3dPlaying = useStore((s) => s.arch3dPlaying);
  const arch3dSpeed   = useStore((s) => s.arch3dSpeed);

  // Autoplay by default: the moment a real trace exists, start playing it.
  useEffect(() => {
    if (mode !== "generation") return;
    if (framesLen > 0 && !autoStarted) {
      useStore.setState({ opPlaying: true, autoStarted: true, opIndex: 0, playIndex: 0 });
    }
  }, [mode, framesLen, autoStarted]);

  // Generation (no op_catalog): simple frame-by-frame advance.
  useEffect(() => {
    if (mode !== "generation" || !opPlaying) return;
    const hasCat = !!useStore.getState().genMeta?.op_catalog?.length;
    if (hasCat) return;
    const id = setInterval(() => {
      const s = useStore.getState();
      if (s.playIndex < s.genFrames.length - 1) {
        useStore.setState({ playIndex: s.playIndex + 1 });
      } else if (s.genStatus !== "streaming") {
        useStore.setState({ opPlaying: false });
      }
    }, Math.max(120, GEN_FRAME_MS / playSpeed));
    return () => clearInterval(id);
  }, [mode, opPlaying, playSpeed]);

  // Generation (with op_catalog): advance one layer per tick; roll to next token at end.
  useEffect(() => {
    if (mode !== "generation" || !opPlaying) return;
    const id = setInterval(() => {
      const s = useStore.getState();
      const cat = s.genMeta?.op_catalog ?? [];
      if (cat.length === 0) return;
      const anchors = layerAnchors(cat, s.genMeta?.num_layers ?? 0);
      const pos = anchorPosFor(anchors, s.opIndex);
      let nextOp: number | null = null;

      if (pos < anchors.length - 1) {
        nextOp = anchors[pos + 1];
      } else if (s.playIndex < s.genFrames.length - 1) {
        nextOp = 0;
      }

      if (nextOp != null && s.breakpoints.has(nextOp)) {
        useStore.setState({ opPlaying: false });
        return;
      }

      if (pos < anchors.length - 1) {
        useStore.setState({ opIndex: nextOp! });
      } else if (s.playIndex < s.genFrames.length - 1) {
        useStore.setState({ playIndex: s.playIndex + 1, opIndex: 0 });
      } else if (s.genStatus !== "streaming") {
        useStore.setState({ opPlaying: false });
      }

      const numLayers = s.genMeta?.num_layers ?? 24;
      sonifyLayerTransition(s.opIndex, numLayers);

      const frame = s.genFrames[s.playIndex];
      if (frame) {
        const topProbs = frame.topk?.map((t) => t.prob) ?? [];
        const maxP = Math.max(...topProbs, 0.001);
        const entropyNorm = topProbs.reduce(
          (acc, p) => acc - (p / maxP) * Math.log2(p / maxP + 1e-9), 0
        ) / 4;
        const norm = frame.layer_stats?.[0] ?? 10;
        sonifyFrame(Math.min(1, entropyNorm), norm, 0.5);
      }
    }, Math.max(60, GEN_LAYER_MS / playSpeed));
    return () => clearInterval(id);
  }, [mode, opPlaying, playSpeed]);

  // Walkthrough: auto-advance chapters.
  useEffect(() => {
    if (mode !== "walkthrough" || !wtPlaying) return;
    const dataReady = !!useStore.getState().data;
    if (!dataReady) {
      useStore.setState({ wtPlaying: false });
      return;
    }
    const id = setInterval(() => {
      const s = useStore.getState();
      if (s.wtChapter >= CHAPTERS.length - 1) useStore.setState({ wtPlaying: false });
      else useStore.setState({ wtChapter: s.wtChapter + 1 });
    }, Math.max(600, WT_CHAPTER_MS / playSpeed));
    return () => clearInterval(id);
  }, [mode, wtPlaying, playSpeed]);

  // ── Explorer / Architecture mode: canonical op graph autoplay ─────────────
  // Independent of generation playback. Works in explorer mode even without
  // a loaded trace. Steps through all 435 ops (embed → L0×18 → … → lm_head).
  useEffect(() => {
    if (!arch3dPlaying) return;
    const interval = Math.max(60, ARCH_OP_MS / arch3dSpeed);
    const id = setInterval(() => {
      const s = useStore.getState();
      if (!s.arch3dPlaying) return;
      if (s.arch3dOpId === "op_lm_head") {
        // Reached the end — stop and leave on lm_head
        useStore.setState({ arch3dPlaying: false });
        return;
      }
      s.stepArch3dOp(1);
    }, interval);
    return () => clearInterval(id);
  }, [arch3dPlaying, arch3dSpeed]);

  return null;
}
