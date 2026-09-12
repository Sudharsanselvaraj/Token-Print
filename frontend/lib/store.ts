import { create } from "zustand";
import {
  opById as _opById,
  nextOpId as _nextOpId,
  prevOpId as _prevOpId,
  firstOpOfLayer as _firstOpOfLayer,
} from "@/components/scenes/TransformerOperationGraph";
import { analyzeSentence, analyzeImage, listGgufs, uploadGguf, openGguf, fetchArchitecture, loadTraceFile, downloadTrace as apiDownloadTrace } from "./api";
import type { GgufItem } from "./api";
import { layerAnchors, anchorPosFor } from "./playback";
import { wsGenerate, type GenOptions } from "./ws";
import { cueDistrict, cueToken, setMuted as setSoundMuted } from "./sound";
import { annotateTensors } from "./tensorName";
import { dequantizeTensor } from "./gguf/dequant";
import type {
  AnalyzeResponse,
  ArchitectureData,
  DebugSnapshot,
  District,
  GenDone,
  GenMeta,
  GenStatus,
  HotSpot,
  Mode,
  TensorInfo,
  TokenFrame,
  Trace,
} from "./types";
import type { TraceAnnotation } from "./types";

interface NeuroState {
  data: AnalyzeResponse | null;
  loading: boolean;
  error: string | null;

  // Model family served by the backend (issue #87): "" until known.
  modelMode: "causal_lm" | "encoder" | "vision" | "";
  setModelMode: (m: NeuroState["modelMode"]) => void;

  // Top-level app mode (replaces the district flythrough).
  mode: Mode;
  setMode: (m: Mode) => void;

  // Data-first computation graph view modes
  graphViewMode: "full" | "single_layer" | "attention_flow" | "residual_stream" | "logit_lens" | "activations" | "token_flow";
  setGraphViewMode: (m: NeuroState["graphViewMode"]) => void;
  selectedTokenIndex: number;
  setSelectedTokenIndex: (i: number) => void;
  expandedBlockId: string | null;
  setExpandedBlockId: (id: string | null) => void;

  // --- Architecture Explorer ------------------------------------------- //
  arch: ArchitectureData | null;
  archFile: File | null; // the original GGUF file (if loaded via drag-drop)
  archLoading: boolean;
  archError: string | null;
  loadArchitecture: () => Promise<void>; // model-backed source (/architecture)
  loadGgufFile: (file: File) => Promise<void>; // client-side GGUF drag-drop
  setArch: (a: ArchitectureData | null) => void;

  // --- Quantized GGUF generation (issue #85) ------------------------------ //
  ggufs: GgufItem[];
  ggufMeta: { name?: string; architecture?: string; quant?: string; n_ctx?: number } | null;
  activeGguf: string | null; // server-side file name, or null for PyTorch
  refreshGgufs: () => Promise<void>;
  uploadGguf: (file: File) => Promise<void>;
  selectGguf: (path: string | null) => Promise<void>;
  selectedTensor: string | null;
  hoveredTensor: string | null;
  setSelectedTensor: (name: string | null) => void;
  setHoveredTensor: (name: string | null) => void;
  // explorer controls
  pointBudget: number;
  pointSize: number;
  colorBy: "layer" | "role";
  showConnections: boolean;
  showLayerBoxes: boolean;
  setPointBudget: (n: number) => void;
  setPointSize: (n: number) => void;
  setColorBy: (c: "layer" | "role") => void;
  setShowConnections: (b: boolean) => void;
  setShowLayerBoxes: (b: boolean) => void;

  // --- v0.25 Quantization Diff ------------------------------------------- //
  compareArch: ArchitectureData | null;
  compareFile: File | null;
  compareLoading: boolean;
  compareError: string | null;
  loadCompareGguf: (file: File) => Promise<void>;
  clearCompare: () => void;
  // Dequantized data for the currently selected tensor in both files.
  dequantA: Float32Array | null;
  dequantB: Float32Array | null;
  dequantLoading: boolean;
  quantErrorMetric: { name: string; value: number } | null;
  // v0.25 hot-spot ranking.
  hotSpots: HotSpot[];
  hotSpotsLoading: boolean;
  computeHotSpots: () => Promise<void>;

  // Which district the camera is visiting.
  currentDistrict: District;
  setDistrict: (d: District) => void;

  // Phase 4: cinematic / accessibility settings.
  quality: "cinematic" | "performance";
  toggleQuality: () => void;
  muted: boolean;
  toggleMuted: () => void;

  // Attention District controls
  selectedLayer: number;
  selectedHead: number;
  minWeight: number; // only draw beams with weight >= this

