import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "Attention",
  description: "Self-attention mechanism, masked attention, and how TokenPrint visualizes attention weights.",
};

export default function AttentionPage() {
  return (
    <>
      <DocsBreadcrumb slug="concepts/attention" title="Attention" />
      <h1>Attention</h1>
      <p className="docs-meta">Core Concepts</p>

      <p>
        <strong>Self-attention</strong> allows each token in a sequence to gather information from
        every other token. The result is that each token&apos;s representation is updated based on
        how much it &ldquo;attends&rdquo; to every other position.
      </p>

      <hr />

      <h2 id="mechanism">Mechanism</h2>

      <pre className="docs-equation">{`Attention(Q, K, V) = softmax( Q K^T / sqrt(head_dim) ) V

where:
  Q  = query matrix  [T, n_heads * head_dim]
  K  = key matrix    [T, n_kv_heads * head_dim]
  V  = value matrix  [T, n_kv_heads * head_dim]
  T  = sequence length
  head_dim = 64 (for Qwen2.5-0.5B)`}</pre>

      <p>
        The softmax ensures each row of the attention weight matrix sums to 1 — every token
        distributes 100% of its attention across all positions.
      </p>

      <hr />

      <h2 id="causal-masking">Causal masking</h2>

      <p>
        Decoder-only models like Qwen2.5 apply a <strong>causal mask</strong>: token at position{" "}
        <em>i</em> can only attend to positions 0 through <em>i</em>. Future tokens are masked to
        negative infinity before the softmax, so they receive zero attention weight. This ensures
        the model is autoregressive — it cannot look ahead.
      </p>

      <hr />

      <h2 id="real-numbers">Real numbers (Qwen2.5-0.5B, &ldquo;The cat sat on the mat.&rdquo;)</h2>

      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Attention tensor shape</td>
            <td><code>[24, 14, 7, 7]</code> — (layers, heads, seq, seq)</td>
          </tr>
          <tr>
            <td>Attention row sums</td>
            <td>1.0000 (valid softmax)</td>
          </tr>
          <tr>
            <td>Max abs error vs independent forward pass</td>
            <td>0.00050 (floating-point rounding only)</td>
          </tr>
          <tr>
            <td>Strongest link (layer 0, head 0)</td>
            <td>&ldquo;cat&rdquo; attends to &ldquo;The&rdquo; with weight <strong>0.864</strong></td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2 id="tokenprint-visualization">TokenPrint visualization</h2>

      <p>
        In the Walkthrough Self-Attention chapter, the attention weight matrix for the example
        sentence is rendered as a heatmap. The strongest attention link is highlighted and labeled
        with the real weight value. You can select individual heads using the head grid controls.
      </p>

      <p>
        In Generation mode, the active head&apos;s attention weights animate as each token is
        produced, showing where the model is focusing to make each prediction.
      </p>

      <DocsPrevNext slug="concepts/attention" />
    </>
  );
}
