import type { StoreApi } from "zustand";
import type { FrameSink } from "../generation";
import { cueToken } from "../sound";
import type { GenDone, GenMeta, TokenFrame } from "../types";
import type { StoreState } from "./types";

/**
 * Phase 5.2a (#311): the store's frame→state transitions, exposed as a
 * FrameSink so tests can pin them without a WebSocket or browser. `startGeneration`
 * builds one of these with the live store `set` and hands it to the selected source.
 */
export function createFrameSink(
  set: StoreApi<StoreState>["setState"],
): FrameSink {
  return {
    onMeta: (meta: GenMeta) => set({ genMeta: meta }),
    onToken: (token: TokenFrame) =>
      set((state) => {
        const genFrames = [...state.genFrames, token];
        cueToken(genFrames.length);
        return {
          genFrames,
          playIndex: state.autoStarted ? state.playIndex : genFrames.length - 1,
        };
      }),
    onDone: (done: GenDone) =>
      set({ genStatus: "done", genText: String(done.generated_text ?? ""), genDone: done }),
    onError: (message: string) =>
      set({ genStatus: "error", genError: message }),
    onClose: () => undefined,
  };
}