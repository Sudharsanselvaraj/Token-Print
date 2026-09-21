import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCallout from "@/components/docs/DocsCallout";

export const metadata: Metadata = {
  title: "Decoding Strategies",
  description: "Greedy, sampling, temperature, top-k, top-p, sliding window, and speculative decoding.",
};

export default function DecodingPage() {
  return (
    <>
      <DocsBreadcrumb slug="concepts/decoding" title="Decoding Strategies" />
      <h1>Decoding Strategies</h1>
      <p className="docs-meta">Core Concepts</p>

      <p>
        <strong>Decoding</strong> is the strategy used to turn the model&apos;s predicted token
        probabilities into the next token. Every model returns a probability distribution over the
        vocabulary; the decoding strategy decides which token to actually emit.
      </p>

      <hr />

      <h2 id="greedy">Greedy decoding</h2>

      <p>
        Greedy decoding always picks the token with the highest probability. It is deterministic —
        the same prompt always produces the same output. The Generation mode uses greedy decoding
        by default, and the Browser GPT-2 engine supports greedy only.
      </p>

      <DocsCallout variant="tip">
        <p>
          Because greedy decoding is deterministic, the prediction game in Generation mode is
          scored against the real <code>argmax</code> — it is never a simulation.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="sampling">Sampling</h2>

      <p>
        Sampling draws the next token randomly from the probability distribution. This produces
        more diverse and creative text than greedy, which can fall into repetitive loops. Options
        expose a random <code>seed</code> so runs are reproducible: the same seed reproduces the
        same token sequence.
      </p>

      <hr />

      <h2 id="temperature">Temperature</h2>

      <p>
        Temperature scales the logits before softmax. Logits are divided by the temperature value:
      </p>

      <p>
        <code>softmax(logits / T)</code>
      </p>

      <ul>
        <li><code>T = 1</code> — the raw distribution, no change.</li>
        <li><code>T &lt; 1</code> — sharpens the distribution, making high-probability tokens more likely.</li>
        <li><code>T &gt; 1</code> — flattens the distribution, making low-probability tokens more likely.</li>
      </ul>

      <p>
        Lower temperatures approach greedy behavior; higher temperatures approach uniform sampling.
      </p>

      <hr />

      <h2 id="top-k-and-top-p">Top-k and top-p</h2>

      <p>
        Top-k and top-p are truncation filters applied before selecting a token:
      </p>

      <ul>
        <li>
          <strong>Top-k</strong> restricts the choice to the <em>k</em> most probable tokens. The
          probabilities are renormalized over that subset. In TokenPrint the top-k panel shows the
          filtered candidates live during generation.
        </li>
        <li>
          <strong>Top-p (nucleus)</strong> keeps the smallest set of tokens whose cumulative
          probability reaches <em>p</em>. The cutoff adapts to the shape of the distribution.
        </li>
      </ul>

      <p>
        Both are often combined with sampling — decode from the top-k (or top-p) set, sampled at a
        chosen temperature.
      </p>

      <hr />

      <h2 id="sliding-window">Sliding window</h2>

      <p>
        Sliding window decoding trims the KV cache to the last <code>windowSize</code> positions
        at each decode step. The model genuinely recomputes with a reduced visual context — the
        older positions fall out of the attention window. This bounds memory for long sequences at
        the cost of losing older context.
      </p>

      <hr />

      <h2 id="speculative">Speculative decoding</h2>

      <p>
        Speculative decoding is a self-speculative &ldquo;blockwise&rdquo; strategy: the model
        drafts <code>draftGamma</code> candidate tokens cheaply from its last distribution, then
        verifies <em>all</em> of them in a single batched forward pass, accepting the longest
        matching prefix. It produces the same result as greedy but with fewer forward passes, at
        the cost of a larger peak batch.
      </p>

      <hr />

      <h2 id="in-tokenprint">In TokenPrint</h2>

      <table>
        <thead>
          <tr>
            <th>Engine</th>
            <th>Supported strategies</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Python backend</td>
            <td>
              Greedy, sampling, sliding window, speculative (backend-dependent)
            </td>
          </tr>
          <tr>
            <td>Browser GPT-2</td>
            <td>Greedy only</td>
          </tr>
          <tr>
            <td>Recorded replay</td>
            <td>Playback only — the original strategy is replayed as recorded</td>
          </tr>
        </tbody>
      </table>

      <DocsCallout variant="note">
        <p>
          See <a href="/docs/using/generation">Generation</a> for how to select a decoding engine
          and strategy, and <a href="/docs/using/experiments">Experiments</a> for how output is
          verified for reproducibility.
        </p>
      </DocsCallout>

      <DocsPrevNext slug="concepts/decoding" />
    </>
  );
}