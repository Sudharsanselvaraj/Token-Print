import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "Q / K / V",
  description: "Query, Key, and Value projections — shapes, heads, and scaling.",
};

export default function QkvPage() {
  return (
    <>
      <DocsBreadcrumb slug="concepts/qkv" title="Q / K / V" />
      <h1>Q / K / V</h1>
      <p className="docs-meta">Core Concepts</p>

      <p>
        Inside each attention layer, the normalized residual stream is projected into three separate
        matrices — <strong>Query (Q)</strong>, <strong>Key (K)</strong>, and{" "}
        <strong>Value (V)</strong> — each with its own learned weight matrix. These projections are
        the input to the attention computation.
      </p>

      <hr />

      <h2 id="projections">Projections</h2>

      <table>
        <thead>
          <tr>
            <th>Projection</th>
            <th>Weight shape</th>
            <th>Output shape (7-token input)</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Q</td>
            <td><code>[896, 896]</code></td>
            <td><code>[7, 896]</code></td>
            <td>What this token is looking for</td>
          </tr>
          <tr>
            <td>K</td>
            <td><code>[128, 896]</code></td>
            <td><code>[7, 128]</code></td>
            <td>What this token offers to be found by</td>
          </tr>
          <tr>
            <td>V</td>
            <td><code>[128, 896]</code></td>
            <td><code>[7, 128]</code></td>
            <td>The information to extract if attended to</td>
          </tr>
        </tbody>
      </table>

      <p>
        Notice that K and V have much smaller weight matrices than Q. This is because Qwen2.5 uses{" "}
        <a href="/docs/concepts/gqa">Grouped Query Attention (GQA)</a> with only 2 KV heads
        compared to 14 Q heads — the K and V projections are shared across groups of Q heads.
      </p>

      <hr />

      <h2 id="splitting-heads">Splitting into heads</h2>

      <p>
        After the projection, each matrix is split into individual heads by reshaping:
      </p>

      <pre className="docs-equation">{`Q: [T, d_model] -> [T, n_heads, head_dim]  = [7, 14, 64]
K: [T, d_kv]    -> [T, n_kv_heads, head_dim] = [7, 2, 64]
V: [T, d_kv]    -> [T, n_kv_heads, head_dim] = [7, 2, 64]`}</pre>

      <p>
        Each head operates independently on its own 64-dimensional slice. RoPE is then applied to
        Q and K within each head before the attention computation.
      </p>

      <hr />

      <h2 id="scaling">Scaling factor</h2>

      <p>
        Before the softmax, the dot products <code>Q @ K^T</code> are divided by{" "}
        <code>sqrt(head_dim) = sqrt(64) = 8.0</code>. Without this scaling, large head dimensions
        would push dot products into regions where the softmax gradient vanishes (the
        &ldquo;attention collapse&rdquo; problem).
      </p>

      <DocsPrevNext slug="concepts/qkv" />
    </>
  );
}