  // Embedding District controls
  embeddingLayer: number; // which layer's hidden state to project (0 = embeddings)

  setLayer: (l: number) => void;
  setHead: (h: number) => void;
  setMinWeight: (w: number) => void;
  setEmbeddingLayer: (l: number) => void;
  analyze: (sentence: string) => Promise<void>;
  analyzeImage: (image: string) => Promise<void>;

  // --- Phase 3: generation ---------------------------------------------- //
  genStatus: GenStatus;
  genMeta: GenMeta | null;
  genFrames: TokenFrame[]; // recorded real frames (for replay)
  genText: string;
  genError: string | null;
  genDone: GenDone | null;
  playIndex: number; // which recorded frame is displayed
  isPlaying: boolean;

  startGeneration: (prompt: string, opts?: GenOptions) => void;
  setPlayIndex: (i: number) => void;
  stepPlay: (dir: 1 | -1) => void;
  togglePlay: () => void;
  replay: () => void;

  // --- v0.2 Trace (Record & Replay) -------------------------------------- //
  loadTrace: (file: File) => Promise<void>;
  downloadTrace: () => Promise<void>;
  traceSource: "live" | "file" | null; // where the current gen data came from

  // Op-walkthrough playback (Generation panel).
  opIndex: number;
  opPlaying: boolean;
  followMode: boolean;
  userOrbiting: boolean;
  setUserOrbiting: (b: boolean) => void;
  view2D: boolean;
  playSpeed: number; // animation-speed multiplier (pacing only, never data)
  autoStarted: boolean; // has autoplay kicked off for the current trace?
  setOpIndex: (i: number) => void;
  stepOp: (dir: 1 | -1) => void;
  toggleOpPlay: () => void;
  toggleFollow: () => void;
  toggleView2D: () => void;
  setPlaySpeed: (n: number) => void;
  setAutoStarted: (b: boolean) => void;
  skipToNextLayer: () => void;
  skipToNextToken: () => void;

  // Phase 3 – Debugger internals.
  breakpoints: Set<number>; // op indices where autoplay pauses
  toggleBreakpoint: (opIndex: number) => void;
  // Semantic LOD threshold (0=all, 1=hide stat<0.05, 2=hide stat<0.15)
  lodLevel: number;
  setLodLevel: (n: number) => void;
  // Watch expressions: label -> JS expression string
  watches: { label: string; expr: string; value: unknown }[];
  addWatch: (label: string, expr: string) => void;
  removeWatch: (label: string) => void;
  evalWatches: () => void;
  // Anomaly sentinel scores: per-layer entropy/stat deviation flags
  sentinelScores: { layer: number; score: number; reason: string }[];
  computeSentinels: () => void;
  // Number provenance trail: [opIndex, tensorName, slice] per step
  provenanceTrail: { opIndex: number; tensor: string; slice: string }[];
  setProvenanceTrail: (trail: { opIndex: number; tensor: string; slice: string }[]) => void;
  // Source mapping: which tensor name is currently source-selected
  sourceSelectedTensor: string | null;
  setSourceSelectedTensor: (name: string | null) => void;

  // --- Debug snapshots captured at breakpoint pauses (issue #63) --------- //
  // opIndex -> snapshot; the most recent capture is `debugSnapshotActive`.
  debugSnapshots: Record<number, DebugSnapshot>;
  debugSnapshotLoading: boolean;
  debugSnapshotError: string | null;
  setDebugSnapshot: (opIndex: number, snap: DebugSnapshot) => void;
  setDebugSnapshotLoading: (b: boolean) => void;
  setDebugSnapshotError: (msg: string | null) => void;
  clearDebugSnapshots: () => void;

  // Optional overlays (off/neutral by default where the addendum asks).
  showEquations: boolean; // per-layer LaTeX (kept on: it's the spec's teaching content)
  devMode: boolean; // raw sampled tensor values + indices for the active op
  brightness: number; // global scene-brightness multiplier (user preference)
  toggleEquations: () => void;
  toggleDevMode: () => void;
  setBrightness: (n: number) => void;

  // Tile grid view (Phase 2).
  tileView: boolean;
  setTileView: (v: boolean) => void;

  // Educational walkthrough.
  wtChapter: number;
  wtModel: string;
  wtPlaying: boolean; // chapter autoplay (reuses the playback engine's pacing)
  setWtChapter: (i: number) => void;
  nextChapter: () => void;
  prevChapter: () => void;
  setWtModel: (id: string) => void;
  toggleWtPlay: () => void;

