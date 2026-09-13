import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "3D Architecture",
  description: "The 3D canvas — district geometry, camera controls, and scene districts.",
};

export default function ThreeDArchitecturePage() {
  return (
    <>
      <DocsBreadcrumb slug="using/3d-architecture" title="3D Architecture" />
      <h1>3D Architecture</h1>
      <p className="docs-meta">Using TokenPrint</p>

      <p>
        The 3D canvas renders a faithful geometric model of the transformer&apos;s structure.
        Every dimension, ratio, and component count reflects the actual model configuration — not
        a schematic.
      </p>

      <hr />

      <h2 id="geometry-mapping">Geometry mapping</h2>

      <table>
        <thead>
          <tr>
            <th>Model property</th>
            <th>3D geometry</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Layer count (24)</td>
            <td>Stack height — 24 horizontal slices</td>
          </tr>
          <tr>
            <td>Q heads (14) / KV heads (2)</td>
            <td>14 Q blades, 2 KV groups in the attention district</td>
          </tr>
          <tr>
            <td>FFN expansion (4864/896 = 5.43×)</td>
            <td>SwiGLU funnel width proportional to expansion ratio</td>
          </tr>
          <tr>
            <td>Hidden size (896)</td>
            <td>Spine diameter encoding</td>
          </tr>
          <tr>
            <td>RMSNorm (not LayerNorm)</td>
            <td>Collar geometry (ring only, no double-ring)</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2 id="scene-districts">Scene districts</h2>

      <p>
        The scene is organized into <strong>districts</strong>, each rendered by a dedicated
        React Three Fiber component:
      </p>

      <ul>
        <li>
          <strong>EmbeddingDistrict</strong> — the embedding lookup layer at the bottom of the stack,
          showing the PCA-projected token embedding cloud.
        </li>
        <li>
          <strong>AttentionDistrict</strong> — the GQA blade structure and attention heatmap
          for the selected layer.
        </li>
        <li>
          <strong>TokenizerDistrict</strong> — the tokenization visualization with colored token chips.
        </li>
        <li>
          <strong>TransformerStack</strong> — the full 24-layer spine with all sub-components.
        </li>
      </ul>

      <hr />

      <h2 id="camera">Camera</h2>

      <p>
        The camera uses an orbit controller with a configurable target. In Generation mode,
        &ldquo;follow mode&rdquo; automatically recenters the camera on the currently active
        operation. In Walkthrough mode, each chapter has a preset camera position and target
        optimized for that chapter&apos;s geometry.
      </p>

      <DocsPrevNext slug="using/3d-architecture" />
    </>
  );
}
