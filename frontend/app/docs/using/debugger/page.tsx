import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCallout from "@/components/docs/DocsCallout";

export const metadata: Metadata = {
  title: "Debugger",
  description: "Debugger mode — breakpoints, flame graph, ablation, induction heads, and trace replay.",
};

export default function DebuggerPage() {
  return (
    <>
      <DocsBreadcrumb slug="using/debugger" title="Debugger" />
      <h1>Debugger</h1>
      <p className="docs-meta">Using TokenPrint</p>

      <p>
        Debugger mode is a tiled engineer dashboard for deep model inspection. It is organized into
        panels that can be rearranged. All data comes from real model calls to{" "}
        <code>/debug/*</code> and <code>/ablate/analyze</code>.
      </p>

      <hr />

      <h2 id="panels">Panels</h2>

      <table>
        <thead>
          <tr>
            <th>Panel</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Breakpoints</td>
            <td>Set layer/head breakpoints. Playback pauses when the specified component executes.</td>
          </tr>
          <tr>
            <td>Flame graph</td>
            <td>
              Per-op timing breakdown showing host-side execution times.{" "}
              <span className="docs-provenance">PROXY</span> label on MPS/CUDA (no device sync).
            </td>
          </tr>
          <tr>
            <td>Anomaly sentinels</td>
            <td>
              Automatic alerts for NaN, Inf, near-zero activations, and attention collapse
              patterns.
            </td>
          </tr>
          <tr>
            <td>Watch expressions</td>
            <td>Monitor specific tensor values across layers or steps.</td>
          </tr>
          <tr>
            <td>Layer table</td>
            <td>Per-layer summary: residual delta, norm magnitude, top attention weight.</td>
          </tr>
          <tr>
            <td>Head grid</td>
            <td>All 14 × all layers attention heatmaps in a compact grid view.</td>
          </tr>
          <tr>
            <td>Ablation</td>
            <td>
              Zero out a selected head or layer and compare before/after logit distributions.
              Uses <code>POST /ablate/analyze</code>.
            </td>
          </tr>
          <tr>
            <td>Induction-head lab</td>
            <td>
              Identifies candidate induction heads by their characteristic copy-suppression
              attention pattern.
            </td>
          </tr>
          <tr>
            <td>Trace replay</td>
            <td>
              Replay any saved trace. Branch from a replay to run a modified forward pass and
              compare the two traces side by side.
            </td>
          </tr>
          <tr>
            <td>Console REPL</td>
            <td>
              Send arbitrary commands to the debug API. Useful for extracting tensor values not
              exposed by the standard panels.
            </td>
          </tr>
          <tr>
            <td>Experiments</td>
            <td>
              Reproducible experiments — save, import, export, replay, and re-verify generation
              runs as portable JSON with a SHA-256 checksum. See{" "}
              <a href="/docs/using/experiments">Experiments</a>.
            </td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2 id="activation-patching">Activation patching</h2>

      <DocsCallout variant="warning">
        <p>
          The &ldquo;Activation Patching&rdquo; panel title is a known inaccuracy — the panel
          shows a logit-lens trajectory (a correlational measurement), not causal activation
          patching. Tracked in{" "}
          <a href="https://github.com/Sudharsanselvaraj/Token-Print/issues/75" target="_blank" rel="noopener noreferrer">
            issue #75
          </a>.
        </p>
      </DocsCallout>

      <DocsPrevNext slug="using/debugger" />
    </>
  );
}
