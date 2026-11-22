export interface DocChildItem {
  title: string;
  slug: string;
}

export interface DocPage {
  title: string;
  slug: string; // relative to /docs/ or full slug
  icon?: string; // Phosphor icon identifier
  description?: string;
  children?: DocChildItem[];
}

export interface DocSection {
  label: string;
  id: string;
  pages: DocPage[];
}

/** Documentation navigation tree (Docs View) */
export const DOCS_SECTIONS: DocSection[] = [
  {
    label: "Getting started",
    id: "getting-started",
    pages: [
      {
        title: "Start Guide",
        slug: "introduction",
        icon: "Compass",
        description: "Overview of TokenPrint and the 3D transformer debugger.",
        children: [
          { title: "Concepts", slug: "concepts/tokens" },
          { title: "Install and run", slug: "installation" },
          { title: "Quick start", slug: "quick-start" },
          { title: "First trace", slug: "your-first-trace" },
        ],
      },
      {
        title: "Interface",
        slug: "understanding-the-interface",
        icon: "Sliders",
        description: "Navigating camera controls, viewport projections, and inspector panes.",
      },
    ],
  },
  {
    label: "Inspect",
    id: "inspect",
    pages: [
      {
        title: "Attention",
        slug: "concepts/attention",
        icon: "Graph",
        description: "Multi-head attention matrices and query-key dot products.",
        children: [
          { title: "Q / K / V", slug: "concepts/qkv" },
          { title: "Grouped query attention", slug: "concepts/gqa" },
          { title: "RoPE positional encoding", slug: "concepts/rope" },
          { title: "Softmax probabilities", slug: "concepts/softmax" },
        ],
      },
      {
        title: "Hidden states & logit lens",
        slug: "concepts/logits",
        icon: "Layers",
        description: "Layer-by-layer unembedding vocabulary projections and residual streams.",
        children: [
          { title: "RMSNorm normalization", slug: "concepts/rmsnorm" },
          { title: "MLP & SwiGLU activations", slug: "concepts/mlp-swiglu" },
          { title: "Residual stream trajectories", slug: "concepts/residual-streams" },
        ],
      },
      {
        title: "Token flow & generation",
        slug: "using/walkthrough",
        icon: "Lightning",
        description: "Autoregressive generation, step-by-step decoding, and KV cache growth.",
        children: [
          { title: "KV cache volume", slug: "concepts/kv-cache" },
          { title: "Decoding strategies", slug: "concepts/decoding" },
          { title: "Streaming generation view", slug: "using/generation" },
        ],
      },
      {
        title: "Ablation",
        slug: "using/debugger",
        icon: "Bug",
        description: "Zeroing attention heads and layers to measure degradation.",
      },
      {
        title: "Activation patching",
        slug: "using/experiments",
        icon: "GitFork",
        description: "Causal tracing by patching residual activations between prompts.",
      },
    ],
  },
  {
    label: "Models",
    id: "models",
    pages: [
      {
        title: "Supported models",
        slug: "loading-a-model",
        icon: "Cpu",
        description: "Qwen 2.5, Llama 3, Gemma 2, Mistral, and DeepSeek support.",
      },
      {
        title: "Compatibility matrix",
        slug: "compatibility-matrix",
        icon: "Table",
        description: "Six-stage verification status across all tested architectures.",
      },
      {
        title: "GGUF models",
        slug: "using/model-explorer",
        icon: "Cube",
        description: "Zero-install client-side quantized GGUF parsing and validation.",
      },
      {
        title: "Browser GPT-2",
        slug: "using/browser-inference",
        icon: "Browsers",
        description: "In-browser ONNX Runtime Web + WebGPU pipeline.",
      },
      {
        title: "Bring your own model",
        slug: "configuration",
        icon: "Gear",
        description: "Configuring Hugging Face Hub IDs and custom weight schemas.",
      },
    ],
  },
  {
    label: "Deploy",
    id: "deploy",
    pages: [
      {
        title: "Local launcher",
        slug: "installation",
        icon: "TerminalWindow",
        description: "Running Uvicorn backend + Next.js frontend via scripts/start.py.",
      },
      {
        title: "Hugging Face Spaces",
        slug: "architecture",
        icon: "Cloud",
        description: "ZeroGPU dynamic slicing container and automatic CPU failover.",
      },
      {
        title: "Verification suite",
        slug: "verification",
        icon: "ShieldCheck",
        description: "Zero-fake-data test harness and regression test contracts.",
      },
      {
        title: "Research & limits",
        slug: "research",
        icon: "BookOpen",
        description: "Mathematical formulations, context limits, and primary citations.",
      },
    ],
  },
  {
    label: "Reference",
    id: "reference",
    pages: [
      {
        title: "Keyboard shortcuts",
        slug: "keyboard-shortcuts",
        icon: "Command",
        description: "Navigation hotkeys, camera manipulation, and viewport switching.",
      },
      {
        title: "3D camera system",
        slug: "using/camera-system",
        icon: "Eye",
        description: "OrbitControls, frustum culling, and projection geometry.",
      },
      {
        title: "Trace schema",
        slug: "trace-schema",
        icon: "FileCode",
        description: "JSON specification for reproducible forward-pass recordings.",
      },
      {
        title: "Changelog",
        slug: "changelog",
        icon: "ClockCounterClockwise",
        description: "Release notes, bug fixes, and architecture upgrades.",
      },
    ],
  },
  {
    label: "Community",
    id: "community",
    pages: [
      {
        title: "Contributing",
        slug: "contributing",
        icon: "GitPullRequest",
        description: "Development workflow, pull request guidelines, and code of conduct.",
      },
    ],
  },
];

