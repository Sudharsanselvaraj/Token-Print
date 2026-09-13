import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "Residual Streams",
  description: "Residual connections, layer-by-layer delta measurement, and PCA trajectory.",
};

export default function ResidualStreamsPage() {
  return (
    <>
      <DocsBreadcrumb slug="concepts/residual-streams" title="Residual Streams" />
      <h1>Residual Streams</h1>
      <p className="docs-meta">Core Concepts</p>

      <p>
        The <strong>residual stream</strong> is the sequence of token representations that flows
        through the model from input to output. Each layer adds a small delta to it rather than
        rewriting it from scratch. This makes the gradient path short and the training stable.
      </p>

      <hr />

      <h2 id="accumulation">Accumulation through layers</h2>

      <p>
        At each layer, two additions occur:
      </p>

      <pre className="docs-equation">{`h_0      = embed(tokens)                    # [T, 896]
h_attn_1 = h_0    + attention_delta(h_0)   # layer 1 attn
h_mlp_1  = h_attn_1 + mlp_delta(h_attn_1) # layer 1 MLP
h_attn_2 = h_mlp_1 + attention_delta(h_mlp_1)
...
h_final  = model_norm(h_mlp_24)
logits   = h_final @ embed_T               # [T, vocab_size]`}</pre>

      <p>
        The stream at each step has shape{" "}
        <span className="docs-tensor">
          <span className="docs-tensor-shape">[T, 896]</span>
        </span>
        {" "}throughout — the residual connection preserves dimensionality.
      </p>

      <hr />

      <h2 id="residual-contributions">Measuring contributions</h2>

      <p>
        TokenPrint&apos;s Debugger mode measures the <strong>PCA-space residual delta</strong> per
        layer — how much the stream changes at each layer in projected space. This tells you which
        layers are doing the most work.
      </p>

      <p>
        The measurement is the total residual change in PCA space, not a decomposition into
        attention vs. MLP contributions. The label in the UI states this explicitly.
      </p>

      <hr />

      <h2 id="logit-lens">Logit lens</h2>

      <p>
        The <strong>logit lens</strong> projects the residual stream at each intermediate layer
        through the final unembedding matrix to see what token the model would predict if it
        stopped there. TokenPrint computes this for every layer:
      </p>

      <pre className="docs-equation">{`logit_lens[layer][position] = softmax( h_layer[position] @ embed_T )`}</pre>

      <p>
        The result is a matrix of probability distributions over the 151,936-token vocabulary,
        one per (layer, position) pair. This data drives the Softmax &amp; Output chapter of the
        Walkthrough.
      </p>

      <DocsPrevNext slug="concepts/residual-streams" />
    </>
  );
}
