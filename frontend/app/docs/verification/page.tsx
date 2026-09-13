import type { Metadata } from "next";
import Link from "next/link";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCallout from "@/components/docs/DocsCallout";
import DocsCode from "@/components/docs/DocsCode";

export const metadata: Metadata = {
  title: "Verification",
  description: "How TokenPrint's real-data guarantee is enforced and what the actual numbers are.",
};

export default function VerificationPage() {
  return (
    <>
      <DocsBreadcrumb slug="verification" title="Verification" />
      <h1>Verification</h1>
      <p className="docs-meta">Reference</p>

      <p>
        TokenPrint&apos;s core claim is that <strong>every number is real</strong>. This page
        documents exactly how that is checked, with the actual numbers observed on the reference
        model.
      </p>

      <DocsCallout variant="important">
        <p>
          This guarantee is enforced by the build, not by discipline. <code>npm run build</code>{" "}
          fails if <code>Math.random</code> is found in application code (outside of a narrow
          allowlist for genuine visual randomness). A fabricated value cannot reach a deployed page
          even from a local build.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="architecture-endpoint">Architecture endpoint is self-consistent</h2>

      <p>
        <code>GET /architecture</code> reports <code>total_params = 494,032,768</code>, which
        equals the sum of <code>n_params</code> across all <strong>290</strong> tensors exactly.
        Metadata (24 layers, 14 heads, 2 KV heads, head_dim 64, ffn 4864, vocab 151,936, context
        32,768) comes from the model <code>config</code> and <code>named_parameters()</code>.
      </p>

      <hr />

      <h2 id="attention-verification">Attention matches an independent forward pass</h2>

      <DocsCode lang="text" filename="backend/scripts/verify_real_data.py output" code={`Sentence: 'The cat sat on the mat.'   Tokens (7): The, cat, sat, on, the, mat, .
Attention tensor shape: (24, 14, 7, 7)
Max abs error vs independent forward pass: 0.00050        (just rounding)
Attention row sums: [1.0000, 1.0000]                      (valid softmax)
PASS: data is real.`} />

      <hr />

      <h2 id="geometry-verification">Embedding geometry is real and deterministic</h2>

      <p>
        <code>verify_geometry.py</code> projects real hidden states with PCA and checks
        determinism and clustering. For &ldquo;king queen man woman apple orange&rdquo;,{" "}
        <em>apple</em> and <em>orange</em> land almost on top of each other at the embedding layer,
        and the projection is identical across runs.
      </p>

      <hr />

      <h2 id="generation-verification">Generation op catalog is real and correctly ordered</h2>

      <DocsCode lang="text" filename="backend/scripts/verify_trace.py output" code={`total ops: 243
layer-0 op order: norm, attn.q, attn.k, attn.v, attention, attn.o, norm,
                  mlp.gate, mlp.up, mlp.down
q_proj L0: op=803,712  module=803,712  in=896 out=896 bias=896
final op: Vocabulary Unembedding · cumulative params used: 630,167,424
PASS: op catalog is real, ordered, and bounded.`} />

      <hr />

      <h2 id="kv-phases">KV-cache phases are mechanically real</h2>

      <DocsCode lang="text" code={`meta.uses_kv_cache = true
step 0  phase=prefill  n_positions=39  cache_len=0    -> token "Red"
step 1  phase=decode   n_positions=1   cache_len=39   -> token "<|im_end|>"`} />

      <hr />

      <h2 id="gguf-parser">GGUF parser matches the binary header</h2>

      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Architecture</th>
            <th>Parameters</th>
            <th>Tensors</th>
            <th>Quantization</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Qwen3 8B</td>
            <td><code>qwen3</code></td>
            <td>8.19B</td>
            <td>399</td>
            <td>Q4_K</td>
          </tr>
          <tr>
            <td>Llama 3.2 3B</td>
            <td><code>llama</code></td>
            <td>3.21B</td>
            <td>255</td>
            <td>Q4_K</td>
          </tr>
        </tbody>
      </table>

      <p>
        Tensor counts (399, 255) equal the <code>tensor_count</code> field in each file&apos;s
        binary header.
      </p>

      <hr />

      <h2 id="known-gaps">Known gaps</h2>

      <DocsCallout variant="warning">
        <p>Honesty requires listing where the claim does not yet fully hold:</p>
      </DocsCallout>

      <ul>
        <li>
          <strong>TimingReadout</strong> — shows real <code>perf_counter()</code> deltas but no
          device synchronize on MPS/CUDA. Labeled <code>PROXY · NOT MS</code> in the UI.{" "}
          <a href="https://github.com/Sudharsanselvaraj/Token-Print/issues/101" target="_blank" rel="noopener noreferrer">
            #101
          </a>
        </li>
        <li>
          <strong>ActivationPatchCompare</strong> — shows a logit-lens trajectory (correlational),
          not causal activation patching. The panel title is inaccurate.{" "}
          <a href="https://github.com/Sudharsanselvaraj/Token-Print/issues/75" target="_blank" rel="noopener noreferrer">
            #75
          </a>
        </li>
        <li>
          <strong>ResidualContributions</strong> — measures total residual change in PCA space,
          not attention vs. MLP decomposition. The label states this explicitly.
        </li>
      </ul>

      <DocsPrevNext slug="verification" />
    </>
  );
}
