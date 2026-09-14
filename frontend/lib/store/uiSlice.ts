import type { StateCreator } from "zustand";
import { setMuted as setSoundMuted } from "../sound";
import type { StoreState, UISlice } from "./types";

export const createUISlice: StateCreator<StoreState, [], [], UISlice> = (set) => ({
  mode: "explorer",
  setMode: (mode) => set({ mode }),
  navMode: "OVERVIEW",
  setNavMode: (navMode) =>
    set((state) => {
      const mode = state.mode === "debugger" ? "explorer" : state.mode;
      switch (navMode) {
        case "OVERVIEW":
          return {
            navMode,
            mode,
            cameraMode: "overview",
            followMode: false,
            userOrbiting: false,
            wtCamMode: "CINEMATIC",
          };
        case "LAYER_FOCUS":
          return {
            navMode,
            mode,
            cameraMode: "layer",
            followMode: false,
            userOrbiting: false,
            wtCamMode: "CINEMATIC",
          };
        case "OP_FOCUS":
          return {
            navMode,
            mode,
            cameraMode: "operation",
            followMode: false,
            userOrbiting: false,
            wtCamMode: "CINEMATIC",
          };
        case "FOLLOW":
          return {
            navMode,
            mode,
            cameraMode: "token_follow",
            followMode: true,
            userOrbiting: false,
            wtCamMode: "CINEMATIC",
          };
        case "MANUAL":
        default:
          return {
            navMode,
            mode,
            userOrbiting: true,
            followMode: false,
            wtCamMode: "MANUAL",
          };
      }
    }),
  quality: "cinematic",
  toggleQuality: () => set((state) => ({ quality: state.quality === "cinematic" ? "performance" : "cinematic" })),
  muted: true,
  toggleMuted: () => set((state) => {
    const muted = !state.muted;
    setSoundMuted(muted);
    return { muted };
  }),
  showEquations: true,
  devMode: false,
  brightness: 1,
  toggleEquations: () => set((state) => ({ showEquations: !state.showEquations })),
  toggleDevMode: () => set((state) => ({ devMode: !state.devMode })),
  setBrightness: (brightness) => set({ brightness: Math.max(0.3, Math.min(brightness, 2.5)) }),
  wtChapter: 0,
  wtModel: "qwen05",
  wtPlaying: false,
  setWtChapter: (wtChapter) => set({ wtChapter: Math.max(0, wtChapter), wtPlaying: false }),
  nextChapter: () => set((state) => ({ wtChapter: state.wtChapter + 1 })),
  prevChapter: () => set((state) => ({ wtChapter: Math.max(0, state.wtChapter - 1), wtPlaying: false })),
  setWtModel: (wtModel) => set({ wtModel }),
  toggleWtPlay: () => set((state) => ({ wtPlaying: !state.wtPlaying })),
  wtCamMode: "CINEMATIC",
  setWtCamMode: (wtCamMode) => set({ wtCamMode }),
  wtCamDebug: false,
  toggleWtCamDebug: () => set((state) => ({ wtCamDebug: !state.wtCamDebug })),
  debuggerTool: "overview",
  setDebuggerTool: (debuggerTool) => set({ debuggerTool }),
  embedMode: false,
  setEmbedMode: (embedMode) => set({ embedMode }),
  traceGalleryOpen: false,
  setTraceGalleryOpen: (traceGalleryOpen) => set({ traceGalleryOpen }),
  hfExplorerOpen: false,
  setHfExplorerOpen: (hfExplorerOpen) => set({ hfExplorerOpen }),
  sonificationEnabled: false,
  toggleSonification: () => set((state) => {
    const sonificationEnabled = !state.sonificationEnabled;
    import("../sonification").then((module) => module.setSonificationEnabled(sonificationEnabled));
    return { sonificationEnabled };
  }),
  classroomMode: false,
  classroomPresenting: false,
  toggleClassroomMode: () => set((state) => ({ classroomMode: !state.classroomMode })),
});
