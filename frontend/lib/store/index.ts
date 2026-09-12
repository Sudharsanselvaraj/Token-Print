import { create } from "zustand";
import { loadTraceFile } from "../api";
import { cueToken } from "../sound";
import type { Mode, GenDone, GenMeta, TokenFrame, Trace } from "../types";
import { wsGenerate } from "../ws";
import { createArchitectureSlice } from "./architectureSlice";
import { createArch3dSlice } from "./arch3dSlice";
import { createGenerationSlice } from "./generationSlice";
import { createTraceSlice } from "./traceSlice";
import type { StoreState } from "./types";
import { createUISlice } from "./uiSlice";

let genSocket: WebSocket | null = null;

/**
 * One Zustand store composed from domain slices. Middleware belongs here if it
 * is added in the future, so it observes a single coherent application state.
 */
export const useStore = create<StoreState>()((set, get, store) => ({
  ...createArchitectureSlice(set, get, store),
  ...createGenerationSlice(set, get, store),
  ...createTraceSlice(set, get, store),
  ...createUISlice(set, get, store),
  ...createArch3dSlice(set, get, store),

  // This parses architecture data and changes the top-level UI mode, so it
  // intentionally lives above the slices rather than coupling them together.
  loadGgufFile: async (file) => {
    set({ archLoading: true, archError: null });
    try {
      const { parseGgufFile } = await import("../gguf/parser");
      const { annotateTensors } = await import("../tensorName");
      const data = await parseGgufFile(file);
      set({
        arch: { ...data, tensors: annotateTensors(data.tensors) },
        archFile: file,
        archLoading: false,
        selectedTensor: null,
        hoveredTensor: null,
        mode: "explorer",
      });
    } catch (error) {
      set({ archLoading: false, archError: error instanceof Error ? error.message : "GGUF parse failed" });
    }
  },

  // A new live generation resets playback and trace-debug state together.
  startGeneration: (prompt, options) => {
    genSocket?.close();
    set({
      genStatus: "streaming",
      genMeta: null,
      genFrames: [],
      genText: "",
      genError: null,
      playIndex: -1,
      isPlaying: false,
      opIndex: 0,
      opPlaying: false,
      autoStarted: false,
      traceSource: "live",
      debugSnapshots: {},
      debugSnapshotError: null,
    });
    genSocket = wsGenerate(
      prompt,
      { maxNewTokens: 40, topK: 10, trace: true, recordTrace: true, gguf: get().activeGguf ?? undefined, ...options },
      {
        onFrame: (raw) => {
          const frame = raw as { type: string } & Record<string, unknown>;
          if (frame.type === "meta") {
            set({ genMeta: raw as unknown as GenMeta });
          } else if (frame.type === "token") {
            set((state) => {
              const genFrames = [...state.genFrames, raw as unknown as TokenFrame];
              cueToken(genFrames.length);
              return { genFrames, playIndex: state.autoStarted ? state.playIndex : genFrames.length - 1 };
            });
          } else if (frame.type === "done") {
            set({ genStatus: "done", genText: String(frame.generated_text ?? ""), genDone: raw as unknown as GenDone });
          } else if (frame.type === "error") {
            set({ genStatus: "error", genError: String(frame.message ?? "error") });
          }
        },
        onError: () => set((state) => state.genStatus === "streaming" ? { genStatus: "error", genError: "connection error" } : {}),
      },
    );
  },

  // File replay changes generation data, trace provenance, and the active UI mode.
  loadTrace: async (file) => {
    set({
      genStatus: "streaming",
      genMeta: null,
      genFrames: [],
      genText: "",
      genError: null,
      genDone: null,
      playIndex: -1,
      isPlaying: false,
      opIndex: 0,
      opPlaying: false,
      autoStarted: false,
      mode: "generation",
      debugSnapshots: {},
      debugSnapshotError: null,
    });
    try {
      const trace: Trace = await loadTraceFile(file);
      const genFrames = trace.frames ?? [];
      set({
        genMeta: trace.meta,
        genFrames,
        genText: trace.done?.generated_text ?? "",
        genStatus: "done",
        genDone: (trace.done as GenDone | undefined) ?? null,
        playIndex: 0,
        isPlaying: false,
        traceSource: "file",
      });
    } catch (error) {
      set({ genStatus: "error", genError: error instanceof Error ? error.message : "Failed to load trace file" });
    }
  },

  // Classroom controls are UI state but advance the shared generation cursor.
  classroomStep: () => set((state) => {
    const count = state.genMeta?.op_catalog?.length ?? 1;
    return { opIndex: (state.opIndex + 1) % count };
  }),
}));

/** Slice-scoped selectors for common, stable single-domain subscriptions. */
export const useArchitectureTensors = () => useStore((state) => state.arch?.tensors);
export const useGenerationFrames = () => useStore((state) => state.genFrames);
export const useTraceBreakpoints = () => useStore((state) => state.breakpoints);
export const useUIMode = () => useStore((state) => state.mode);

/** Parse URL search parameters and restore the corresponding store state. */
export function restoreFromUrl(): Partial<StoreState> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  if (!params.get("v")) return {};
  const state: Partial<StoreState> = {};
  const mode = params.get("mode") as Mode | null;
  if (mode) state.mode = mode;
  const tokenIndex = params.get("token");
  if (tokenIndex) state.playIndex = Number(tokenIndex);
  const opIndex = params.get("op");
  if (opIndex) state.opIndex = Number(opIndex);
  const chapter = params.get("chapter");
  if (chapter) state.wtChapter = Number(chapter);
  if (params.get("embed") === "true") state.embedMode = true;
  return state;
}

export type { StoreState } from "./types";
