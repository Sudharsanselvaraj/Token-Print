import { create } from "zustand";
import { loadTraceFile } from "../api";
import type { GenerationSource } from "../generation";
import { localSource, wsSource } from "../generation";
import type { GenerationHandle } from "../generation";
import type { GenDone, TokenFrame, Trace } from "../types";
import type { GenOptions } from "../ws";
import { createArchitectureSlice } from "./architectureSlice";
import { createArch3dSlice } from "./arch3dSlice";
import { createFrameSink } from "./generationSink";
import { createGenerationSlice } from "./generationSlice";
import { createTraceSlice } from "./traceSlice";
import type { StoreState } from "./types";
import { createUISlice } from "./uiSlice";

let genHandle: GenerationHandle | null = null;

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
      });
    } catch (error) {
      set({ archLoading: false, archError: error instanceof Error ? error.message : "GGUF parse failed" });
    }
  },

  // A new live generation resets playback and trace-debug state together.
  startGeneration: (prompt, options) => {
    genHandle?.close();
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
    const opts: GenOptions = {
      maxNewTokens: 40,
      topK: 10,
      trace: true,
      recordTrace: true,
      gguf: get().activeGguf ?? undefined,
      ...options,
    };
    // Phase 5.2a (#311): the store consumes a typed FrameSink; the producer is
    // injectable (live WebSocket today, in-browser engine in 5.2b/5.2c).
    const sink = createFrameSink(set);
    const source: GenerationSource = opts.source === "local" ? localSource : wsSource;
    genHandle = source(prompt, opts, sink);
  },

  // Stops an in-flight streaming generation (closes the source, keeps frames).
  stopGeneration: () => {
    genHandle?.close();
    genHandle = null;
    set({ genStatus: "idle", isPlaying: false, opPlaying: false });
  },

  // File replay changes generation data and trace provenance. It intentionally
  // does NOT change the active route/mode: the URL decides which workspace is
  // rendered. Accepts either a File (parsed + validated via loadTraceFile) or an
  // already-parsed Trace object (auto-demo, replay, cross-token jumps).
  loadTrace: async (file: File | Trace) => {
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
      debugSnapshots: {},
      debugSnapshotError: null,
    });
    try {
      const trace: Trace = file instanceof File ? await loadTraceFile(file) : file;
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

/** Domain slice store hooks for modular state access (ENG-13). */
export const useArchitectureStore = <T>(selector: (state: StoreState) => T) => useStore(selector);
export const useGenerationStore = <T>(selector: (state: StoreState) => T) => useStore(selector);
export const useTraceStore = <T>(selector: (state: StoreState) => T) => useStore(selector);
export const useUiStore = <T>(selector: (state: StoreState) => T) => useStore(selector);

/** Parse URL search parameters and restore route-local transient state. */
export function restoreFromUrl(): Partial<StoreState> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const state: Partial<StoreState> = {};
  const v = params.get("v");
  if (!v) return state;
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
