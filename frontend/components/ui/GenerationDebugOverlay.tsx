"use client";

import React, { useMemo } from "react";
import { useStore } from "../../lib/store";
import { EXECUTION_GRAPH } from "../../lib/executionGraph";

export function GenerationDebugOverlay() {
  const mode = useStore((s) => s.mode);
  const devMode = useStore((s) => s.devMode);
  const opPlaying = useStore((s) => s.opPlaying);
  const opIndex = useStore((s) => s.opIndex);
  const playIndex = useStore((s) => s.playIndex);
  const genMeta = useStore((s) => s.genMeta);
  const cameraMode = useStore((s) => s.cameraMode);
  const userOrbiting = useStore((s) => s.userOrbiting);

  const currentStep = useMemo(() => {
    const catalog = genMeta?.op_catalog ?? [];
    if (!catalog.length) {
      const idx = Math.min(opIndex, EXECUTION_GRAPH.timeline.length - 1);
      return EXECUTION_GRAPH.timeline[idx] ?? EXECUTION_GRAPH.timeline[0];
    }
    const currentOp = catalog[Math.min(opIndex, catalog.length - 1)];
    const l = currentOp?.layer ?? null;
    const key = (currentOp?.op_key ?? "").toLowerCase();

    return EXECUTION_GRAPH.timeline.find((t) => {
      if (t.layer !== l) return false;
      if (key.includes("norm1")) return t.stage === "NORM_1";
      if (key.includes("q_proj") || key.includes("k_proj") || key.includes("v_proj")) return t.stage === "QKV_PROJECTION";
      if (key.includes("rope")) return t.stage === "ROPE";
      if (key.includes("attn") || key.includes("softmax")) return t.stage === "SOFTMAX";
      if (key.includes("o_proj")) return t.stage === "O_PROJECTION";
      if (key.includes("norm2")) return t.stage === "NORM_2";
      if (key.includes("mlp") || key.includes("swiglu")) return t.stage === "SWIGLU";
      return t.layer === l;
    }) ?? EXECUTION_GRAPH.timeline[0];
  }, [opIndex, genMeta]);

  if (mode !== "generation" || !devMode) return null;

  const totalSteps = EXECUTION_GRAPH.timeline.length;
  const progressPct = Math.round(((currentStep.stepIndex + 1) / totalSteps) * 100);

  const activeEdge = currentStep.edgeId ? EXECUTION_GRAPH.edges.get(currentStep.edgeId) : null;
  const nextStep = EXECUTION_GRAPH.timeline[currentStep.stepIndex + 1] ?? null;

  const camDebug = typeof window !== "undefined" ? (window as unknown as Record<string, any>).__ns_cam_debug : null;

  return (
    <div
      style={{
        position: "fixed",
        top: "60px",
        left: "16px",
        zIndex: 100,
        background: "rgba(0, 0, 0, 0.88)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        borderRadius: "6px",
        padding: "10px 14px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "11px",
        color: "#e2e8f0",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        pointerEvents: "none",
        minWidth: "260px",
      }}
    >
      <div style={{ color: "#38bdf8", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "4px", marginBottom: "4px" }}>
        CAMERA & PLAYBACK DEBUG
      </div>
      <div>Playback: <span style={{ color: opPlaying ? "#22c55e" : "#f59e0b" }}>{opPlaying ? "RUNNING" : "PAUSED"}</span> (Op {opIndex} / {genMeta?.op_catalog?.length ?? 243})</div>
      <div>Active Layer: <span style={{ color: "#a855f7" }}>Layer {camDebug?.layer ?? currentStep.layer ?? 0} ({camDebug?.opKey ?? currentStep.stage})</span></div>
      <div>Camera Mode: <span style={{ color: userOrbiting ? "#f97316" : "#3b82f6" }}>{userOrbiting ? "MANUAL_CAMERA" : cameraMode}</span></div>
      <div>Desired Pos: <span style={{ color: "#818cf8" }}>{camDebug?.desiredPos ? `[${camDebug.desiredPos.join(", ")}]` : "N/A"}</span></div>
      <div>Desired Tgt: <span style={{ color: "#818cf8" }}>{camDebug?.desiredTgt ? `[${camDebug.desiredTgt.join(", ")}]` : "N/A"}</span></div>
      <div>Actual Pos: <span style={{ color: "#34d399" }}>{camDebug?.actualPos ? `[${camDebug.actualPos.join(", ")}]` : "N/A"}</span></div>
      <div>Actual Tgt: <span style={{ color: "#34d399" }}>{camDebug?.actualTgt ? `[${camDebug.actualTgt.join(", ")}]` : "N/A"}</span></div>
      <div>Token Step: <span style={{ color: "#06b6d4" }}>#{playIndex + 1}</span></div>
    </div>
  );
}
