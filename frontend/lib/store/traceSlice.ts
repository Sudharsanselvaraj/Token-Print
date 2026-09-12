import type { StateCreator } from "zustand";
import { downloadTrace as apiDownloadTrace } from "../api";
import type { StoreState, TraceSlice } from "./types";

export const createTraceSlice: StateCreator<StoreState, [], [], TraceSlice> = (set) => ({
  traceSource: null,
  downloadTrace: async () => {
    await apiDownloadTrace();
  },
  breakpoints: new Set<number>(),
  toggleBreakpoint: (opIndex) => set((state) => {
    const breakpoints = new Set(state.breakpoints);
    if (breakpoints.has(opIndex)) breakpoints.delete(opIndex);
    else breakpoints.add(opIndex);
    return { breakpoints, opPlaying: false };
  }),
  lodLevel: 0,
  setLodLevel: (lodLevel) => set({ lodLevel: Math.max(0, Math.min(lodLevel, 2)) }),
  watches: [],
  addWatch: (label, expr) => set((state) => ({ watches: [...state.watches, { label, expr, value: undefined }] })),
  removeWatch: (label) => set((state) => ({ watches: state.watches.filter((watch) => watch.label !== label) })),
  evalWatches: () => set((state) => ({
    watches: state.watches.map((watch) => {
      try {
        const value = new Function("store", `with(store) { return (${watch.expr}); }`)(state);
        return { ...watch, value };
      } catch {
        return { ...watch, value: "â€¹errorâ€º" };
      }
    }),
  })),
  sentinelScores: [],
  computeSentinels: () => set((state) => {
    if (!state.genFrames.length) return {};
    const layerCount = state.genMeta?.num_layers ?? 0;
    const perLayer: number[][] = Array.from({ length: layerCount }, () => []);
    for (const frame of state.genFrames) {
      for (let layer = 0; layer < layerCount && layer < frame.layer_stats.length; layer++) {
        perLayer[layer].push(frame.layer_stats[layer]);
      }
    }
    const scores: TraceSlice["sentinelScores"] = [];
    for (let layer = 0; layer < layerCount; layer++) {
      const values = perLayer[layer];
      if (values.length < 3) continue;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const standardDeviation = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
      if (standardDeviation < 1e-8) continue;
      const zScore = Math.abs((values[values.length - 1] - mean) / standardDeviation);
      if (zScore > 2.5) scores.push({ layer, score: zScore * 10, reason: `z=${zScore.toFixed(1)}` });
    }
    return { sentinelScores: scores.sort((a, b) => b.score - a.score).slice(0, 10) };
  }),
  provenanceTrail: [],
  setProvenanceTrail: (provenanceTrail) => set({ provenanceTrail }),
  sourceSelectedTensor: null,
  setSourceSelectedTensor: (sourceSelectedTensor) => set({ sourceSelectedTensor }),
  debugSnapshots: {},
  debugSnapshotLoading: false,
  debugSnapshotError: null,
  setDebugSnapshot: (opIndex, snapshot) => set((state) => ({
    debugSnapshots: { ...state.debugSnapshots, [opIndex]: snapshot },
  })),
  setDebugSnapshotLoading: (debugSnapshotLoading) => set({ debugSnapshotLoading }),
  setDebugSnapshotError: (debugSnapshotError) => set({ debugSnapshotError }),
  clearDebugSnapshots: () => set({ debugSnapshots: {} }),
  annotations: [],
  addAnnotation: (annotation) => set((state) => ({ annotations: [...state.annotations, annotation] })),
  removeAnnotation: (id) => set((state) => ({ annotations: state.annotations.filter((annotation) => annotation.id !== id) })),
  updateAnnotation: (id, text) => set((state) => ({
    annotations: state.annotations.map((annotation) => annotation.id === id ? { ...annotation, text } : annotation),
  })),
});
