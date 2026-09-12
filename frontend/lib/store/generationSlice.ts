import type { StateCreator } from "zustand";
import { anchorPosFor, layerAnchors } from "../playback";
import type { GenerationSlice, StoreState } from "./types";

export const createGenerationSlice: StateCreator<StoreState, [], [], GenerationSlice> = (set) => ({
  genStatus: "idle",
  genMeta: null,
  genFrames: [],
  genText: "",
  genError: null,
  genDone: null,
  playIndex: -1,
  isPlaying: false,
  setPlayIndex: (playIndex) => set((state) => ({
    playIndex: Math.max(0, Math.min(playIndex, state.genFrames.length - 1)),
    isPlaying: false,
  })),
  stepPlay: (direction) => set((state) => ({
    playIndex: Math.max(0, Math.min(state.playIndex + direction, state.genFrames.length - 1)),
    isPlaying: false,
  })),
  togglePlay: () => set((state) => {
    if (state.genFrames.length === 0) return {};
    const atEnd = state.playIndex >= state.genFrames.length - 1;
    return { isPlaying: !state.isPlaying, playIndex: !state.isPlaying && atEnd ? 0 : state.playIndex };
  }),
  replay: () => set((state) => (state.genFrames.length ? { playIndex: 0, isPlaying: true } : {})),
  opIndex: 0,
  opPlaying: false,
  followMode: true,
  userOrbiting: false,
  setUserOrbiting: (userOrbiting) => set({ userOrbiting }),
  view2D: false,
  playSpeed: 0.5,
  autoStarted: false,
  setOpIndex: (opIndex) => set((state) => {
    const count = state.genMeta?.op_catalog?.length ?? 0;
    return { opIndex: Math.max(0, Math.min(opIndex, Math.max(0, count - 1))), opPlaying: false };
  }),
  stepOp: (direction) => set((state) => {
    const count = state.genMeta?.op_catalog?.length ?? 0;
    return { opIndex: Math.max(0, Math.min(state.opIndex + direction, Math.max(0, count - 1))), opPlaying: false };
  }),
  toggleOpPlay: () => set((state) => {
    const count = state.genMeta?.op_catalog?.length ?? 0;
    if (count === 0) return {};
    const atLastOp = state.opIndex >= count - 1;
    const atLastToken = state.playIndex >= state.genFrames.length - 1;
    const rewind = !state.opPlaying && atLastOp && atLastToken;
    return { opPlaying: !state.opPlaying, opIndex: rewind ? 0 : state.opIndex, playIndex: rewind ? 0 : state.playIndex };
  }),
  toggleFollow: () => set((state) => ({ followMode: !state.followMode })),
  toggleView2D: () => set((state) => ({ view2D: !state.view2D })),
  setPlaySpeed: (playSpeed) => set({ playSpeed: Math.max(0.25, Math.min(playSpeed, 4)) }),
  setAutoStarted: (autoStarted) => set({ autoStarted }),
  skipToNextLayer: () => set((state) => {
    const catalog = state.genMeta?.op_catalog ?? [];
    const layerCount = state.genMeta?.num_layers ?? 0;
    if (catalog.length === 0) return {};
    const anchors = layerAnchors(catalog, layerCount);
    const position = anchorPosFor(anchors, state.opIndex);
    if (position < anchors.length - 1) return { opIndex: anchors[position + 1] };
    if (state.playIndex < state.genFrames.length - 1) return { playIndex: state.playIndex + 1, opIndex: 0 };
    return {};
  }),
  skipToNextToken: () => set((state) => (
    state.playIndex < state.genFrames.length - 1 ? { playIndex: state.playIndex + 1, opIndex: 0 } : {}
  )),
});
