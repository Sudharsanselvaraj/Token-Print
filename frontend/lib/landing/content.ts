export interface PinnedStoryStep {
  id: string;
  num: string;
  label: string;
  title: string;
  description: string;
  points: { iconName: string; text: string }[];
}

export interface FeatureGridItem {
  id: string;
  indexStr: string;
  title: string;
  copy: string;
  screenshot: string;
  link: string;
  isLarge?: boolean;
}

export const ECOSYSTEM_LOGOS = [
  { name: "HUGGING FACE" },
  { name: "PYTORCH" },
  { name: "TRANSFORMERS" },
  { name: "GGUF" },
  { name: "LLAMA.CPP" },
  { name: "FASTAPI" },
  { name: "NEXT.JS" },
  { name: "REACT THREE FIBER" },
  { name: "THREE.JS" },
  { name: "GITHUB" },
];

export const PINNED_STORY_STEPS: PinnedStoryStep[] = [
  {
    id: "tokenization",
    num: "01",
    label: "TOKENIZATION",
    title: "Discrete Token Vocabulary Mapping",
    description:
      "Integer token IDs extracted from raw text input are indexed into vocabulary matrices with zero string abstractions.",
    points: [
      { iconName: "Hash", text: "Exact byte-pair encoding (BPE) vocabulary lookup" },
      { iconName: "Sliders", text: "Sub-token segmentation boundary tracking" },
      { iconName: "Cpu", text: "Real-time context window position indexing" },
    ],
  },
  {
    id: "embedding",
    num: "02",
    label: "EMBEDDING",
    title: "High-Dimensional Vector Projection",
    description:
      "Token IDs project into high-dimensional hidden representations combined with Rotary Position Embeddings (RoPE).",
    points: [
      { iconName: "Layers", text: "Hidden dimension d_model vector representation" },
      { iconName: "RotateCcw", text: "Rotary positional embedding (RoPE) angle phase" },
      { iconName: "ScanLine", text: "RMSNorm pre-layer activation scaling" },
    ],
  },
  {
    id: "attention",
    num: "03",
    label: "ATTENTION",
    title: "Multi-Head Q/K/V Attention Mass",
    description:
      "Query, Key, and Value projections undergo scaled dot-product attention mass distribution across parallel heads.",
    points: [
      { iconName: "Eye", text: "Query · Key interaction dot-product matrix" },
      { iconName: "Network", text: "Grouped Query Attention (GQA) key-value head routing" },
      { iconName: "TrendingUp", text: "Causal attention mask enforcement" },
    ],
  },
  {
    id: "mlp",
    num: "04",
    label: "MLP",
    title: "SwiGLU Feed-Forward Transformation",
    description:
      "Dual projection paths pass through SILU activation and elementwise multiplication before residual stream accumulation.",
    points: [
      { iconName: "GitBranch", text: "Gate and Up projection parallel matrix multiplication" },
      { iconName: "Zap", text: "SwiGLU activation non-linearity mapping" },
      { iconName: "GitMerge", text: "Down projection residual stream addition" },
    ],
  },
  {
    id: "generation",
    num: "05",
    label: "GENERATION",
    title: "Autoregressive Sampling & Logits",
    description:
      "Final layer norm maps into vocabulary logits, applying temperature, top-p, and top-k sampling for next token prediction.",
    points: [
      { iconName: "BarChart2", text: "Unnormalized logit score distribution" },
      { iconName: "Shuffle", text: "Seeded temperature & top-p probability sampling" },
      { iconName: "Database", text: "KV cache append for next autoregressive step" },
    ],
  },
];

export const FEATURE_GRID_ITEMS: FeatureGridItem[] = [
  {
    id: "architecture",
    indexStr: "01",
    title: "Architecture Graph & Precision",
    copy: "Inspect every layer, head count, hidden dimension, and tensor memory footprint with exact parameter precision.",
    screenshot: "/screenshots/architecture.png",
    link: "/app?mode=explorer",
    isLarge: true,
  },
  {
    id: "generation",
    indexStr: "02",
    title: "Autoregressive 3D Generation",
    copy: "Watch token-by-token generation unfold live in 3D, tracing hidden embeddings through each layer block.",
    screenshot: "/screenshots/generation.png",
    link: "/app?mode=generation",
  },
  {
    id: "walkthrough",
    indexStr: "03",
    title: "Forward-Pass Walkthrough",
    copy: "Step chapter-by-chapter through the entire computational pipeline — from discrete tokens to output logits.",
    screenshot: "/screenshots/walkthrough.png",
    link: "/app?mode=walkthrough",
  },
  {
    id: "debugger",
    indexStr: "04",
    title: "Breakpoints & Layer Inspection",
    copy: "Pause execution at any transformer layer to probe activation norms, QKV projections, and KV cache states.",
    screenshot: "/screenshots/debugger.png",
    link: "/app?mode=debugger",
    isLarge: true,
  },
];

export const SCIENTIFIC_TRUST_CONCEPTS = [
  {
    title: "TENSOR SHAPES",
    desc: "Parsed directly from GGUF and Hugging Face model headers — no hardcoded dummy shapes.",
  },
  {
    title: "PARAMETERS",
    desc: "Exact weight parameters and quantization float precision computed directly from weight files.",
  },
  {
    title: "ATTENTION",
    desc: "True Q/K/V matrix multiplications and head attribution values rendered live during execution.",
  },
  {
    title: "KV CACHE",
    desc: "State-machine level visibility into accepted, rejected, and recomputed key-value pairs.",
  },
];
