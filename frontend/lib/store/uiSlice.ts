import type { StateCreator } from "zustand";
import { setMuted as setSoundMuted } from "../sound";
import type { StoreState, UISlice } from "./types";

export const createUISlice: StateCreator<StoreState, [], [], UISlice> = (set) => ({
  mode: "explorer",
  setMode: (mode) => set({ mode }),
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
  embedMode: false,
  setEmbedMode: (embedMode) => set({ embedMode }),
  traceGalleryOpen: false,
  setTraceGalleryOpen: (traceGalleryOpen) => set({ traceGalleryOpen }),
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
