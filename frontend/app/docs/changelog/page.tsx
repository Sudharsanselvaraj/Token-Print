import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "Changelog",
  description: "TokenPrint release history and notable changes.",
};

export default function ChangelogPage() {
  return (
    <>
      <DocsBreadcrumb slug="changelog" title="Changelog" />
      <h1>Changelog</h1>
      <p className="docs-meta">Reference</p>

      <p>
        Notable changes by release. Full commit history is available on{" "}
        <a href="https://github.com/Sudharsanselvaraj/Token-Print/commits/main" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>.
      </p>

      <hr />

      <h2 id="current">Current — September 2026</h2>

      <h3 id="browser-inference">In-browser GPT-2 inference</h3>
      <ul>
        <li>
          <strong>Browser GPT-2</strong> runs real generation fully client-side via WebGPU or CPU
          (WASM) using the pinned <code>Xenova/gpt2</code> model (Transformers.js 3.8.1) — no
          backend required.
        </li>
        <li>
          Greedy decoding only; at most 32 new tokens and 128 total; ~500 MB cached download.
          Verified against an independent ONNX CPU session (probability error below 1e-4).
        </li>
        <li>
          The frame-producing seam means replay, browser, and backend sources are interchangeable
          without store changes.
        </li>
      </ul>

      <h3 id="experiments">Reproducible experiments &amp; guided replay</h3>
      <ul>
        <li>
          <strong>Experiments</strong> panel in Debugger mode — save, import, export, replay, and
          re-verify generation runs as portable JSON with a SHA-256 checksum.
        </li>
        <li>
          <strong>Guided replay</strong> — a 3-step recorded-replay tour (<code>?tour=1</code>)
          that walks through a stored trace without re-inferring.
        </li>
        <li>
          Verification tolerance 1e-4; traces carry <code>trace_version: 1</code> and unknown
          versions are rejected, never mis-read.
        </li>
      </ul>

      <h3 id="camera">Unified camera system</h3>
      <ul>
        <li>
          Single camera bar across all four modes: overview, layer focus, op focus, follow mode,
          3D/2D toggle, and trace access.
        </li>
        <li>
          Walkthrough chapters use dedicated cinematic camera presets driven by real values
          (normalization magnitude, top-1 probability).
        </li>
        <li>
          Desktop gate (<code>&lt; 1024 px</code>) guides small screens to a desktop-required screen.
        </li>
      </ul>

      <h3 id="gguf-engine">Server-side GGUF engine</h3>
      <ul>
        <li>
          New <code>/gguf/*</code> runtime: <code>list</code>, <code>upload</code>,{" "}
          <code>open</code>, <code>unload</code>, and <code>cache</code>.
        </li>
        <li>
          Resident engines are held in an <strong>LRU cache</strong> (
          <code>MAX_GGUF_ENGINES</code>, default 2) with explicit unload and memory reclamation.
        </li>
      </ul>

      <h3 id="model-pinning">Revision pinning &amp; curation</h3>
      <ul>
        <li>
          Backend pins to the resolved Hugging Face commit SHA (<code>TOKENPRINT_REVISION</code>);
          the HF model explorer now fetches config at the model&apos;s actual revision instead of a
          hardcoded <code>main</code>.
        </li>
        <li>
          Modal-over-scene layering contract (<code>lib/layers.ts</code>) — scene labels stay
          clamped below a single portal-mounted modal root.
        </li>
      </ul>

      <h3 id="data-fidelity-audit">Data fidelity audit and remediation</h3>
      <ul>
        <li>
          <strong>LoraDeltaViz</strong> — weight delta is now the real sampled mean-absolute-
          difference from the quant-diff path. Previously computed from a hash of the tensor name.
        </li>
        <li>
          <strong>ResidualContributions</strong> — now measures real PCA-space residual deltas per
          layer. Previously used <code>Math.random()</code> magnitudes.
        </li>
        <li>
          <strong>ActivationPatchCompare</strong> — wired to real logit-lens trajectory. Previously
          added <code>(Math.random() - 0.5) * shift</code> to produce &ldquo;patched&rdquo; output.
        </li>
        <li>
          <strong>NumberProvenance</strong> — hardcoded <code>0.42</code> / <code>0.87</code> values
          removed. Panel now states that real values require <code>GET /debug/tensor</code>.
        </li>
        <li>
          Added <code>frontend/scripts/verify-data.sh</code> wired into <code>npm run build</code>
          to prevent regressions.
        </li>
      </ul>

      <h3 id="walkthrough-differentiation">Walkthrough chapter differentiation</h3>
      <ul>
        <li>Each of the 7 chapters now has a distinct chapter-specific 3D visual.</li>
        <li>Tokenization chapter: real vocabulary ID chips per token.</li>
        <li>Self-Attention chapter: live attention heatmap with head selector.</li>
        <li>Softmax &amp; Output chapter: top-k probability bar chart from real logit lens, prediction game.</li>
      </ul>

      <h3 id="modals-redesign">Modals redesign</h3>
      <ul>
        <li>HuggingFace Model Explorer modal — monochrome redesign, verified model data.</li>
        <li>Plugin Manager modal — functional plugin list with toggle controls.</li>
        <li>Settings modal — aligned to app design system.</li>
      </ul>

      <h3 id="docs-system">Documentation system</h3>
      <ul>
        <li>New <code>/docs</code> route with full product documentation.</li>
        <li>
          Pages across 4 sections: Getting Started, Core Concepts (incl. Decoding Strategies),
          Using TokenPrint (incl. Browser GPT-2, Camera System, Experiments), and Reference.
        </li>
        <li>Persistent left sidebar navigation, right-side section anchors, prev/next navigation.</li>
        <li>All content verified against real model data.</li>
      </ul>

      <hr />

      <h2 id="earlier">Earlier</h2>

      <p>
        See the{" "}
        <a href="https://github.com/Sudharsanselvaraj/Token-Print/blob/main/ROADMAP.md" target="_blank" rel="noopener noreferrer">
          ROADMAP.md
        </a>{" "}
        for the full phased engineering history and planned features.
      </p>

      <DocsPrevNext slug="changelog" />
    </>
  );
}
