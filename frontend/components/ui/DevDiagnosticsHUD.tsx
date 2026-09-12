"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { opToPreset } from "@/components/camera/CinematicCameraController";

export function DevDiagnosticsHUD() {
  const devMode = useStore((s) => s.devMode);
  const arch3dOpId = useStore((s) => s.arch3dOpId);
  const arch3dLayer = useStore((s) => s.arch3dLayer);
  const arch3dOpKind = useStore((s) => s.arch3dOpKind);
  const arch3dPlaying = useStore((s) => s.arch3dPlaying);
  const arch3dSpeed = useStore((s) => s.arch3dSpeed);
  const cameraMode = useStore((s) => s.cameraMode);

  if (!devMode) return null;

  const preset = opToPreset(arch3dOpId);

  return (
    <div className="absolute top-16 left-4 z-40 bg-black/90 border border-zinc-700 p-3 font-mono text-[10px] text-zinc-300 w-64 shadow-2xl pointer-events-none">
      <div className="text-[11px] font-bold text-white mb-1.5 pb-1 border-b border-zinc-800 tracking-wider">
        CINEMATIC MOTION DIAGNOSTICS
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-zinc-500">STAGE / KIND:</span>
          <span className="text-zinc-100 font-bold">{arch3dOpKind}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">LAYER:</span>
          <span className="text-zinc-100">{arch3dLayer >= 0 ? `L${arch3dLayer}` : "EMBED / HEAD"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">OPERATION ID:</span>
          <span className="text-zinc-100 truncate max-w-[120px]">{arch3dOpId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">CAMERA MODE:</span>
          <span className="text-zinc-100">{cameraMode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">CAMERA PRESET:</span>
          <span className="text-zinc-100">{preset}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">PLAYBACK STATUS:</span>
          <span className={arch3dPlaying ? "text-emerald-400 font-bold" : "text-zinc-400"}>
            {arch3dPlaying ? "PLAYING" : "PAUSED"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">PLAYBACK SPEED:</span>
          <span className="text-zinc-100">{arch3dSpeed}x</span>
        </div>
      </div>
    </div>
  );
}
