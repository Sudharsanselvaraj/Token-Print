import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "RoPE",
  description: "Rotary Position Encoding — how Qwen2.5 encodes token positions in attention.",
};

export default function RopePage() {
  return (
    <>
      <DocsBreadcrumb slug="concepts/rope" title="RoPE" />
      <h1>RoPE</h1>
      <p className="docs-meta">Core Concepts</p>

      <p>
        <strong>Rotary Position Encoding (RoPE)</strong> injects positional information into
        attention by rotating Q and K vectors before the dot product. Unlike additive positional
        embeddings, RoPE encodes the <em>relative</em> position between pairs of tokens.
      </p>

      <hr />

      <h2 id="mechanism">Mechanism</h2>

      <p>
        For a token at position <em>m</em>, RoPE applies a block-diagonal rotation matrix to the
        64-dimensional Q and K vectors. Each consecutive pair of dimensions is rotated by an angle
        that depends on the position and a frequency parameter:
      </p>

      <pre className="docs-equation">{`theta_i = position / (theta_base ^ (2i / head_dim))

where:
  theta_base = 1,000,000   (Qwen2.5 RoPE theta)
  head_dim   = 64
  i          = dimension index (0 to 31)`}</pre>

      <p>
        The rotation means that the dot product <code>Q_m · K_n</code> depends only on the
        <em>difference</em> (m − n), not on the absolute positions. This gives the model
        relative position awareness without requiring a learned position embedding table.
      </p>

      <hr />

      <h2 id="long-context">Long-context extrapolation</h2>

      <p>
        Qwen2.5 uses a very large RoPE theta of <strong>1,000,000</strong> (compared to 10,000 in
        the original RoPE paper). Higher theta values slow down the rotation frequency, allowing
        the model to generalize better to context lengths longer than its training window. This is
        one of the reasons Qwen2.5-0.5B supports a context of 32,768 tokens.
      </p>

      <hr />

      <h2 id="tokenprint-visualization">TokenPrint visualization</h2>

      <p>
        In the 3D model, RoPE is represented as a helix structure threading through the attention
        layers. The helix pitch encodes the position frequency — a higher position produces a
        faster-rotating vector. In the Generation mode op catalog, the RoPE operation appears
        between the Q/K projections and the attention computation.
      </p>

      <DocsPrevNext slug="concepts/rope" />
    </>
  );
}
