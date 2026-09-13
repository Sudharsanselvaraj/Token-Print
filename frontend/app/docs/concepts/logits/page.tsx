import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "Logits",
  description: "Output logits, logit lens, and top-k distribution in TokenPrint.",
};

export default function LogitsPage() {
  return (
    <>
      <DocsBreadcrumb slug="concepts/logits" title="Logits" />
      <h1>Logits</h1>
      <p className="docs-meta">Core Concepts</p>

      <p>
        After the final RMSNorm, the residual stream is projected through the{" "}
        <strong>unembedding matrix</strong> to produce a vector of <strong>151,936 logits</strong>{" "}
        — one real number per vocabulary token. These logits are the raw scores before any
        normalization. The model&apos;s prediction is the token with the highest logit.
      </p>

      <hr />

      <h2 id="unembedding">Unembedding</h2>

      <pre className="docs-equation">{`logits = h_final @ embed_matrix_T    # [T, vocab_size] = [T, 151936]`}</pre>

      <p>
        In Qwen2.5, the unembedding matrix is the <strong>transpose of the embedding matrix</strong>{" "}
        (weight tying). The same 136,134,656 parameters serve both input lookup and output
        projection.
      </p>

      <hr />

      <h2 id="logit-lens">Logit lens</h2>

      <p>
        The <strong>logit lens</strong> applies the final unembedding matrix to the residual stream
        at every intermediate layer, producing a probability distribution at each layer. This reveals
        how the model&apos;s prediction evolves through the depth of the network.
      </p>

      <p>
        TokenPrint computes the full logit lens matrix as part of <code>POST /analyze</code> —
        shape <code>[n_layers, n_positions, top_k]</code> where each entry is a{" "}
        <code>(token_text, token_id, probability)</code> triple. This data is what drives the
        Walkthrough Softmax &amp; Output chapter.
      </p>

      <hr />

      <h2 id="top-k-skyline">Top-k skyline</h2>

      <p>
        In Generation mode, the right panel shows a <strong>top-k skyline chart</strong> — a bar
        chart of the top-5 predicted tokens at the current step with their real softmax
        probabilities. This updates live as each token is generated.
      </p>

      <p>
        The prediction game lets you select your guess from the top candidates before the model
        reveals its answer — it is scored against the real argmax, not a simulation.
      </p>

      <DocsPrevNext slug="concepts/logits" />
    </>
  );
}