/** Developers navigation tree (Developers View) */
export const DEVELOPERS_SECTIONS: DocSection[] = [
  {
    label: "API Overview",
    id: "dev-api",
    pages: [
      {
        title: "Getting started",
        slug: "developers",
        icon: "TerminalWindow",
        description: "Quick start for TokenPrint REST and WebSocket APIs.",
      },
      {
        title: "API Reference",
        slug: "api-reference",
        icon: "FileCode",
        description: "Interactive OpenAPI documentation and cURL / Python code snippets.",
      },
    ],
  },
  {
    label: "Core Endpoints",
    id: "dev-endpoints",
    pages: [
      {
        title: "System & Health",
        slug: "api-reference#health",
        icon: "Activity",
        description: "GET /health, GET /model-info, GET /architecture.",
      },
      {
        title: "Forward Pass Analysis",
        slug: "api-reference#analyze",
        icon: "Graph",
        description: "POST /analyze, POST /rag/analyze, POST /debug/analyze.",
      },
      {
        title: "Interventions & Ablation",
        slug: "api-reference#ablate",
        icon: "Sliders",
        description: "POST /ablate/analyze, POST /patch/analyze.",
      },
      {
        title: "WebSocket Streaming",
        slug: "api-reference#streaming",
        icon: "Lightning",
        description: "WS /ws/generate, WS /ws/collab/{room_id}.",
      },
      {
        title: "GGUF Engine",
        slug: "api-reference#gguf",
        icon: "Cube",
        description: "GET /gguf/list, POST /gguf/upload, POST /gguf/open.",
      },
    ],
  },
  {
    label: "Schema & Contracts",
    id: "dev-schema",
    pages: [
      {
        title: "Trace Schema",
        slug: "trace-schema",
        icon: "FileText",
        description: "TokenPrint serialized trace specification and frame formats.",
      },
      {
        title: "OpenAPI Specification",
        slug: "openapi.json",
        icon: "DownloadSimple",
        description: "Complete OpenAPI 3.1.0 JSON definition file.",
      },
    ],
  },
];

/** Backward-compatible export alias for any legacy imports */
export const DOC_SECTIONS: DocSection[] = DOCS_SECTIONS;

/** All documentation pages across all views for flat traversal */
export const ALL_DOC_PAGES: DocPage[] = [
  ...DOCS_SECTIONS.flatMap((s) => s.pages),
  ...DOCS_SECTIONS.flatMap((s) =>
    s.pages.flatMap((p) =>
      p.children ? p.children.map((c) => ({ title: c.title, slug: c.slug, icon: p.icon })) : []
    )
  ),
  ...DEVELOPERS_SECTIONS.flatMap((s) => s.pages),
];

/** Find section for a given slug */
export function getSectionForSlug(slug: string, isDevelopers: boolean = false): string | undefined {
  const sections = isDevelopers ? DEVELOPERS_SECTIONS : DOCS_SECTIONS;
  const clean = slug.replace(/^\/docs\//, "").replace(/\/$/, "");
  for (const s of sections) {
    if (s.pages.some((p) => p.slug === clean || p.children?.some((c) => c.slug === clean))) {
      return s.label;
    }
  }
  return undefined;
}

/** Find page metadata by slug */
export function getPageBySlug(slug: string, isDevelopers: boolean = false): DocPage | undefined {
  const clean = slug.replace(/^\/docs\//, "").replace(/\/$/, "");
  const pages = isDevelopers
    ? DEVELOPERS_SECTIONS.flatMap((s) => s.pages)
    : DOCS_SECTIONS.flatMap((s) => s.pages);

  for (const p of pages) {
    if (p.slug === clean) return p;
    if (p.children) {
      const child = p.children.find((c) => c.slug === clean);
      if (child) return { title: child.title, slug: child.slug, icon: p.icon };
    }
  }
  return undefined;
}

/** Get previous and next pages for page navigation */
export function getPrevNext(slug: string, isDevelopers: boolean = false): {
  prev: DocPage | null;
  next: DocPage | null;
} {
  const clean = slug.replace(/^\/docs\//, "").replace(/\/$/, "");
  const list = isDevelopers
    ? DEVELOPERS_SECTIONS.flatMap((s) => s.pages)
    : DOCS_SECTIONS.flatMap((s) => [
        ...s.pages,
        ...(s.pages.flatMap((p) => p.children || []).map((c) => ({ title: c.title, slug: c.slug }))),
      ]);

  const idx = list.findIndex((p) => p.slug === clean);
  return {
    prev: idx > 0 ? list[idx - 1] : null,
    next: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null,
  };
}
