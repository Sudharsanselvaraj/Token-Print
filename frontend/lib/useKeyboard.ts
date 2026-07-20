"use client";

import { useEffect } from "react";
import { useStore } from "./store";
import { layerAnchors, anchorPosFor } from "./playback";

/**
 * Global keyboard model (Phase 1.7).
 *
 * | Key | Action |
 * |-----|--------|
 * | Space | Toggle play/pause |
 * | F10 | Step one op forward |
 * | F11 | Step to next layer |
 * | J | Previous token |
 * | K | Next token |
 * | B | Toggle breakpoint (placeholder) |
 */
export function useKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if the user is typing in an input.
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      const s = useStore.getState();

      switch (e.key) {
        case " ": {
          e.preventDefault();
          if (s.mode === "generation") {
            s.toggleOpPlay();
          } else if (s.mode === "walkthrough") {
            s.toggleWtPlay();
          }
          break;
        }
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
          // Placeholder: in a full debugger this would toggle a breakpoint on
          // the active layer. For now toggle dev mode.
          s.toggleDevMode();
          break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