  // --- Phase 5: Embeddable Player ---
  embedMode: boolean;
  setEmbedMode: (b: boolean) => void;
  
  // --- Phase 5: Trace Gallery ---
  traceGalleryOpen: boolean;
  setTraceGalleryOpen: (b: boolean) => void;

  // --- Phase 5: Annotations ---
  annotations: TraceAnnotation[];
  addAnnotation: (ann: TraceAnnotation) => void;
  removeAnnotation: (id: string) => void;
  updateAnnotation: (id: string, text: string) => void;

  // --- Phase 5: Sonification ---
  sonificationEnabled: boolean;
  toggleSonification: () => void;

  // --- Phase 5: Classroom Mode ---
  classroomMode: boolean;
  classroomPresenting: boolean;
  toggleClassroomMode: () => void;
  classroomStep: () => void;  // Advance to next op for all viewers

  // --- 3D Camera & Focus Mode ---
  cameraMode: "overview" | "layer" | "operation" | "token_follow";
  setCameraMode: (m: NeuroState["cameraMode"]) => void;
  focusMode: boolean;
  toggleFocusMode: () => void;
  expandedLayer: number | null;
  setExpandedLayer: (l: number | null) => void;

  // --- Architecture 3D Interaction State Machine (Phase 7) ---
  // Single authoritative selection state consumed by every 3D scene component.
  arch3dOpId: string;               // canonical op ID, e.g. "op_l11_attn_softmax"
  arch3dLayer: number;              // 0-23 (or -1 for embed, 24+ for final nodes)
  arch3dOpKind: string;             // OperationKind string
  arch3dPlaying: boolean;           // architecture-mode autoplay (explorer tab)
  arch3dSpeed: number;              // 0.25 | 0.5 | 1 | 2

  // The ONE authoritative selection action — sets op, layer, tensor, camera.
  selectArch3dOp: (opId: string) => void;
  stepArch3dOp: (dir: 1 | -1) => void;
  stepArch3dLayer: (dir: 1 | -1) => void;
  toggleArch3dPlay: () => void;
  setArch3dSpeed: (n: number) => void;

  // --- 3D Component Inspect Mode ---
  inspectingComponentId: string | null;
  inspectPreviousCamera: { position: [number, number, number]; target: [number, number, number] } | null;
  inspectAutoRotate: boolean;
  enterInspectMode: (componentId: string) => void;
  exitInspectMode: () => void;
  toggleInspectAutoRotate: () => void;
  navigateInspectComponent: (dir: 1 | -1) => void;
}

let genSocket: WebSocket | null = null;

