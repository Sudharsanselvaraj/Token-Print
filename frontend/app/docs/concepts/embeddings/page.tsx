import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "Embeddings",
  description: "Token embeddings, the embedding matrix, and PCA projection in TokenPrint.",
};

export default function EmbeddingsPage() {
  return (
    <>
      <DocsBreadcrumb slug="concepts/embeddings" title="Embeddings" />
      <h1>Embeddings</h1>
      <p className="docs-meta">Core Concepts</p>

      <p>
        Before any transformer layer runs, each token ID is converted into a dense vector of real
        numbers by a lookup into the <strong>embedding matrix</strong>. This vector is the
        token&apos;s initial representation in the model&apos;s hidden space.
      </p>

      <hr />

      <h2 id="embedding-matrix">The embedding matrix</h2>

      <p>
        The embedding matrix has shape{" "}
        <span className="docs-tensor">
          <span className="docs-tensor-shape">[151936, 896]</span>
          <span className="docs-tensor-label">vocab_size × hidden_size</span>
        </span>
        {" "}and contains <strong>136,134,656 parameters</strong> — 27.5% of the total model
        parameter count, making it the largest single tensor.
      </p>

      <p>
        In Qwen2.5, the embedding matrix is <strong>tied</strong> with the output unembedding
        matrix: the same weights are used to convert token IDs to vectors at the input and to
        convert hidden states back to logits at the output.
      </p>

      <hr />

      <h2 id="hidden-size">Hidden size</h2>

      <p>
        Every internal representation in the model is a vector of dimension{" "}
        <strong>896</strong> (the hidden size, also called <em>d_model</em>). After the embedding
        lookup, the sequence has shape{" "}
        <span className="docs-tensor">
          <span className="docs-tensor-shape">[T, 896]</span>
          <span className="docs-tensor-label">seq_len × hidden_size</span>
        </span>
        {" "}where T is the number of tokens.
      </p>

      <hr />

      <h2 id="pca-projection">PCA projection in TokenPrint</h2>

      <p>
        The Embedding chapter in Walkthrough mode projects the 896-dimensional token embeddings
        into 3D using <strong>PCA</strong> (principal component analysis). The backend runs the
        PCA decomposition using real PyTorch tensor values and returns the 3D coordinates.
      </p>

      <p>
        The projection is <strong>deterministic</strong> — the same input always produces the same
        3D coordinates, verified by the geometry verification script. Semantically similar tokens
        cluster together in the PCA space: for example, <em>apple</em> and <em>orange</em> land
        almost on top of each other at the embedding layer.
      </p>

      <hr />

      <h2 id="position-encoding">Position encoding</h2>

      <p>
        Qwen2.5 does not use learned positional embeddings added to the token embeddings (as in
        the original transformer). Instead, it uses{" "}
        <a href="/docs/concepts/rope">Rotary Position Encoding (RoPE)</a>, which is applied inside
        each attention layer to the Q and K projections. The embedding lookup itself is position-
        independent.
      </p>

      <DocsPrevNext slug="concepts/embeddings" />
    </>
  );
}
