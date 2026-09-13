import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "RMSNorm",
  description: "Root Mean Square normalization — formula, role, and real numbers from TokenPrint.",
};

export default function RmsNormPage() {
  return (
    <>
      <DocsBreadcrumb slug="concepts/rmsnorm" title="RMSNorm" />
      <h1>RMSNorm</h1>
      <p className="docs-meta">Core Concepts</p>

      <p>
        <strong>Root Mean Square Layer Normalization (RMSNorm)</strong> is the normalization
        operation used in Qwen2.5 and most modern transformer architectures. It stabilizes
        activations before attention and MLP sub-blocks.
      </p>

      <hr />

      <h2 id="formula">Formula</h2>

      <pre className="docs-equation">{`RMSNorm(x) = x / RMS(x) * gamma

where:
  RMS(x) = sqrt( (1/d) * sum(x_i^2) )
  gamma   = learned scale vector  [shape: d_model]
  d       = hidden_size = 896`}</pre>

      <p>
        Unlike LayerNorm, RMSNorm does not subtract the mean and has no learned bias term. It only
        re-scales the input so its root-mean-square equals 1, then applies the learned{" "}
        <code>gamma</code> scale.
      </p>

      <hr />

      <h2 id="where-it-appears">Where it appears</h2>

      <p>Each transformer layer has two RMSNorm operations:</p>

      <ul>
        <li>
          <strong>Input norm</strong> (<code>input_layernorm</code>) — applied to the residual
          stream before the attention sub-block.
        </li>
        <li>
          <strong>Post-attention norm</strong> (<code>post_attention_layernorm</code>) — applied to
          the residual stream before the MLP sub-block.
        </li>
      </ul>

      <p>
        There is also a final <strong>model norm</strong> (<code>model.norm</code>) applied to the
        residual stream after all 24 layers, before the unembedding step.
      </p>

      <hr />

      <h2 id="real-numbers">Real numbers (Qwen2.5-0.5B-Instruct, layer 0)</h2>

      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Tensor</td>
            <td><code>model.layers.0.input_layernorm.weight</code></td>
          </tr>
          <tr>
            <td>Shape</td>
            <td><code>[896]</code></td>
          </tr>
          <tr>
            <td>Parameters</td>
            <td>896</td>
          </tr>
          <tr>
            <td>Gamma range (observed)</td>
            <td>approximately 0.1 – 2.0</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2 id="tokenprint-visualization">TokenPrint visualization</h2>

      <p>
        In the 3D view, RMSNorm operations are rendered as narrow cylindrical collars around the
        transformer spine. In the Walkthrough RMSNorm chapter, the worked formula is displayed with
        real input values and real gamma weights for the example sentence.
      </p>

      <DocsPrevNext slug="concepts/rmsnorm" />
    </>
  );
}
