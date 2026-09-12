"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { kindLabel } from "@/components/scenes/TransformerOperationGraph";

const SPEED_OPTIONS = [0.25, 0.5, 1, 2] as const;

export function TransformerControlBar3D() {
  const mode = useStore((s) => s.mode);

  // ── arch3d interaction state ──────────────────────────────────────────────
  const arch3dOpId       = useStore((s) => s.arch3dOpId);
  const arch3dLayer      = useStore((s) => s.arch3dLayer);
  const arch3dOpKind     = useStore((s) => s.arch3dOpKind);
  const arch3dPlaying    = useStore((s) => s.arch3dPlaying);
  const arch3dSpeed      = useStore((s) => s.arch3dSpeed);
  const toggleArch3dPlay = useStore((s) => s.toggleArch3dPlay);
  const stepArch3dOp     = useStore((s) => s.stepArch3dOp);
  const stepArch3dLayer  = useStore((s) => s.stepArch3dLayer);
  const setArch3dSpeed   = useStore((s) => s.setArch3dSpeed);

  // ── camera / focus ────────────────────────────────────────────────────────
  const cameraMode      = useStore((s) => s.cameraMode);
  const setCameraMode   = useStore((s) => s.setCameraMode);
  const focusMode       = useStore((s) => s.focusMode);
  const toggleFocusMode = useStore((s) => s.toggleFocusMode);
  const setUserOrbiting = useStore((s) => s.setUserOrbiting);

  // ── generation playback (for generation/walkthrough modes) ────────────────
  const opPlaying   = useStore((s) => s.opPlaying);
  const toggleOpPlay = useStore((s) => s.toggleOpPlay);
  const stepOp      = useStore((s) => s.stepOp);
  const genMeta     = useStore((s) => s.genMeta);
  const selectedLayer = useStore((s) => s.selectedLayer);

  if (mode === "debugger") return null;

  // Decide which playback system to drive
  const isExplorer = mode === "explorer";
  const playing    = isExplorer ? arch3dPlaying : opPlaying;
  const onPlay     = isExplorer ? toggleArch3dPlay : toggleOpPlay;
  const onPrev     = isExplorer ? () => stepArch3dOp(-1) : () => stepOp(-1);
  const onNext     = isExplorer ? () => stepArch3dOp(1)  : () => stepOp(1);

  const numLayers  = genMeta?.num_layers ?? 24;
  const layerNum   = isExplorer
    ? (arch3dLayer >= 0 ? arch3dLayer : 0)
    : selectedLayer;
  const layerLabel = `L${layerNum + 1}/${numLayers}`;

  // Op label — use arch3d kindLabel in explorer mode, else generation op
  const opLabel = isExplorer ? kindLabel(arch3dOpKind as Parameters<typeof kindLabel>[0]) : "—";

  const handleReset = () => { setUserOrbiting(false); setCameraMode("overview"); };

  const camModes = [
    { id: "overview",     label: "⊞ All" },
    { id: "layer",        label: "◈ Layer" },
    { id: "operation",    label: "⬡ Op" },
    { id: "token_follow", label: "⟳ Follow" },
  ] as const;

  return (
    <>
      <style>{`
        .tf3-bar {
          position: absolute; bottom: 48px; left: 50%; transform: translateX(-50%);
          z-index: 60; display: flex; align-items: center; gap: 0;
          background: rgba(9, 9, 9, 0.95); border: 1px solid #252525;
          border-radius: 10px; padding: 0 5px; height: 36px;
          backdrop-filter: blur(18px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.8);
          user-select: none; white-space: nowrap;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .tf3-sep { width:1px; height:20px; background:#252525; margin:0 4px; flex-shrink:0; }
        .tf3-btn {
          height:26px; padding:0 8px; border-radius:5px; border:none;
          background:transparent; color:#a3a3a3; font-size:12px; font-weight:500;
          cursor:pointer; transition:background 0.12s,color 0.12s; flex-shrink:0;
          font-family:inherit; letter-spacing:0.01em;
        }
        .tf3-btn:hover { background:rgba(255,255,255,0.09); color:#f5f5f5; }
        .tf3-btn.on    { background:#ffffff; color:#000000; font-weight:600; }
        .tf3-play {
          height:28px; padding:0 12px; border-radius:6px; border:none;
          background:rgba(255,255,255,0.12); color:#ffffff; font-size:14px;
          cursor:pointer; transition:background 0.12s; font-family:inherit; flex-shrink:0;
        }
        .tf3-play:hover { background:rgba(255,255,255,0.22); }
        .tf3-lbl { font-size:11px; color:#737373; padding:0 2px; flex-shrink:0; }
        .tf3-val { font-size:12px; color:#f5f5f5; font-weight:600; min-width:52px; text-align:center; flex-shrink:0; }
        .tf3-op  { font-size:11px; color:#a3a3a3; max-width:110px; overflow:hidden; text-overflow:ellipsis; padding:0 4px; flex-shrink:0; }
        .tf3-sp  { height:20px; padding:0 5px; font-size:10px; border-radius:3px; border:none;
                   background:transparent; color:#737373; cursor:pointer; font-family:inherit; font-weight:500;
                   transition:all 0.12s; }
        .tf3-sp:hover { background:rgba(255,255,255,0.07); color:#a3a3a3; }
        .tf3-sp.on    { background:#ffffff; color:#000000; font-weight:600; }
        .tf3-cam { height:20px; padding:0 5px; font-size:10px; border-radius:3px; border:none;
                   background:transparent; color:#737373; cursor:pointer; font-family:inherit; font-weight:500;
                   transition:all 0.12s; letter-spacing:0.02em; }
        .tf3-cam:hover { background:rgba(255,255,255,0.07); color:#a3a3a3; }
        .tf3-cam.on    { background:#ffffff; color:#000000; font-weight:600; }
        .tf3-focus { height:26px; padding:0 8px; border-radius:5px; border:1px solid #383838;
                     background:rgba(255,255,255,0.06); color:#f5f5f5; font-size:11px;
                     cursor:pointer; font-family:inherit; font-weight:500; flex-shrink:0;
                     transition:all 0.12s; }
        .tf3-focus:hover,.tf3-focus.on { background:#ffffff; color:#000000; }
      `}</style>

      <div className="tf3-bar" role="toolbar" aria-label="3D Transformer Controls">
        {/* Reset / Fit */}
        <button className="tf3-btn" title="Reset camera to full model view (R)" onClick={handleReset}>↺</button>
        <button className="tf3-btn" title="Fit model in view (F)" onClick={handleReset}>Fit</button>

        <div className="tf3-sep" />

        {/* Transport */}
        <button className="tf3-btn" title="Previous operation (←)" onClick={onPrev}>‹</button>
        <button className="tf3-play" title={playing ? "Pause (Space)" : "Play (Space)"} onClick={onPlay}>
          {playing ? "⏸" : "▶"}
        </button>
        <button className="tf3-btn" title="Next operation (→)" onClick={onNext}>›</button>

        <div className="tf3-sep" />

        {/* Layer navigation */}
        <button className="tf3-btn" title="Previous layer (Shift+←)" onClick={() => isExplorer ? stepArch3dLayer(-1) : null}>◀</button>
        <span className="tf3-val">{layerLabel}</span>
        <button className="tf3-btn" title="Next layer (Shift+→)" onClick={() => isExplorer ? stepArch3dLayer(1) : null}>▶</button>

        <div className="tf3-sep" />

        {/* Current operation label */}
        <span className="tf3-op" title={opLabel}>{opLabel}</span>

        <div className="tf3-sep" />

        {/* Speed */}
        <span className="tf3-lbl">Speed</span>
        <span style={{ display: "flex", gap: 1 }}>
          {SPEED_OPTIONS.map((sp) => (
            <button
              key={sp}
              className={`tf3-sp ${Math.abs(arch3dSpeed - sp) < 0.01 ? "on" : ""}`}
              onClick={() => setArch3dSpeed(sp)}
              title={`${sp}× speed`}
            >
              {sp}×
            </button>
          ))}
        </span>

        <div className="tf3-sep" />

        {/* Camera mode */}
        <span style={{ display: "flex", gap: 1 }}>
          {camModes.map(({ id, label }) => (
            <button
              key={id}
              className={`tf3-cam ${cameraMode === id ? "on" : ""}`}
              onClick={() => setCameraMode(id)}
              title={`Camera: ${id.replace("_", " ")}`}
            >
              {label}
            </button>
          ))}
        </span>

        <div className="tf3-sep" />

        {/* Focus mode */}
        <button
          className={`tf3-focus ${focusMode ? "on" : ""}`}
          onClick={toggleFocusMode}
          title="Focus mode — hide sidebars (Esc to exit)"
        >
          {focusMode ? "✕ Exit" : "⛶ Focus"}
        </button>
      </div>
    </>
  );
}
