import type { StateCreator } from "zustand";
import { analyzeImage, analyzeSentence, fetchArchitecture, listGgufs, openGguf, uploadGguf } from "../api";
import { cueDistrict } from "../sound";
import { annotateTensors } from "../tensorName";
import { dequantizeTensor } from "../gguf/dequant";
import type { ArchitectureSlice, StoreState } from "./types";

export const createArchitectureSlice: StateCreator<StoreState, [], [], ArchitectureSlice> = (set, get) => ({
  data: null,
  loading: false,
  error: null,
  modelMode: "",
  setModelMode: (modelMode) => set({ modelMode }),
  arch: null,
  archFile: null,
  archLoading: false,
  archError: null,
  loadArchitecture: async () => {
    set({ archLoading: true, archError: null });
    try {
      const raw = await fetchArchitecture();
      set({ arch: { ...raw, tensors: annotateTensors(raw.tensors) }, archLoading: false });
    } catch (e) {
      set({ archLoading: false, archError: e instanceof Error ? e.message : "Failed to load architecture" });
    }
  },
  setArch: (arch) => set({
    arch: arch ? { ...arch, tensors: annotateTensors(arch.tensors) } : null,
    selectedTensor: null,
    hoveredTensor: null,
  }),
  ggufs: [],
  ggufMeta: null,
  activeGguf: null,
  refreshGgufs: async () => set({ ggufs: await listGgufs() }),
  uploadGguf: async (file) => {
    const item = await uploadGguf(file);
    set((state) => ({ ggufs: [...state.ggufs.filter((gguf) => gguf.name !== item.name), item] }));
    await get().selectGguf(item.path);
  },
  selectGguf: async (path) => {
    if (!path) {
      set({ activeGguf: null, ggufMeta: null });
      return;
    }
    const open = await openGguf(path);
    set({
      activeGguf: path,
      ggufMeta: open.ok ? { name: open.name ?? path, architecture: open.architecture, quant: open.quant, n_ctx: open.n_ctx } : { name: path },
    });
  },
  selectedTensor: null,
  hoveredTensor: null,
  setHoveredTensor: (hoveredTensor) => set({ hoveredTensor }),
  pointBudget: 250_000,
  pointSize: 0.9,
  colorBy: "layer",
  showConnections: false,
  showLayerBoxes: false,
  setPointBudget: (pointBudget) => set({ pointBudget }),
  setPointSize: (pointSize) => set({ pointSize }),
  setColorBy: (colorBy) => set({ colorBy }),
  setShowConnections: (showConnections) => set({ showConnections }),
  setShowLayerBoxes: (showLayerBoxes) => set({ showLayerBoxes }),
  compareArch: null,
  compareFile: null,
  compareLoading: false,
  compareError: null,
  dequantA: null,
  dequantB: null,
  dequantLoading: false,
  quantErrorMetric: null,
  hotSpots: [],
  hotSpotsLoading: false,
  loadCompareGguf: async (file) => {
    set({ compareLoading: true, compareError: null, hotSpots: [], hotSpotsLoading: false });
    try {
      const { parseGgufFile } = await import("../gguf/parser");
      const data = await parseGgufFile(file);
      set({ compareArch: { ...data, tensors: annotateTensors(data.tensors) }, compareFile: file, compareLoading: false });
    } catch (e) {
      set({ compareLoading: false, compareError: e instanceof Error ? e.message : "GGUF parse failed" });
    }
  },
  clearCompare: () => set({ compareArch: null, compareFile: null, compareError: null, dequantA: null, dequantB: null, quantErrorMetric: null, hotSpots: [], hotSpotsLoading: false }),
  computeHotSpots: async () => {
    const state = get();
    if (!state.archFile || !state.compareFile || !state.arch || !state.compareArch) return;
    set({ hotSpotsLoading: true });
    const tensors: ArchitectureSlice["hotSpots"] = [];
    const sample = 1024;
    for (const tensorA of state.arch.tensors) {
      const tensorB = state.compareArch.tensors.find((tensor) => tensor.name === tensorA.name);
      if (!tensorB || tensorA.n_params !== tensorB.n_params || tensorA.ggmlType === undefined || tensorB.ggmlType === undefined || tensorA.offset === undefined || tensorB.offset === undefined) continue;
      try {
        const [a, b] = await Promise.all([
          dequantizeTensor(state.archFile, tensorA.offset, tensorA.ggmlType, tensorA.n_params, sample),
          dequantizeTensor(state.compareFile, tensorB.offset, tensorB.ggmlType, tensorB.n_params, sample),
        ]);
        const length = Math.min(a.values.length, b.values.length);
        let sum = 0;
        for (let index = 0; index < length; index++) sum += Math.abs(a.values[index] - b.values[index]);
        tensors.push({ name: tensorA.name, score: sum / length, rank: 0 });
      } catch {
        // Skip tensors that cannot be dequantized.
      }
    }
    tensors.sort((a, b) => b.score - a.score);
    tensors.forEach((tensor, index) => (tensor.rank = index + 1));
    set({ hotSpots: tensors.slice(0, 20), hotSpotsLoading: false });
  },
  setSelectedTensor: (selectedTensor) => {
    set({ selectedTensor, dequantA: null, dequantB: null, dequantLoading: false, quantErrorMetric: null });
    const state = get();
    if (!selectedTensor || !state.compareFile || !state.compareArch || !state.archFile || !state.arch) return;
    const tensorA = state.arch.tensors.find((tensor) => tensor.name === selectedTensor);
    const tensorB = state.compareArch.tensors.find((tensor) => tensor.name === selectedTensor);
    if (!tensorA || !tensorB || tensorA.n_params !== tensorB.n_params || tensorA.ggmlType === undefined || tensorB.ggmlType === undefined || tensorA.offset === undefined || tensorB.offset === undefined) return;
    set({ dequantLoading: true });
    Promise.all([
      dequantizeTensor(state.archFile, tensorA.offset, tensorA.ggmlType, tensorA.n_params),
      dequantizeTensor(state.compareFile, tensorB.offset, tensorB.ggmlType, tensorB.n_params),
    ]).then(([a, b]) => {
      const length = Math.min(a.values.length, b.values.length);
      let sum = 0;
      for (let index = 0; index < length; index++) sum += Math.abs(a.values[index] - b.values[index]);
      set({ dequantA: a.values, dequantB: b.values, dequantLoading: false, quantErrorMetric: { name: "Mean Abs Diff", value: sum / length } });
    }).catch(() => set({ dequantLoading: false }));
  },
  currentDistrict: "attention",
  setDistrict: (currentDistrict) => set((state) => {
    if (currentDistrict !== state.currentDistrict) cueDistrict();
    return { currentDistrict };
  }),
  selectedLayer: 0,
  selectedHead: 0,
  minWeight: 0.05,
  embeddingLayer: 0,
  setLayer: (selectedLayer) => set({ selectedLayer }),
  setHead: (selectedHead) => set({ selectedHead }),
  setMinWeight: (minWeight) => set({ minWeight }),
  setEmbeddingLayer: (embeddingLayer) => set({ embeddingLayer }),
  analyze: async (sentence) => {
    set({ loading: true, error: null });
    try {
      const data = await analyzeSentence(sentence);
      set((state) => ({ data, loading: false, modelMode: (data.mode as ArchitectureSlice["modelMode"]) || state.modelMode, selectedLayer: Math.min(state.selectedLayer, data.num_layers - 1), selectedHead: Math.min(state.selectedHead, data.num_heads - 1), embeddingLayer: Math.min(state.embeddingLayer, data.num_layers) }));
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Request failed" });
    }
  },
  analyzeImage: async (image) => {
    set({ loading: true, error: null });
    try {
      const data = await analyzeImage(image);
      set((state) => ({ data, loading: false, modelMode: (data.mode as ArchitectureSlice["modelMode"]) || state.modelMode, selectedLayer: Math.min(state.selectedLayer, data.num_layers - 1), selectedHead: Math.min(state.selectedHead, data.num_heads - 1), embeddingLayer: Math.min(state.embeddingLayer, data.num_layers) }));
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Request failed" });
    }
  },
  tileView: false,
  setTileView: (tileView) => set({ tileView }),
});
