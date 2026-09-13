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
        <li>27 pages across 5 sections: Getting Started, Core Concepts, Using TokenPrint, API Reference, Reference.</li>
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
