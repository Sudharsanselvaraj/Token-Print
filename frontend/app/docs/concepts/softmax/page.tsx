import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "Softmax",
  description: "Softmax in attention and output decoding — temperature, greedy, and top-k.",
};

export default function SoftmaxPage() {
  return (
    <>
      <DocsBreadcrumb slug="concepts/softmax" title="Softmax" />
      <h1>Softmax</h1>
      <p className="docs-meta">Core Concepts</p>

      <p>
        <strong>Softmax</strong> converts a vector of arbitrary real numbers (logits) into a
        probability distribution: all values become non-negative and sum to 1. TokenPrint uses
        softmax in two distinct places — inside attention and at the output.
      </p>

      <hr />

      <h2 id="formula">Formula</h2>

      <pre className="docs-equation">{`softmax(x_i) = exp(x_i) / sum_j( exp(x_j) )`}</pre>

      <p>
        The exponential amplifies differences between logits non-linearly. A logit 2 units above
        another receives approximately <code>e^2 ≈ 7.4x</code> more probability mass.
      </p>

      <hr />

      <h2 id="in-attention">In attention</h2>

      <p>
        After computing the scaled dot products <code>Q K^T / sqrt(64)</code>, softmax is applied
        row-wise across the key dimension to produce attention weights. Each row sums to 1.00 —
        verified independently for the reference model (row sums: 1.0000).
      </p>

      <hr />

      <h2 id="at-output">At the output</h2>

      <p>
        After the final RMSNorm and the unembedding projection, the model produces a vector of{" "}
        <strong>151,936 logits</strong> — one per vocabulary token. Softmax converts these into
        probabilities. The token with the highest probability is the model&apos;s greedy prediction.
      </p>

      <hr />

      <h2 id="greedy-decoding">Greedy decoding</h2>

      <p>
        TokenPrint&apos;s Generation mode uses <strong>greedy decoding</strong>: the token with
        the highest logit is always selected as the next token. This is deterministic and
        reproducible. The backend uses real <code>torch.argmax</code> over real logits — no
        sampling or temperature is applied unless explicitly configured.
      </p>

      <hr />

      <h2 id="tokenprint-visualization">TokenPrint visualization</h2>

      <p>
        The Softmax &amp; Output chapter in Walkthrough mode shows a bar chart of the top-k
        predicted tokens with real softmax probabilities for the example sentence. The argmax
        (the model&apos;s actual prediction) is highlighted. The prediction game lets you guess
        the next token before revealing the real distribution.
      </p>

      <DocsPrevNext slug="concepts/softmax" />
    </>
  );
}
