export interface DocPage {
  title: string;
  slug: string; // relative to /docs/
}

export interface DocSection {
  label: string;
  pages: DocPage[];
}

export const DOC_SECTIONS: DocSection[] = [
  {
    label: "Getting Started",
    pages: [
      { title: "Introduction", slug: "introduction" },
      { title: "Research & Background", slug: "research" },
      { title: "Installation", slug: "installation" },
      { title: "Quick Start", slug: "quick-start" },
      { title: "Your First Trace", slug: "your-first-trace" },
      { title: "Loading a Model", slug: "loading-a-model" },
      { title: "Understanding the Interface", slug: "understanding-the-interface" },
    ],
  },
  {
    label: "Core Concepts",
    pages: [
      { title: "Tokens", slug: "concepts/tokens" },
      { title: "Embeddings", slug: "concepts/embeddings" },
      { title: "Transformer Layers", slug: "concepts/transformer-layers" },
      { title: "RMSNorm", slug: "concepts/rmsnorm" },
      { title: "Attention", slug: "concepts/attention" },
      { title: "Q / K / V", slug: "concepts/qkv" },
      { title: "Grouped Query Attention", slug: "concepts/gqa" },
      { title: "RoPE", slug: "concepts/rope" },
      { title: "Softmax", slug: "concepts/softmax" },
      { title: "MLP / SwiGLU", slug: "concepts/mlp-swiglu" },
      { title: "Residual Streams", slug: "concepts/residual-streams" },
      { title: "KV Cache", slug: "concepts/kv-cache" },
      { title: "Logits", slug: "concepts/logits" },
      { title: "Decoding Strategies", slug: "concepts/decoding" },
    ],
  },
  {
    label: "Using TokenPrint",
    pages: [
      { title: "Model Explorer", slug: "using/model-explorer" },
      { title: "3D Architecture", slug: "using/3d-architecture" },
      { title: "Camera System", slug: "using/camera-system" },
      { title: "Generation", slug: "using/generation" },
      { title: "Browser GPT-2", slug: "using/browser-inference" },
      { title: "Walkthrough", slug: "using/walkthrough" },
      { title: "Experiments", slug: "using/experiments" },
      { title: "Debugger", slug: "using/debugger" },
    ],
  },
  {
    label: "Reference",
    pages: [
      { title: "API Reference", slug: "api-reference" },
      { title: "Trace Schema", slug: "trace-schema" },
      { title: "Keyboard Shortcuts", slug: "keyboard-shortcuts" },
      { title: "Configuration", slug: "configuration" },
      { title: "Verification", slug: "verification" },
      { title: "Contributing", slug: "contributing" },
      { title: "Changelog", slug: "changelog" },
    ],
  },
];

/** Flat list of all pages in order, for prev/next navigation. */
export const ALL_DOC_PAGES: DocPage[] = DOC_SECTIONS.flatMap((s) => s.pages);

/** Find the section label for a given slug. */
export function getSectionForSlug(slug: string): string | undefined {
  return DOC_SECTIONS.find((s) => s.pages.some((p) => p.slug === slug))?.label;
}

/** Find a page by slug. */
export function getPageBySlug(slug: string): DocPage | undefined {
  return ALL_DOC_PAGES.find((p) => p.slug === slug);
}

/** Get prev and next pages for a slug. */
export function getPrevNext(slug: string): {
  prev: DocPage | null;
  next: DocPage | null;
} {
  const idx = ALL_DOC_PAGES.findIndex((p) => p.slug === slug);
  return {
    prev: idx > 0 ? ALL_DOC_PAGES[idx - 1] : null,
    next: idx < ALL_DOC_PAGES.length - 1 ? ALL_DOC_PAGES[idx + 1] : null,
  };
}
