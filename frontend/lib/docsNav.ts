export interface DocChildItem {
  title: string;
  slug: string;
}

export interface DocPage {
  title: string;
  slug: string; // relative to /docs/ or full slug
  icon?: string; // Lucide icon identifier
  description?: string;
  children?: DocChildItem[];
}

export interface DocSection {
  label: string;
  id: string;
  pages: DocPage[];
}

/** Complete 8-tier documentation navigation tree */
export const DOCS_SECTIONS: DocSection[] = [
  {
    label: "GETTING STARTED",
    id: "getting-started",
    pages: [
      {
        title: "Start Guide",
        slug: "introduction",
        icon: "BookOpen",
        description: "Overview of TokenPrint and the 3D transformer debugger.",
      },
      {
        title: "Concepts",
        slug: "concepts/tokens",
        icon: "Binary",
        description: "Core mechanistic interpretability principles and vocabulary tokens.",
      },
      {
        title: "Installation",
        slug: "installation",
        icon: "Terminal",
        description: "Local installation of Python backend and Next.js frontend.",
      },
      {
        title: "Quick Start",
        slug: "quick-start",
        icon: "Zap",
        description: "Launch your first real forward pass in under two minutes.",
      },
      {
        title: "First Trace",
        slug: "your-first-trace",
        icon: "Activity",
        description: "Record, serialize, and replay a live model execution trace.",
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
    label: "INSPECT",
    id: "inspect",
    pages: [
      {
        title: "Attention",
        slug: "concepts/attention",
        icon: "Network",
        description: "Multi-head attention matrices and query-key dot products.",
        children: [
          { title: "Q / K / V", slug: "concepts/qkv" },
          { title: "Grouped Query Attention", slug: "concepts/gqa" },
          { title: "RoPE", slug: "concepts/rope" },
          { title: "Softmax Probabilities", slug: "concepts/softmax" },
        ],
      },
      {
        title: "Hidden States",
        slug: "concepts/residual-streams",
        icon: "Layers",
        description: "Residual stream trajectories and inter-layer activations.",
        children: [
          { title: "Residual Streams", slug: "concepts/residual-streams" },
          { title: "RMSNorm", slug: "concepts/rmsnorm" },
          { title: "MLP & SwiGLU", slug: "concepts/mlp-swiglu" },
        ],
      },
      {
        title: "Logit Lens",
        slug: "concepts/logits",
        icon: "Eye",
        description: "Early vocabulary prediction readout across intermediate transformer layers.",
      },
    ],
  },
  {
    label: "EXPERIMENT",
    id: "experiment",
    pages: [
      {
        title: "Debugger",
        slug: "using/debugger",
        icon: "Bug",
        description: "Set activation breakpoints and zero self-attention heads.",
      },
      {
        title: "Activation Patching",
        slug: "using/experiments",
        icon: "FlaskConical",
        description: "Causal tracing by patching hidden state activations between prompts.",
      },
      {
        title: "Trace Schema",
        slug: "trace-schema",
        icon: "FileCode",
        description: "JSON specification for reproducible forward-pass recordings.",
      },
    ],
  },
  {
    label: "MODEL ECOSYSTEM",
    id: "model-ecosystem",
    pages: [
      {
        title: "Model Explorer",
        slug: "using/model-explorer",
        icon: "Boxes",
        description: "Client-side quantized GGUF parsing and metadata discovery.",
      },
      {
        title: "Supported Models",
        slug: "loading-a-model",
        icon: "Cpu",
        description: "Verified support for Qwen 2.5, Llama 3, Gemma 2, and Mistral.",
      },
      {
        title: "Compatibility Matrix",
        slug: "compatibility-matrix",
        icon: "Table",
        description: "Six-stage verification status across candidate architectures.",
      },
      {
        title: "Browser GPT-2",
        slug: "using/browser-inference",
        icon: "Server",
        description: "Client-side ONNX Runtime Web execution with WebGPU acceleration.",
      },
      {
        title: "Configuration",
        slug: "configuration",
        icon: "Sliders",
        description: "Configuring Hugging Face Hub IDs and custom weight schemas.",
      },
    ],
  },
  {
    label: "GENERATION",
    id: "generation",
    pages: [
      {
        title: "Walkthrough",
        slug: "using/walkthrough",
        icon: "Play",
        description: "Chaptered step-by-step transformer execution walkthrough.",
      },
      {
        title: "Text Generation",
        slug: "using/generation",
        icon: "Zap",
        description: "Real-time autoregressive streaming with top-k probability distributions.",
      },
      {
        title: "Decoding",
        slug: "concepts/decoding",
        icon: "Binary",
        description: "Greedy, temperature sampling, and nucleus top-p decoding.",
      },
      {
        title: "KV Cache",
        slug: "concepts/kv-cache",
        icon: "Database",
        description: "Visualizing key-value cache memory allocation across generation steps.",
      },
    ],
  },
  {
    label: "INTEGRATIONS",
    id: "integrations",
    pages: [
      {
        title: "Hugging Face Spaces",
        slug: "architecture",
        icon: "Server",
        description: "ZeroGPU dynamic slicing container and automatic CPU failover.",
      },
      {
        title: "Verification Suite",
        slug: "verification",
        icon: "Shield",
        description: "Zero-fake-data test harness and regression test contracts.",
      },
    ],
  },
  {
    label: "DEVELOPERS",
    id: "developers-section",
    pages: [
      {
        title: "Developers Overview",
        slug: "developers",
        icon: "Terminal",
        description: "Developer quick start for TokenPrint REST and WebSocket APIs.",
      },
      {
        title: "Architecture",
        slug: "architecture",
        icon: "Layers",
        description: "Comprehensive system topologies, ASGI container, and data flow.",
      },
      {
        title: "API Reference",
        slug: "api-reference",
        icon: "Code2",
        description: "FastAPI OpenAPI 3.1.0 interactive endpoint reference with code snippets.",
      },
      {
        title: "Contributing",
        slug: "contributing",
        icon: "GitBranch",
        description: "Development workflow, pull request guidelines, and code of conduct.",
      },
    ],
  },
  {
    label: "RESOURCES",
    id: "resources",
    pages: [
      {
        title: "Research & Citations",
        slug: "research",
        icon: "BookOpen",
        description: "Mathematical formulations, context limits, and primary citations.",
      },
      {
        title: "Keyboard Shortcuts",
        slug: "keyboard-shortcuts",
        icon: "Terminal",
        description: "Navigation hotkeys, camera manipulation, and viewport switching.",
      },
      {
        title: "3D Camera System",
        slug: "using/camera-system",
        icon: "Eye",
        description: "OrbitControls, frustum culling, and projection geometry.",
      },
      {
        title: "Changelog",
        slug: "changelog",
        icon: "Clock",
        description: "Release notes, bug fixes, and architecture upgrades.",
      },
    ],
  },
];

/** Backward compatibility aliases */
export const DOC_SECTIONS = DOCS_SECTIONS;
export const DEVELOPERS_SECTIONS = DOCS_SECTIONS.filter(s => s.id === "developers-section" || s.id === "integrations");

/** Flattened list of all pages for search indexing */
export const ALL_DOC_PAGES = DOCS_SECTIONS.flatMap((s) => [
  ...s.pages,
  ...s.pages.flatMap((p) =>
    p.children ? p.children.map((c) => ({ title: c.title, slug: c.slug, icon: p.icon })) : []
  ),
]);

export function getSectionForSlug(slug: string, _isDevelopers: boolean = false): string | undefined {
  const cleanSlug = slug.replace(/^\/docs\//, "").replace(/\/$/, "");
  for (const section of DOCS_SECTIONS) {
    if (section.pages.some((p) => p.slug === cleanSlug || p.children?.some((c) => c.slug === cleanSlug))) {
      return section.label;
    }
  }
  return undefined;
}

export function getPageBySlug(slug: string, _isDevelopers: boolean = false): DocPage | undefined {
  const cleanSlug = slug.replace(/^\/docs\//, "").replace(/\/$/, "");
  for (const section of DOCS_SECTIONS) {
    for (const p of section.pages) {
      if (p.slug === cleanSlug) return p;
      const child = p.children?.find((c) => c.slug === cleanSlug);
      if (child) return { title: child.title, slug: child.slug, icon: p.icon };
    }
  }
  return undefined;
}

export function getPrevNext(slug: string, _isDevelopers: boolean = false): {
  prev: { title: string; slug: string } | null;
  next: { title: string; slug: string } | null;
} {
  const cleanSlug = slug.replace(/^\/docs\//, "").replace(/\/$/, "");
  const all = DOCS_SECTIONS.flatMap((s) => [
    ...s.pages,
    ...(s.pages.flatMap((p) => p.children || []).map((c) => ({ title: c.title, slug: c.slug }))),
  ]);

  const idx = all.findIndex((p) => p.slug === cleanSlug);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? { title: all[idx - 1].title, slug: all[idx - 1].slug } : null,
    next: idx < all.length - 1 ? { title: all[idx + 1].title, slug: all[idx + 1].slug } : null,
  };
}