export const useStore = create<NeuroState>((set, get) => ({
  data: null,
  loading: false,
  modelMode: "",
  setModelMode: (m) => set({ modelMode: m }),
  error: null,

  mode: "explorer",
  setMode: (m) => set({ mode: m }),

  graphViewMode: "full",
  setGraphViewMode: (m) => set({ graphViewMode: m }),
  selectedTokenIndex: 0,
  setSelectedTokenIndex: (i) => set({ selectedTokenIndex: i }),
  expandedBlockId: null,
  setExpandedBlockId: (id) => set({ expandedBlockId: id }),

  embedMode: false,
  setEmbedMode: (b) => set({ embedMode: b }),

  traceGalleryOpen: false,
  setTraceGalleryOpen: (b) => set({ traceGalleryOpen: b }),

  annotations: [],
  addAnnotation: (ann) => set((s) => ({ annotations: [...s.annotations, ann] })),
  removeAnnotation: (id) => set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) })),
  updateAnnotation: (id, text) => set((s) => ({
    annotations: s.annotations.map((a) => (a.id === id ? { ...a, text } : a))
  })),

  sonificationEnabled: false,
  toggleSonification: () =>
    set((s) => {
      const next = !s.sonificationEnabled;
      import("./sonification").then((mod) => mod.setSonificationEnabled(next));
      return { sonificationEnabled: next };
    }),

  classroomMode: false,
  classroomPresenting: false,
  toggleClassroomMode: () => set((s) => ({ classroomMode: !s.classroomMode })),
  classroomStep: () =>
    set((s) => {
      const numOps = s.genMeta?.op_catalog?.length ?? 1;
      const nextOp = (s.opIndex + 1) % numOps;
      return { opIndex: nextOp };
    }),

  // --- 3D Camera & Focus Mode ---
  cameraMode: "overview",
  setCameraMode: (m) => set({ cameraMode: m }),
  focusMode: false,
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  expandedLayer: null,
  setExpandedLayer: (l) => set({ expandedLayer: l }),

  // --- Architecture 3D Interaction State Machine ---
  arch3dOpId: "op_embed",
  arch3dLayer: -1,
  arch3dOpKind: "embedding",
  arch3dPlaying: false,
  arch3dSpeed: 1,

  selectArch3dOp: (opId) =>
    set((s) => {
      const op = _opById.get(opId);
      if (!op) return {};
      const layer = op.layer ?? -1;
      const nextCam =
        s.cameraMode === "overview" ? "overview" :
        s.cameraMode === "token_follow" ? "token_follow" :
        "operation";
      return {
        arch3dOpId: opId,
        arch3dLayer: layer,
        arch3dOpKind: op.kind,
        selectedLayer: layer >= 0 ? layer : s.selectedLayer,
        selectedTensor: op.tensorName ?? s.selectedTensor,
        cameraMode: nextCam,
        inspectingComponentId: opId,
      };
    }),

  stepArch3dOp: (dir) =>
    set((s) => {
      const next = dir > 0 ? _nextOpId(s.arch3dOpId) : _prevOpId(s.arch3dOpId);
      if (!next) return {};
      const op = _opById.get(next);
      if (!op) return {};
      const layer = op.layer ?? -1;
      return {
        arch3dOpId: next,
        arch3dLayer: layer,
        arch3dOpKind: op.kind,
        selectedLayer: layer >= 0 ? layer : s.selectedLayer,
        selectedTensor: op.tensorName ?? s.selectedTensor,
      };
    }),

  stepArch3dLayer: (dir) =>
    set((s) => {
      const current = s.arch3dLayer >= 0 ? s.arch3dLayer : 0;
      const next = Math.max(0, Math.min(23, current + dir));
      const opId = _firstOpOfLayer(next);
      const op = _opById.get(opId);
      return {
        arch3dOpId: opId,
        arch3dLayer: next,
        arch3dOpKind: op?.kind ?? "norm1",
        selectedLayer: next,
        selectedTensor: op?.tensorName ?? s.selectedTensor,
        cameraMode: "layer" as const,
        userOrbiting: false,
      };
    }),

  toggleArch3dPlay: () =>
    set((s) => {
      if (!s.arch3dPlaying && s.arch3dOpId === "op_lm_head") {
        return { arch3dPlaying: true, arch3dOpId: "op_embed", arch3dLayer: -1, arch3dOpKind: "embedding" };
      }
      return { arch3dPlaying: !s.arch3dPlaying };
    }),

  setArch3dSpeed: (n) => set({ arch3dSpeed: Math.max(0.25, Math.min(n, 4)) }),

  // --- 3D Component Inspect Mode ---
  inspectingComponentId: null,
  inspectPreviousCamera: null,
  inspectAutoRotate: true,

  enterInspectMode: (componentId) =>
    set((s) => {
      const op = _opById.get(componentId);
      const layer = op?.layer ?? -1;
      return {
        inspectingComponentId: componentId,
        arch3dOpId: componentId,
        arch3dLayer: layer,
        arch3dOpKind: op?.kind ?? "embedding",
        selectedLayer: layer >= 0 ? layer : s.selectedLayer,
        selectedTensor: op?.tensorName ?? s.selectedTensor,
        inspectAutoRotate: true,
        userOrbiting: false,
      };
    }),

  exitInspectMode: () =>
    set({
      inspectingComponentId: null,
    }),

  toggleInspectAutoRotate: () =>
    set((s) => ({ inspectAutoRotate: !s.inspectAutoRotate })),

  navigateInspectComponent: (dir) =>
    set((s) => {
      if (!s.inspectingComponentId) return {};
      const next = dir > 0 ? _nextOpId(s.inspectingComponentId) : _prevOpId(s.inspectingComponentId);
      if (!next) return {};
      const op = _opById.get(next);
      const layer = op?.layer ?? -1;
      return {
        inspectingComponentId: next,
        arch3dOpId: next,
        arch3dLayer: layer,
        arch3dOpKind: op?.kind ?? "embedding",
        selectedLayer: layer >= 0 ? layer : s.selectedLayer,
        selectedTensor: op?.tensorName ?? s.selectedTensor,
        userOrbiting: false,
      };
    }),

  arch: null,
  archFile: null,
  archLoading: false,
  archError: null,
  ggufs: [],
  ggufMeta: null,
  activeGguf: null,
  loadArchitecture: async () => {
    set({ archLoading: true, archError: null });
    try {
      const raw = await fetchArchitecture();
      const arch = { ...raw, tensors: annotateTensors(raw.tensors) };
      set({ arch, archLoading: false });
    } catch (e) {
      set({
        archLoading: false,
        archError: e instanceof Error ? e.message : "Failed to load architecture",
      });
    }
  },
  loadGgufFile: async (file) => {
    set({ archLoading: true, archError: null });
    try {
      const { parseGgufFile } = await import("./gguf/parser");
      const data = await parseGgufFile(file);
      set({
        arch: { ...data, tensors: annotateTensors(data.tensors) },
        archFile: file,
        archLoading: false,
        selectedTensor: null,
        hoveredTensor: null,
        mode: "explorer",
      });
    } catch (e) {
      set({
        archLoading: false,
        archError: e instanceof Error ? e.message : "GGUF parse failed",
      });
    }
  },
  setArch: (a) =>
    set({
      arch: a ? { ...a, tensors: annotateTensors(a.tensors) } : null,
      selectedTensor: null,
      hoveredTensor: null,
    }),
  refreshGgufs: async () => {
    set({ ggufs: await listGgufs() });
  },
  uploadGguf: async (file) => {
    const item = await uploadGguf(file);
    set((s) => ({ ggufs: [...s.ggufs.filter((g) => g.name !== item.name), item] }));
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
      ggufMeta: open.ok
        ? {
            name: open.name ?? path,
            architecture: open.architecture,
            quant: open.quant,
            n_ctx: open.n_ctx,
          }
        : { name: path },
    });
  },
  selectedTensor: null,
  hoveredTensor: null,
  setHoveredTensor: (name) => set({ hoveredTensor: name }),
  pointBudget: 250_000,
  pointSize: 0.9,
  colorBy: "layer",
  showConnections: false,
  showLayerBoxes: false,
  setPointBudget: (n) => set({ pointBudget: n }),
  setPointSize: (n) => set({ pointSize: n }),
  setColorBy: (c) => set({ colorBy: c }),
  setShowConnections: (b) => set({ showConnections: b }),
  setShowLayerBoxes: (b) => set({ showLayerBoxes: b }),

  // --- v0.25 Quantization Diff ------------------------------------------- //
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
      const { parseGgufFile } = await import("./gguf/parser");
      const data = await parseGgufFile(file);
      set({
        compareArch: { ...data, tensors: annotateTensors(data.tensors) },
        compareFile: file,
        compareLoading: false,
      });
    } catch (e) {
      set({
        compareLoading: false,
        compareError: e instanceof Error ? e.message : "GGUF parse failed",
      });
    }
  },

  clearCompare: () =>
    set({
      compareArch: null,
      compareFile: null,
      compareError: null,
      dequantA: null,
      dequantB: null,
      quantErrorMetric: null,
      hotSpots: [],
      hotSpotsLoading: false,
    }),

  computeHotSpots: async () => {
    const s = useStore.getState();
    if (!s.archFile || !s.compareFile || !s.arch || !s.compareArch) return;
    set({ hotSpotsLoading: true });
    const tensors: HotSpot[] = [];
    const SAMPLE = 1024;
    for (const tA of s.arch.tensors) {
      const tB = s.compareArch.tensors.find((t) => t.name === tA.name);
      if (!tB || tA.n_params !== tB.n_params || tA.ggmlType === undefined || tB.ggmlType === undefined || tA.offset === undefined || tB.offset === undefined) continue;
      try {
        const [a, b] = await Promise.all([
          dequantizeTensor(s.archFile, tA.offset, tA.ggmlType, tA.n_params, SAMPLE),
          dequantizeTensor(s.compareFile, tB.offset, tB.ggmlType, tB.n_params, SAMPLE),
        ]);
        const vA = a.values;
        const vB = b.values;
        const len = Math.min(vA.length, vB.length);
        let sum = 0;
        for (let i = 0; i < len; i++) sum += Math.abs(vA[i] - vB[i]);
        tensors.push({ name: tA.name, score: sum / len, rank: 0 });
      } catch {
        // skip tensors that fail dequantization
      }
    }
    tensors.sort((a, b) => b.score - a.score);
    tensors.forEach((t, i) => (t.rank = i + 1));
    const top = tensors.slice(0, 20);
    set({ hotSpots: top, hotSpotsLoading: false });
  },

  setSelectedTensor: (name) => {
    set({ selectedTensor: name, dequantA: null, dequantB: null, dequantLoading: false, quantErrorMetric: null });
    // If we have both GGUF files loaded and a tensor is selected, dequantize both copies.
    const state = useStore.getState();
    if (name && state.compareFile && state.compareArch && state.archFile && state.arch) {
      const tA = state.arch.tensors.find((t) => t.name === name);
      const tB = state.compareArch.tensors.find((t) => t.name === name);
      if (tA && tB && tA.n_params === tB.n_params && tA.ggmlType !== undefined && tB.ggmlType !== undefined && tA.offset !== undefined && tB.offset !== undefined) {
        set({ dequantLoading: true });
        Promise.all([
          dequantizeTensor(state.archFile, tA.offset, tA.ggmlType, tA.n_params),
          dequantizeTensor(state.compareFile, tB.offset, tB.ggmlType, tB.n_params),
        ]).then(([a, b]) => {
          const vA = a.values;
          const vB = b.values;
          const len = Math.min(vA.length, vB.length);
          let sum = 0;
          for (let i = 0; i < len; i++) sum += Math.abs(vA[i] - vB[i]);
          set({
            dequantA: vA,
            dequantB: vB,
            dequantLoading: false,
            quantErrorMetric: { name: "Mean Abs Diff", value: sum / len },
          });
        }).catch(() => set({ dequantLoading: false }));
      }
    }
  },

  currentDistrict: "attention",
  setDistrict: (d) =>
    set((s) => {
      if (d !== s.currentDistrict) cueDistrict();
      return { currentDistrict: d };
    }),

  quality: "cinematic",
  toggleQuality: () =>
    set((s) => ({
      quality: s.quality === "cinematic" ? "performance" : "cinematic",
    })),
  muted: true, // sound is opt-in
  toggleMuted: () =>
    set((s) => {
      const muted = !s.muted;
      setSoundMuted(muted);
      return { muted };
    }),

  selectedLayer: 0,
  selectedHead: 0,
  minWeight: 0.05,
  embeddingLayer: 0,

  setLayer: (l) => set({ selectedLayer: l }),
  setHead: (h) => set({ selectedHead: h }),
  setMinWeight: (w) => set({ minWeight: w }),
  setEmbeddingLayer: (l) => set({ embeddingLayer: l }),

  analyze: async (sentence) => {
    set({ loading: true, error: null });
    try {
      const data = await analyzeSentence(sentence);
      // Clamp any existing selection to the new data's valid range.
      set((s) => ({
        data,
        loading: false,
        modelMode: (data.mode as NeuroState["modelMode"]) || s.modelMode,
        selectedLayer: Math.min(s.selectedLayer, data.num_layers - 1),
        selectedHead: Math.min(s.selectedHead, data.num_heads - 1),
        // hidden_states_3d has entries 0..num_layers (embeddings + each layer).
        embeddingLayer: Math.min(s.embeddingLayer, data.num_layers),
      }));
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Request failed",
      });
    }
  },

  analyzeImage: async (image) => {
    set({ loading: true, error: null });
    try {
      const data = await analyzeImage(image);
      set((s) => ({
        data,
        loading: false,
        modelMode: (data.mode as NeuroState["modelMode"]) || s.modelMode,
        selectedLayer: Math.min(s.selectedLayer, data.num_layers - 1),
        selectedHead: Math.min(s.selectedHead, data.num_heads - 1),
        embeddingLayer: Math.min(s.embeddingLayer, data.num_layers),
      }));
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Request failed",
      });
    }
  },

  // --- Phase 3: generation ------------------------------------------------ //
  genStatus: "idle",
  genMeta: null,
  genFrames: [],
  genText: "",
  genError: null,
  genDone: null,
  playIndex: -1,
  isPlaying: false,
  traceSource: null,

  opIndex: 0,
  opPlaying: false,
  followMode: true,
  userOrbiting: false,
  view2D: false,
  playSpeed: 0.5,
  autoStarted: false,

  // Phase 3 – Debugger internals
  breakpoints: new Set<number>(),
  toggleBreakpoint: (opIdx) =>
    set((s) => {
      const bp = new Set(s.breakpoints);
      if (bp.has(opIdx)) bp.delete(opIdx); else bp.add(opIdx);
      return { breakpoints: bp, opPlaying: false };
    }),
  lodLevel: 0,
  setLodLevel: (n) => set({ lodLevel: Math.max(0, Math.min(n, 2)) }),
  watches: [],
  addWatch: (label, expr) =>
    set((s) => ({ watches: [...s.watches, { label, expr, value: undefined }] })),
  removeWatch: (label) =>
    set((s) => ({ watches: s.watches.filter((w) => w.label !== label) })),
  evalWatches: () =>
    set((s) => ({
      watches: s.watches.map((w) => {
        try {
          const val = new Function("store", `with(store) { return (${w.expr}); }`)(s);
          return { ...w, value: val };
        } catch { return { ...w, value: "‹error›" }; }
      }),
    })),
  sentinelScores: [],
  computeSentinels: () =>
    set((s) => {
      const frames = s.genFrames;
      if (!frames.length) return {};
      const nLayers = s.genMeta?.num_layers ?? 0;
      const perLayer: number[][] = Array.from({ length: nLayers }, () => []);
      for (const f of frames) {
        for (let l = 0; l < nLayers && l < f.layer_stats.length; l++) {
          perLayer[l].push(f.layer_stats[l]);
        }
      }
      const scores: { layer: number; score: number; reason: string }[] = [];
      for (let l = 0; l < nLayers; l++) {
        const vals = perLayer[l];
        if (vals.length < 3) continue;
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
        if (std < 1e-8) continue;
        const last = vals[vals.length - 1];
        const z = Math.abs((last - mean) / std);
        if (z > 2.5) scores.push({ layer: l, score: z * 10, reason: `z=${z.toFixed(1)}` });
      }
      return { sentinelScores: scores.sort((a, b) => b.score - a.score).slice(0, 10) };
    }),
  provenanceTrail: [],
  setProvenanceTrail: (trail: { opIndex: number; tensor: string; slice: string }[]) => set({ provenanceTrail: trail }),
  sourceSelectedTensor: null,
  setSourceSelectedTensor: (name) => set({ sourceSelectedTensor: name }),

  debugSnapshots: {},
  debugSnapshotLoading: false,
  debugSnapshotError: null,
  setDebugSnapshot: (opIndex, snap) =>
    set((s) => ({ debugSnapshots: { ...s.debugSnapshots, [opIndex]: snap } })),
  setDebugSnapshotLoading: (b) => set({ debugSnapshotLoading: b }),
  setDebugSnapshotError: (msg) => set({ debugSnapshotError: msg }),
  clearDebugSnapshots: () => set({ debugSnapshots: {} }),

  setOpIndex: (i) =>
    set((s) => {
      const n = s.genMeta?.op_catalog?.length ?? 0;
      return { opIndex: Math.max(0, Math.min(i, Math.max(0, n - 1))), opPlaying: false };
    }),
  // Manual step is op-by-op (fine-grained) and pauses autoplay.
  stepOp: (dir) =>
    set((s) => {
      const n = s.genMeta?.op_catalog?.length ?? 0;
      return {
        opIndex: Math.max(0, Math.min(s.opIndex + dir, Math.max(0, n - 1))),
        opPlaying: false,
      };
    }),
  toggleOpPlay: () =>
    set((s) => {
      const n = s.genMeta?.op_catalog?.length ?? 0;
      if (n === 0) return {};
      // Restart from the top only if we're truly at the very end of the trace.
      const atLastOp = s.opIndex >= n - 1;
      const atLastToken = s.playIndex >= s.genFrames.length - 1;
      const rewind = !s.opPlaying && atLastOp && atLastToken;
      return {
        opPlaying: !s.opPlaying,
        opIndex: rewind ? 0 : s.opIndex,
        playIndex: rewind ? 0 : s.playIndex,
      };
    }),
  toggleFollow: () => set((s) => ({ followMode: !s.followMode })),
  setUserOrbiting: (b: boolean) => set({ userOrbiting: b }),
  toggleView2D: () => set((s) => ({ view2D: !s.view2D })),
  setPlaySpeed: (n) => set({ playSpeed: Math.max(0.25, Math.min(n, 4)) }),
  setAutoStarted: (b) => set({ autoStarted: b }),

  // Skip = jump straight to the next layer/token without animating the ops in
  // between (the follow camera then eases to the new target).
  skipToNextLayer: () =>
    set((s) => {
      const cat = s.genMeta?.op_catalog ?? [];
      const nLayers = s.genMeta?.num_layers ?? 0;
      if (cat.length === 0) return {};
      const anchors = layerAnchors(cat, nLayers);
      const pos = anchorPosFor(anchors, s.opIndex);
      if (pos < anchors.length - 1) return { opIndex: anchors[pos + 1] };
      // Past the last layer: roll to the next token's forward pass.
      if (s.playIndex < s.genFrames.length - 1)
        return { playIndex: s.playIndex + 1, opIndex: 0 };
      return {};
    }),
  skipToNextToken: () =>
    set((s) => {
      if (s.playIndex < s.genFrames.length - 1)
        return { playIndex: s.playIndex + 1, opIndex: 0 };
      return {};
    }),

  showEquations: true,
  devMode: false,
  brightness: 1,
  toggleEquations: () => set((s) => ({ showEquations: !s.showEquations })),
  toggleDevMode: () => set((s) => ({ devMode: !s.devMode })),
  setBrightness: (n) => set({ brightness: Math.max(0.3, Math.min(n, 2.5)) }),

  tileView: false,
  setTileView: (v) => set({ tileView: v }),

  wtChapter: 0,
  wtModel: "qwen05",
  wtPlaying: false,
  // Manual chapter changes stop chapter autoplay so it doesn't fight the user.
  setWtChapter: (i) => set({ wtChapter: Math.max(0, i), wtPlaying: false }),
  nextChapter: () => set((s) => ({ wtChapter: s.wtChapter + 1 })),
  prevChapter: () => set((s) => ({ wtChapter: Math.max(0, s.wtChapter - 1), wtPlaying: false })),
  setWtModel: (id) => set({ wtModel: id }),
  toggleWtPlay: () => set((s) => ({ wtPlaying: !s.wtPlaying })),

  startGeneration: (prompt, opts) => {
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
      {
        maxNewTokens: 40,
        topK: 10,
        trace: true,
        recordTrace: true,
        gguf: get().activeGguf ?? undefined,
        ...opts,
      },
      {
      onFrame: (raw) => {
        const f = raw as { type: string } & Record<string, unknown>;
        if (f.type === "meta") {
          set({ genMeta: raw as unknown as GenMeta });
        } else if (f.type === "token") {
          set((s) => {
            const frames = [...s.genFrames, raw as unknown as TokenFrame];
            cueToken(frames.length);
            // Before autoplay takes over, track the newest token so the strip
            // shows generation live; once autoplay starts it owns the cursor.
            return {
              genFrames: frames,
              playIndex: s.autoStarted ? s.playIndex : frames.length - 1,
            };
          });
        } else if (f.type === "done") {
          set({
            genStatus: "done",
            genText: String((f as Record<string, unknown>).generated_text ?? ""),
            genDone: raw as unknown as GenDone,
          });
        } else if (f.type === "error") {
          set({
            genStatus: "error",
            genError: String((f as Record<string, unknown>).message ?? "error"),
          });
        }
      },
      onError: () =>
        set((s) =>
          s.genStatus === "streaming"
            ? { genStatus: "error", genError: "connection error" }
            : {},
        ),
    });
  },

  setPlayIndex: (i) =>
    set((s) => ({
      playIndex: Math.max(0, Math.min(i, s.genFrames.length - 1)),
      isPlaying: false,
    })),

  stepPlay: (dir) =>
    set((s) => ({
      playIndex: Math.max(0, Math.min(s.playIndex + dir, s.genFrames.length - 1)),
      isPlaying: false,
    })),

  togglePlay: () =>
    set((s) => {
      if (s.genFrames.length === 0) return {};
      // If at the end, restart from the beginning on play.
      const atEnd = s.playIndex >= s.genFrames.length - 1;
      return {
        isPlaying: !s.isPlaying,
        playIndex: !s.isPlaying && atEnd ? 0 : s.playIndex,
      };
    }),

  replay: () =>
    set((s) => (s.genFrames.length ? { playIndex: 0, isPlaying: true } : {})),

  // --- v0.2 Trace (Record & Replay) ---------------------------------------- //
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
      // Populate the store with the trace data — same shape as a live WS session.
      const frames = trace.frames ?? [];
      set({
        genMeta: trace.meta,
        genFrames: frames,
        genText: trace.done?.generated_text ?? "",
        genStatus: "done",
        genDone: (trace.done as GenDone | undefined) ?? null,
        playIndex: 0,
        isPlaying: false,
        traceSource: "file",
      });
    } catch (e) {
      set({
        genStatus: "error",
        genError: e instanceof Error ? e.message : "Failed to load trace file",
      });
    }
  },

  downloadTrace: async () => {
    await apiDownloadTrace();
  },
}));

/** Parse URL search params and restore store state (snapshot load). */
export function restoreFromUrl(): Partial<NeuroState> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const v = p.get("v");
  if (!v) return {};

  const state: Partial<NeuroState> = {};

  const mode = p.get("mode") as Mode | null;
  if (mode) state.mode = mode;

  const tokenIdx = p.get("token");
  if (tokenIdx) state.playIndex = Number(tokenIdx);

  const opIdx = p.get("op");
  if (opIdx) state.opIndex = Number(opIdx);

  const chapter = p.get("chapter");
  if (chapter) state.wtChapter = Number(chapter);

  if (p.get("embed") === "true") state.embedMode = true;

  return state;
}
