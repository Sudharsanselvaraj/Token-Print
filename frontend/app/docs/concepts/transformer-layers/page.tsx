import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "Transformer Layers",
  description: "Residual stream, layer composition, and the 24-layer stack in TokenPrint.",
};

export default function TransformerLayersPage() {
  return (
    <>
      <DocsBreadcrumb slug="concepts/transformer-layers" title="Transformer Layers" />
      <h1>Transformer Layers</h1>
      <p className="docs-meta">Core Concepts</p>

      <p>
        A transformer model is a stack of identical layers, each refining the token representations
        through two sub-blocks: <strong>attention</strong> and <strong>MLP</strong>. The reference
        model has <strong>24 layers</strong>.
      </p>

      <hr />

      <h2 id="residual-stream">The residual stream</h2>

      <p>
        The central abstraction is the <strong>residual stream</strong> — a sequence of vectors,
        one per token, that accumulates information as it passes through each layer. Each layer
        reads from the stream, computes a delta, and writes it back via addition:
      </p>

      <pre className="docs-equation">{`x_out = x_in + Attention(RMSNorm(x_in))
x_out = x_out + MLP(RMSNorm(x_out))`}</pre>

      <p>
        The residual connection (the addition) is what makes deep transformers trainable — gradients
        flow directly through the additions, bypassing each sub-block.
      </p>

      <hr />

      <h2 id="layer-structure">Layer structure</h2>

      <p>Each of the 24 layers contains:</p>

      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Tensor name pattern</th>
            <th>Parameters (layer 0)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Input RMSNorm</td>
            <td><code>model.layers.N.input_layernorm.weight</code></td>
            <td>896</td>
          </tr>
          <tr>
            <td>Q projection</td>
            <td><code>model.layers.N.self_attn.q_proj.weight</code></td>
            <td>896 × 896</td>
          </tr>
          <tr>
            <td>K projection</td>
            <td><code>model.layers.N.self_attn.k_proj.weight</code></td>
            <td>128 × 896</td>
          </tr>
          <tr>
            <td>V projection</td>
            <td><code>model.layers.N.self_attn.v_proj.weight</code></td>
            <td>128 × 896</td>
          </tr>
          <tr>
            <td>Output projection</td>
            <td><code>model.layers.N.self_attn.o_proj.weight</code></td>
            <td>896 × 896</td>
          </tr>
          <tr>
            <td>Post-attention RMSNorm</td>
            <td><code>model.layers.N.post_attention_layernorm.weight</code></td>
            <td>896</td>
          </tr>
          <tr>
            <td>MLP gate projection</td>
            <td><code>model.layers.N.mlp.gate_proj.weight</code></td>
            <td>4864 × 896</td>
          </tr>
          <tr>
            <td>MLP up projection</td>
            <td><code>model.layers.N.mlp.up_proj.weight</code></td>
            <td>4864 × 896</td>
          </tr>
          <tr>
            <td>MLP down projection</td>
            <td><code>model.layers.N.mlp.down_proj.weight</code></td>
            <td>896 × 4864</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2 id="tokenprint-visualization">TokenPrint visualization</h2>

      <p>
        In the 3D view, each layer is represented as a horizontal slice of the transformer stack.
        The components within a layer are rendered as distinct 3D shapes:
      </p>

      <ul>
        <li><strong>RMSNorm collars</strong> — narrow cylindrical rings at the top and bottom of each layer</li>
        <li><strong>GQA blade array</strong> — the Q/K/V attention structure (14 Q blades, 2 KV groups)</li>
        <li><strong>SwiGLU funnel</strong> — the MLP sub-block with gate, up, and down projections</li>
        <li><strong>Residual splines</strong> — data wires connecting the residual stream through each layer</li>
      </ul>

      <DocsPrevNext slug="concepts/transformer-layers" />
    </>
  );
}
