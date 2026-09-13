import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "MLP / SwiGLU",
  description: "The MLP sub-block with SwiGLU activation — formula, shapes, and 3D visualization.",
};

export default function MlpSwigluPage() {
  return (
    <>
      <DocsBreadcrumb slug="concepts/mlp-swiglu" title="MLP / SwiGLU" />
      <h1>MLP / SwiGLU</h1>
      <p className="docs-meta">Core Concepts</p>

      <p>
        After the attention sub-block, each transformer layer applies a <strong>feed-forward MLP</strong>.
        Qwen2.5 uses <strong>SwiGLU</strong>, a gated activation function that produces stronger
        representations than a simple two-layer MLP.
      </p>

      <hr />

      <h2 id="swiglu-formula">SwiGLU formula</h2>

      <pre className="docs-equation">{`MLP(x) = down_proj( SiLU(gate_proj(x)) * up_proj(x) )

where:
  gate_proj: [896, 4864]    (hidden_size -> ffn_size)
  up_proj:   [896, 4864]    (hidden_size -> ffn_size)
  down_proj: [4864, 896]    (ffn_size -> hidden_size)

SiLU(x) = x * sigmoid(x)   (Swish activation)`}</pre>

      <p>
        The gate projection produces the gate signal; the up projection produces the candidate
        values. Element-wise multiplication after the SiLU gate selects which values pass through.
        The down projection compresses back to the residual stream dimension.
      </p>

      <hr />

      <h2 id="ffn-expansion">FFN expansion ratio</h2>

      <p>
        The intermediate dimension is <strong>4,864</strong>, giving an expansion ratio of
        4864 / 896 ≈ <strong>5.43×</strong>. This is sized to the actual FFN dimension in the
        model config, not a rounded approximation.
      </p>

      <table>
        <thead>
          <tr>
            <th>Projection</th>
            <th>Shape</th>
            <th>Parameters (per layer)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>gate_proj</code></td>
            <td><code>[4864, 896]</code></td>
            <td>4,358,144</td>
          </tr>
          <tr>
            <td><code>up_proj</code></td>
            <td><code>[4864, 896]</code></td>
            <td>4,358,144</td>
          </tr>
          <tr>
            <td><code>down_proj</code></td>
            <td><code>[896, 4864]</code></td>
            <td>4,358,144</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2 id="tokenprint-visualization">TokenPrint visualization</h2>

      <p>
        The MLP sub-block is rendered as a tapered funnel shape in the 3D model. Three labeled
        prongs represent the gate, up, and down projections. The Walkthrough MLP chapter shows the
        SwiGLU formula with the real intermediate dimensions annotated and the gate vs. up
        projections distinguished geometrically.
      </p>

      <DocsPrevNext slug="concepts/mlp-swiglu" />
    </>
  );
}
