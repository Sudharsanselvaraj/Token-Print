import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCallout from "@/components/docs/DocsCallout";

export const metadata: Metadata = {
  title: "Model Explorer",
  description: "Architecture mode — tensor list, 3D point cloud, GGUF diff, and model info.",
};

export default function ModelExplorerPage() {
  return (
    <>
      <DocsBreadcrumb slug="using/model-explorer" title="Model Explorer" />
      <h1>Model Explorer</h1>
      <p className="docs-meta">Using TokenPrint</p>

      <p>
        <strong>Architecture mode</strong> (the default view) shows the complete tensor inventory
        of a model in a 3D point cloud. Each point is one tensor. The layout encodes layer depth
        on the Y-axis and tensor kind on the X-axis.
      </p>

      <hr />

      <h2 id="tensor-list">Tensor list</h2>

      <p>
        The right panel lists all tensors from <code>GET /architecture</code> —{" "}
        <strong>290 tensors</strong> for the reference model. For each tensor, the panel shows:
      </p>

      <ul>
        <li>Full tensor name (e.g., <code>model.layers.0.self_attn.q_proj.weight</code>)</li>
        <li>Shape (e.g., <code>[896, 896]</code>)</li>
        <li>Dtype (<code>float32</code>)</li>
        <li>Parameter count (e.g., <code>803,712</code>)</li>
      </ul>

      <p>
        Click any tensor in the list to focus the camera on the corresponding point in the 3D view.
      </p>

      <hr />

      <h2 id="gguf-diff">GGUF quantization diff</h2>

      <p>
        Drag two <code>.gguf</code> files onto the canvas to enter diff mode. The view shows the
        absolute difference in dequantized values between the two files, rendered as a histogram
        per tensor. This lets you compare quantization quality between different quant types
        (e.g., Q4_K vs Q8_0).
      </p>

      <DocsCallout variant="note">
        <p>
          Both files must be the same model architecture for the diff to be meaningful. The diff
          is computed client-side from real dequantized tensor values — no server required.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="model-info-pane">Model info pane</h2>

      <p>
        The model info section in the right panel shows metadata from{" "}
        <code>GET /model-info</code>:
      </p>

      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Value (reference model)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Model</td><td><code>Qwen/Qwen2.5-0.5B-Instruct</code></td></tr>
          <tr><td>Device</td><td><code>mps</code> / <code>cuda</code> / <code>cpu</code></td></tr>
          <tr><td>Layers</td><td>24</td></tr>
          <tr><td>Attention heads</td><td>14 Q / 2 KV</td></tr>
          <tr><td>Hidden size</td><td>896</td></tr>
          <tr><td>Max tokens</td><td>40</td></tr>
        </tbody>
      </table>

      <DocsPrevNext slug="using/model-explorer" />
    </>
  );
}
