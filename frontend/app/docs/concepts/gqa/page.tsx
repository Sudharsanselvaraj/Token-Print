import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "Grouped Query Attention",
  description: "GQA — how Qwen2.5 uses 2 KV heads to serve 14 Q heads.",
};

export default function GqaPage() {
  return (
    <>
      <DocsBreadcrumb slug="concepts/gqa" title="Grouped Query Attention" />
      <h1>Grouped Query Attention</h1>
      <p className="docs-meta">Core Concepts</p>

      <p>
        <strong>Grouped Query Attention (GQA)</strong> reduces the memory cost of the KV cache by
        sharing Key and Value heads across groups of Query heads. Qwen2.5-0.5B uses{" "}
        <strong>14 Q heads and 2 KV heads</strong> — each KV head is shared by 7 Q heads.
      </p>

      <hr />

      <h2 id="motivation">Motivation</h2>

      <p>
        In standard multi-head attention (MHA), every Q head has its own K and V head. During
        autoregressive decoding, the KV cache must store the K and V activations for every head at
        every layer at every past position. With GQA, only the KV heads are stored, reducing the
        cache size by a factor of <code>n_heads / n_kv_heads = 14 / 2 = 7</code>.
      </p>

      <hr />

      <h2 id="topology">Topology (Qwen2.5-0.5B)</h2>

      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Q heads (<code>num_heads</code>)</td><td>14</td></tr>
          <tr><td>KV heads (<code>num_kv_heads</code>)</td><td>2</td></tr>
          <tr><td>Head dimension</td><td>64</td></tr>
          <tr><td>Group size (Q per KV)</td><td>7</td></tr>
          <tr><td>Q projection shape</td><td><code>[896, 896]</code></td></tr>
          <tr><td>K projection shape</td><td><code>[128, 896]</code></td></tr>
          <tr><td>V projection shape</td><td><code>[128, 896]</code></td></tr>
        </tbody>
      </table>

      <p>
        During the attention computation, each K and V head is expanded (repeated) 7 times before
        the dot product, so the shapes become compatible:
      </p>

      <pre className="docs-equation">{`Q: [T, 14, 64]  (14 independent heads)
K: [T, 2, 64]   -> expand -> [T, 14, 64]
V: [T, 2, 64]   -> expand -> [T, 14, 64]`}</pre>

      <hr />

      <h2 id="tokenprint-visualization">TokenPrint visualization</h2>

      <p>
        In the 3D model, the GQA structure is visible in the attention geometry: 14 Q blades
        arranged in a fan, with 2 KV groups clearly differentiated by their reduced geometry. In
        the Self-Attention chapter of the Walkthrough, each head&apos;s attention heatmap can be
        selected individually to see how the 14 independent Q heads attend differently despite
        sharing K and V.
      </p>

      <DocsPrevNext slug="concepts/gqa" />
    </>
  );
}
