import type { GgufItem } from "../api";
import type { GenOptions } from "../ws";
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
  TokenFrame,
} from "../types";
import type { TraceAnnotation } from "../types";

export interface ArchitectureSlice {
  data: AnalyzeResponse | null;
  loading: boolean;
  error: string | null;
  modelMode: "causal_lm" | "encoder" | "vision" | "";
  setModelMode: (m: ArchitectureSlice["modelMode"]) => void;
  arch: ArchitectureData | null;
  archFile: File | null;
  archLoading: boolean;
  archError: string | null;
  loadArchitecture: () => Promise<void>;
  setArch: (a: ArchitectureData | null) => void;
  ggufs: GgufItem[];
  ggufMeta: { name?: string; architecture?: string; quant?: string; n_ctx?: number } | null;
  activeGguf: string | null;
  refreshGgufs: () => Promise<void>;
  uploadGguf: (file: File) => Promise<void>;
  selectGguf: (path: string | null) => Promise<void>;
  selectedTensor: string | null;
  hoveredTensor: string | null;
  setSelectedTensor: (name: string | null) => void;
  setHoveredTensor: (name: string | null) => void;
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
  compareArch: ArchitectureData | null;
  compareFile: File | null;
  compareLoading: boolean;
  compareError: string | null;
  loadCompareGguf: (file: File) => Promise<void>;
  clearCompare: () => void;
  dequantA: Float32Array | null;
  dequantB: Float32Array | null;
  dequantLoading: boolean;
  quantErrorMetric: { name: string; value: number } | null;
  hotSpots: HotSpot[];
  hotSpotsLoading: boolean;
  computeHotSpots: () => Promise<void>;
  currentDistrict: District;
  setDistrict: (d: District) => void;
  selectedLayer: number;
  selectedHead: number;
  minWeight: number;
  embeddingLayer: number;
  setLayer: (l: number) => void;
  setHead: (h: number) => void;
  setMinWeight: (w: number) => void;
  setEmbeddingLayer: (l: number) => void;
  analyze: (sentence: string) => Promise<void>;
  analyzeImage: (image: string) => Promise<void>;
  tileView: boolean;
  setTileView: (v: boolean) => void;
}

export interface GenerationSlice {
  genStatus: GenStatus;
  genMeta: GenMeta | null;
  genFrames: TokenFrame[];
  genText: string;
  genError: string | null;
  genDone: GenDone | null;
  playIndex: number;
  isPlaying: boolean;
  setPlayIndex: (i: number) => void;
  stepPlay: (dir: 1 | -1) => void;
  togglePlay: () => void;
  replay: () => void;
  opIndex: number;
  opPlaying: boolean;
  followMode: boolean;
  userOrbiting: boolean;
  setUserOrbiting: (b: boolean) => void;
  view2D: boolean;
  playSpeed: number;
  autoStarted: boolean;
  setOpIndex: (i: number) => void;
  stepOp: (dir: 1 | -1) => void;
  toggleOpPlay: () => void;
  toggleFollow: () => void;
  toggleView2D: () => void;
  setPlaySpeed: (n: number) => void;
  setAutoStarted: (b: boolean) => void;
  skipToNextLayer: () => void;
  skipToNextToken: () => void;
}

export interface TraceSlice {
  traceSource: "live" | "file" | null;
  downloadTrace: () => Promise<void>;
  breakpoints: Set<number>;
  toggleBreakpoint: (opIndex: number) => void;
  lodLevel: number;
  setLodLevel: (n: number) => void;
  watches: { label: string; expr: string; value: unknown }[];
  addWatch: (label: string, expr: string) => void;
  removeWatch: (label: string) => void;
  evalWatches: () => void;
  sentinelScores: { layer: number; score: number; reason: string }[];
  computeSentinels: () => void;
  provenanceTrail: { opIndex: number; tensor: string; slice: string }[];
  setProvenanceTrail: (trail: { opIndex: number; tensor: string; slice: string }[]) => void;
  sourceSelectedTensor: string | null;
  setSourceSelectedTensor: (name: string | null) => void;
  debugSnapshots: Record<number, DebugSnapshot>;
  debugSnapshotLoading: boolean;
  debugSnapshotError: string | null;
  setDebugSnapshot: (opIndex: number, snap: DebugSnapshot) => void;
  setDebugSnapshotLoading: (b: boolean) => void;
  setDebugSnapshotError: (msg: string | null) => void;
  clearDebugSnapshots: () => void;
  annotations: TraceAnnotation[];
  addAnnotation: (ann: TraceAnnotation) => void;
  removeAnnotation: (id: string) => void;
  updateAnnotation: (id: string, text: string) => void;
}

export interface UISlice {
  mode: Mode;
  setMode: (m: Mode) => void;
  quality: "cinematic" | "performance";
  toggleQuality: () => void;
  muted: boolean;
  toggleMuted: () => void;
  showEquations: boolean;
  devMode: boolean;
  brightness: number;
  toggleEquations: () => void;
  toggleDevMode: () => void;
  setBrightness: (n: number) => void;
  wtChapter: number;
  wtModel: string;
  wtPlaying: boolean;
  setWtChapter: (i: number) => void;
  nextChapter: () => void;
  prevChapter: () => void;
  setWtModel: (id: string) => void;
  toggleWtPlay: () => void;
  embedMode: boolean;
  setEmbedMode: (b: boolean) => void;
  traceGalleryOpen: boolean;
  setTraceGalleryOpen: (b: boolean) => void;
  sonificationEnabled: boolean;
  toggleSonification: () => void;
  classroomMode: boolean;
  classroomPresenting: boolean;
  toggleClassroomMode: () => void;
}

export interface Arch3dSlice {
  graphViewMode: "full" | "single_layer" | "attention_flow" | "residual_stream" | "logit_lens" | "activations" | "token_flow";
  setGraphViewMode: (m: Arch3dSlice["graphViewMode"]) => void;
  selectedTokenIndex: number;
  setSelectedTokenIndex: (i: number) => void;
  expandedBlockId: string | null;
  setExpandedBlockId: (id: string | null) => void;
  cameraMode: "overview" | "layer" | "operation" | "token_follow";
  setCameraMode: (m: Arch3dSlice["cameraMode"]) => void;
  focusMode: boolean;
  toggleFocusMode: () => void;
  expandedLayer: number | null;
  setExpandedLayer: (l: number | null) => void;

  arch3dOpId: string;
  arch3dLayer: number;
  arch3dOpKind: string;
  arch3dPlaying: boolean;
  arch3dSpeed: number;
  selectArch3dOp: (opId: string) => void;
  stepArch3dOp: (dir: 1 | -1) => void;
  stepArch3dLayer: (dir: 1 | -1) => void;
  toggleArch3dPlay: () => void;
  setArch3dSpeed: (n: number) => void;

  inspectingComponentId: string | null;
  inspectPreviousCamera: { position: [number, number, number]; target: [number, number, number] } | null;
  inspectAutoRotate: boolean;
  enterInspectMode: (componentId: string) => void;
  exitInspectMode: () => void;
  toggleInspectAutoRotate: () => void;
  navigateInspectComponent: (dir: 1 | -1) => void;
}

export interface OrchestratorActions {
  loadGgufFile: (file: File) => Promise<void>;
  startGeneration: (prompt: string, opts?: GenOptions) => void;
  loadTrace: (file: File) => Promise<void>;
  classroomStep: () => void;
}

/** The complete Zustand store is the composition of its domain slices. */
export type StoreState = ArchitectureSlice & GenerationSlice & TraceSlice & UISlice & Arch3dSlice & OrchestratorActions;
