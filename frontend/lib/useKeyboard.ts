"use client";

import { useEffect } from "react";
import { useStore } from "./store";

/**
 * Global keyboard shortcuts for the 3D interaction system.
 *
 * All arrow key and playback shortcuts in explorer mode drive arch3d state.
 * In generation/walkthrough mode they drive the legacy op/token playback.
 *
 * | Key           | Action                                              |
 * |---------------|-----------------------------------------------------|
 * | Space         | Play/Pause (arch3d in explorer, opPlay in gen/wt)   |
 * | ← / →        | Prev/Next operation step                            |
 * | Shift+← / →  | Prev/Next layer                                     |
 * | F / R         | Fit model (reset camera to overview)                |
 * | T             | Switch to token-follow camera mode                  |
 * | Esc           | Exit focus mode / exit token-follow                 |
 * | J / K         | Prev/Next token frame (generation mode)             |
 * | F10           | Step one op forward (legacy)                        |
 * | F11           | Skip to next layer (legacy)                         |
 * | B             | Toggle dev mode                                     |
 */
export function useKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) return;

      const s = useStore.getState();
      const isExplorer = s.mode === "explorer";

      switch (e.key) {
        // ── Play / Pause ─────────────────────────────────────────────────────
        case " ": {
          e.preventDefault();
          if (isExplorer) {
            s.toggleArch3dPlay();
          } else if (s.mode === "generation") {
            s.toggleOpPlay();
          } else if (s.mode === "walkthrough") {
            s.toggleWtPlay();
          }
          break;
        }

        // ── Op step (arrow keys) ─────────────────────────────────────────────
        case "ArrowLeft": {
          e.preventDefault();
          if (e.shiftKey) {
            if (isExplorer) s.stepArch3dLayer(-1);
            else s.setLayer(Math.max(0, s.selectedLayer - 1));
          } else {
            if (isExplorer) s.stepArch3dOp(-1);
            else s.stepOp(-1);
          }
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          if (e.shiftKey) {
            if (isExplorer) s.stepArch3dLayer(1);
            else {
              const max = (s.genMeta?.num_layers ?? 24) - 1;
              s.setLayer(Math.min(max, s.selectedLayer + 1));
            }
          } else {
            if (isExplorer) s.stepArch3dOp(1);
            else s.stepOp(1);
          }
          break;
        }

        // ── Camera shortcuts ─────────────────────────────────────────────────
        case "f":
        case "F": {
          e.preventDefault();
          s.setUserOrbiting(false);
          s.setCameraMode("overview");
          break;
        }
        case "r":
        case "R": {
          e.preventDefault();
          s.setUserOrbiting(false);
          s.setCameraMode("overview");
          break;
        }
        case "t":
        case "T": {
          e.preventDefault();
          s.setCameraMode("token_follow");
          break;
        }

        // ── Focus mode / Escape ──────────────────────────────────────────────
        case "Escape": {
          e.preventDefault();
          if (s.focusMode) s.toggleFocusMode();
          if (s.cameraMode === "token_follow") s.setCameraMode("overview");
          break;
        }

        // ── Legacy keys ──────────────────────────────────────────────────────
        case "F10": {
          e.preventDefault();
          s.stepOp(1);
          break;
        }
        case "F11": {
          e.preventDefault();
          s.skipToNextLayer();
          break;
        }
        case "j":
        case "J": {
          e.preventDefault();
          s.stepPlay(-1);
          break;
        }
        case "k":
        case "K": {
          e.preventDefault();
          s.stepPlay(1);
          break;
        }
        case "b":
        case "B": {
          e.preventDefault();
          s.toggleDevMode();
          break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
