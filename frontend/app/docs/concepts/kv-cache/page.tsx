import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "KV Cache",
  description: "How the KV cache works in autoregressive generation and how TokenPrint exposes it.",
};

export default function KvCachePage() {
  return (
    <>
      <DocsBreadcrumb slug="concepts/kv-cache" title="KV Cache" />
      <h1>KV Cache</h1>
      <p className="docs-meta">Core Concepts</p>

      <p>
        During autoregressive generation, recomputing the Key and Value activations for all past
        tokens at each new step would be quadratic in the sequence length. The{" "}
        <strong>KV cache</strong> avoids this by storing the K and V activations from previous
        steps and reusing them.
      </p>

      <hr />

      <h2 id="prefill-vs-decode">Prefill vs. decode phases</h2>

      <p>
        TokenPrint&apos;s generation trace distinguishes two phases:
      </p>

      <table>
        <thead>
          <tr>
            <th>Phase</th>
            <th>What is computed</th>
            <th>Cache state</th>
            <th>Example (39-token prompt)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>prefill</code></td>
            <td>All prompt tokens in one parallel pass</td>
            <td>Built from scratch</td>
            <td>39 positions computed, <code>cache_len = 0</code></td>
          </tr>
          <tr>
            <td><code>decode</code></td>
            <td>One new token per step</td>
            <td>Previous KV pairs read from cache</td>
            <td>1 position computed, <code>cache_len = 39</code></td>
          </tr>
        </tbody>
      </table>

      <p>
        These are real phases from the actual PyTorch forward pass, not a simulation. The backend
        threads real <code>past_key_values</code> through the model loop.
      </p>

      <hr />

      <h2 id="cache-size">Cache size</h2>

      <p>
        For each layer, the cache stores K and V tensors for the 2 KV heads at each past position.
        At position <em>n</em>, cache size per layer is:
      </p>

      <pre className="docs-equation">{`cache_per_layer = n_kv_heads * head_dim * n_past_tokens * dtype_bytes
                = 2 * 64 * n * 4       (float32)
                = 512 * n bytes`}</pre>

      <p>
        For 24 layers and a 32,768-token context: approximately{" "}
        <strong>384 MB</strong> at float32.
      </p>

      <hr />

      <h2 id="tokenprint-visualization">TokenPrint visualization</h2>

      <p>
        In Generation mode, the KV cache is rendered as a spatial occupancy structure in the 3D
        scene. Filled cells indicate cached positions; the boundary between prefill and decode is
        visible as the cache grows token by token. The transport bar shows the current{" "}
        <code>cache_len</code> and <code>n_positions</code> from the real trace metadata.
      </p>

      <DocsPrevNext slug="concepts/kv-cache" />
    </>
  );
}
