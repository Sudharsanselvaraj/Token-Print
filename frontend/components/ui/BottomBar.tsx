"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { phaseInfo } from "@/lib/playback";
import { opById } from "@/components/scenes/TransformerOperationGraph";
import { Button, IconButton, Badge, TOKENS } from "./primitives";

const SPEEDS = [0.5, 1, 2, 4];

function disp(t: string): string {
  const s = t.replace(/\n/g, "\u23CE");
  return s.length === 0 ? "\u2423" : s;
}

export default function BottomBar() {
  const mode = useStore((s) => s.mode);

  if (mode === "generation") return <GenBottomBar />;
  if (mode === "walkthrough") return <WtBottomBar />;
  if (mode === "explorer") return <ArchBottomBar />;
  return null;
}

function ArchBottomBar() {
  const arch3dPlaying = useStore((s) => s.arch3dPlaying);
  const toggleArch3dPlay = useStore((s) => s.toggleArch3dPlay);
  const stepArch3dOp = useStore((s) => s.stepArch3dOp);
  const stepArch3dLayer = useStore((s) => s.stepArch3dLayer);
  const arch3dSpeed = useStore((s) => s.arch3dSpeed);
  const setArch3dSpeed = useStore((s) => s.setArch3dSpeed);
  const arch3dOpId = useStore((s) => s.arch3dOpId);
  const cameraMode = useStore((s) => s.cameraMode);
  const setCameraMode = useStore((s) => s.setCameraMode);
  const selectedTokenIndex = useStore((s) => s.selectedTokenIndex);
  const setSelectedTokenIndex = useStore((s) => s.setSelectedTokenIndex);
  const data = useStore((s) => s.data);

  const op = opById.get(arch3dOpId);
  const tokens = data?.tokens || [
    { index: 0, text: "Name", id: 2437 },
    { index: 1, text: "one", id: 284 },
    { index: 2, text: "primary", id: 4331 },
    { index: 3, text: "color", id: 16326 },
    { index: 4, text: ".", id: 2456 },
  ];

  const cycleSpeed = () => {
    const SPEED_LIST = [0.25, 0.5, 1, 2, 4];
    const idx = SPEED_LIST.indexOf(arch3dSpeed);
    const next = SPEED_LIST[(idx + 1) % SPEED_LIST.length];
    setArch3dSpeed(next);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "36px",
        background: TOKENS.bg,
        borderTop: `1px solid ${TOKENS.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: "8px",
        zIndex: 50,
        fontFamily: TOKENS.fontSans,
      }}
    >
      {/* PLAY / PAUSE */}
      <IconButton
        icon={arch3dPlaying ? "⏸" : "▶"}
        onClick={toggleArch3dPlay}
        active={arch3dPlaying}
        title={arch3dPlaying ? "Pause (Space)" : "Play Computational Journey (Space)"}
      />

      {/* STEP OP BUTTONS */}
      <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
        <Button onClick={() => stepArch3dOp(-1)} title="Previous Operation">
          ◄ Op
        </Button>
        <Button onClick={() => stepArch3dOp(1)} title="Next Operation">
          Op ►
        </Button>
      </div>

      {/* STEP LAYER BUTTONS */}
      <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
        <Button onClick={() => stepArch3dLayer(-1)} title="Previous Layer">
          L-
        </Button>
        <Button onClick={() => stepArch3dLayer(1)} title="Next Layer">
          L+
        </Button>
      </div>

      {/* SPEED SELECTOR */}
      <Button onClick={cycleSpeed} title="Playback Speed">
        {arch3dSpeed}×
      </Button>

      {/* CAMERA MODE SELECTOR */}
      <div
        style={{
          display: "flex",
          gap: "2px",
          background: TOKENS.surfaceFlat,
          padding: "2px",
          borderRadius: TOKENS.radiusSm,
          border: `1px solid ${TOKENS.border}`,
        }}
      >
        {(["overview", "layer", "operation", "token_follow"] as const).map((m) => (
          <Button
            key={m}
            variant={cameraMode === m ? "primary" : "ghost"}
            onClick={() => setCameraMode(m)}
            style={{ height: "22px", padding: "0 6px", fontSize: "10px" }}
          >
            {m === "token_follow" ? "follow" : m === "operation" ? "op" : m}
          </Button>
        ))}
      </div>

      {/* ACTIVE OP BADGE */}
      {op && (
        <Badge>
          {op.layer != null ? `L${op.layer}` : "GLOBAL"} · {op.label}
        </Badge>
      )}

      <div style={{ flex: 1 }} />

      {/* TOKEN SELECTOR ROW */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", overflow: "hidden" }}>
        {tokens.map((tok, i) => (
          <Button
            key={i}
            variant={selectedTokenIndex === i ? "primary" : "ghost"}
            onClick={() => setSelectedTokenIndex(i)}
            style={{ height: "22px", padding: "0 6px", fontSize: "10px" }}
          >
            {tok.text}
          </Button>
        ))}
      </div>
    </div>
  );
}

function GenBottomBar() {
  const frames = useStore((s) => s.genFrames);
  const meta = useStore((s) => s.genMeta);
  const status = useStore((s) => s.genStatus);
  const playIndex = useStore((s) => s.playIndex);
  const opPlaying = useStore((s) => s.opPlaying);
  const toggleOpPlay = useStore((s) => s.toggleOpPlay);
  const skipToNextLayer = useStore((s) => s.skipToNextLayer);
  const skipToNextToken = useStore((s) => s.skipToNextToken);
  const playSpeed = useStore((s) => s.playSpeed);
  const setPlaySpeed = useStore((s) => s.setPlaySpeed);
  const followMode = useStore((s) => s.followMode);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const view2D = useStore((s) => s.view2D);
  const toggleView2D = useStore((s) => s.toggleView2D);
  const genStatus = useStore((s) => s.genStatus);
  const traceSource = useStore((s) => s.traceSource);
  const downloadTrace = useStore((s) => s.downloadTrace);
  const hasCatalog = useStore((s) => (s.genMeta?.op_catalog?.length ?? 0) > 0);

  const frame = playIndex >= 0 ? frames[playIndex] : null;
  const promptLen = meta?.prompt_len ?? 0;
  const usesCache = meta?.uses_kv_cache;
  const phase = phaseInfo(frame, promptLen, usesCache);

  const cycleSpeed = () => {
    const i = SPEEDS.indexOf(playSpeed);
    setPlaySpeed(SPEEDS[(i + 1) % SPEEDS.length] ?? 1);
  };

  if (!hasCatalog && frames.length === 0) return null;

  const gen = frames.filter((f) => !f.eos).map((f) => f.chosen.text);
  const TAIL = 8;
  const promptTail = meta?.prompt_tokens.slice(-TAIL) ?? [];
  const truncated = (meta?.prompt_tokens.length ?? 0) > TAIL;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: TOKENS.bg,
        borderTop: `1px solid ${TOKENS.border}`,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "6px 12px",
        zIndex: 50,
        fontFamily: TOKENS.fontSans,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <IconButton icon={opPlaying ? "⏸" : "▶"} onClick={toggleOpPlay} title="Play / pause" />
        <Button onClick={skipToNextLayer} title="Skip to next layer">⏭ Layer</Button>
        <Button onClick={skipToNextToken} title="Skip to next token">Next Token ⏩</Button>
        <Button onClick={cycleSpeed}>{playSpeed}× Speed</Button>

        {phase && <Badge>{phase.label}</Badge>}

        {frames.length > 0 && (
          <span style={{ fontSize: "11px", color: TOKENS.textMuted }}>
            {playIndex + 1} / {frames.length} ops
          </span>
        )}

        <div style={{ flex: 1 }} />

        <Button variant={followMode ? "primary" : "secondary"} onClick={toggleFollow}>
          Follow {followMode ? "On" : "Off"}
        </Button>
        <Button variant={view2D ? "primary" : "secondary"} onClick={toggleView2D}>
          {view2D ? "3D" : "2D"}
        </Button>

        {genStatus === "done" && traceSource === "live" && (
          <Button onClick={downloadTrace} title="Download .tokenprint.json">
            ↓ Trace
          </Button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", overflow: "hidden" }}>
        <span style={{ color: TOKENS.textMuted, fontSize: "10px" }}>tokens:</span>
        {truncated && <span style={{ color: TOKENS.textMuted }}>…</span>}
        {promptTail.map((t, i) => (
          <span key={"p" + i} style={{ color: TOKENS.textMuted }}>
            {disp(t)}
          </span>
        ))}
        {gen.map((t, i) => (
          <span
            key={"g" + i}
            style={{
              color: i === gen.length - 1 ? TOKENS.textPrimary : TOKENS.textSecondary,
              fontWeight: i === gen.length - 1 ? 600 : 400,
            }}
          >
            {disp(t)}
          </span>
        ))}
        {status === "streaming" && <span style={{ color: TOKENS.textPrimary }}>▌</span>}
      </div>
    </div>
  );
}

function WtBottomBar() {
  const prev = useStore((s) => s.prevChapter);
  const next = useStore((s) => s.nextChapter);
  const wtPlaying = useStore((s) => s.wtPlaying);
  const toggleWtPlay = useStore((s) => s.toggleWtPlay);
  const chapterIdx = useStore((s) => s.wtChapter);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "36px",
        background: TOKENS.bg,
        borderTop: `1px solid ${TOKENS.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: "8px",
        zIndex: 50,
        fontFamily: TOKENS.fontSans,
      }}
    >
      <IconButton icon={wtPlaying ? "⏸" : "▶"} onClick={toggleWtPlay} title="Play / pause walkthrough" />
      <Button onClick={prev}>◄ Prev</Button>
      <Button onClick={next}>Next ►</Button>
      <Badge>Chapter {chapterIdx + 1}</Badge>
    </div>
  );
}
