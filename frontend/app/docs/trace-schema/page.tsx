import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "Trace Schema",
  description: "JSON specification for recorded TokenPrint debug traces and execution snapshots.",
};

export default function TraceSchemaPage() {
  return (
    <>
      <DocsBreadcrumb slug="trace-schema" title="Trace Schema" />

      <h1>Trace Schema</h1>
      <p className="docs-meta">Reference</p>

      <p className="docs-intro">
        TokenPrint traces record complete forward-pass execution state, including layer activations,
        head-level attention matrices, KV cache shapes, and logit lens projections.
      </p>

      <hr />

      <h2 id="structure">Trace structure</h2>
      <p>
        Traces are serialized as versioned JSON objects (<code>.json</code> or <code>.tokenprint.json</code>).
        All tensor shapes are explicit and all numeric values match exact backend floating-point outputs.
      </p>

      <div className="docs-code-block">
        <div className="docs-code-header">
          <span className="docs-code-lang">json</span>
        </div>
        <pre className="docs-code-pre">
          <code>{`{
  "version": "1.0.0",
  "metadata": {
    "model_id": "Qwen/Qwen2.5-0.5B-Instruct",
    "prompt": "The cat sat on the mat.",
    "seq_len": 7,
    "timestamp": "2026-09-13T12:00:00Z"
  },
  "tensors": {
    "embed_tokens": { "shape": [7, 896], "dtype": "float32" },
    "layers.0.attn.q": { "shape": [7, 14, 64], "dtype": "float32" },
    "layers.0.attn.k": { "shape": [7, 2, 64], "dtype": "float32" },
    "layers.0.attn.v": { "shape": [7, 2, 64], "dtype": "float32" },
    "layers.0.attn.weights": { "shape": [14, 7, 7], "dtype": "float32" },
    "lm_head.logits": { "shape": [7, 151936], "dtype": "float32" }
  }
}`}</code>
        </pre>
      </div>

      <hr />

      <h2 id="field-definitions">Field definitions</h2>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>version</code></td>
            <td><code>string</code></td>
            <td>Schema specification version (currently 1.0.0).</td>
          </tr>
          <tr>
            <td><code>metadata.model_id</code></td>
            <td><code>string</code></td>
            <td>HuggingFace or local GGUF model identifier.</td>
          </tr>
          <tr>
            <td><code>metadata.seq_len</code></td>
            <td><code>integer</code></td>
            <td>Total sequence length of analyzed input.</td>
          </tr>
          <tr>
            <td><code>tensors</code></td>
            <td><code>object</code></td>
            <td>Dictionary of recorded activation tensors by standard PyTorch key.</td>
          </tr>
        </tbody>
      </table>

      <DocsPrevNext slug="trace-schema" />
    </>
  );
}
