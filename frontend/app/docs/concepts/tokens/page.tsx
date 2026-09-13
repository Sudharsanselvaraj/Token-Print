import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCallout from "@/components/docs/DocsCallout";

export const metadata: Metadata = {
  title: "Tokens",
  description: "Tokenization, vocabulary IDs, and how TokenPrint visualizes them.",
};

export default function TokensPage() {
  return (
    <>
      <DocsBreadcrumb slug="concepts/tokens" title="Tokens" />
      <h1>Tokens</h1>
      <p className="docs-meta">Core Concepts</p>

      <p>
        A <strong>token</strong> is the atomic unit of text that a language model processes.
        Before any computation, the raw input string is converted into a sequence of integer IDs
        by a <strong>tokenizer</strong>. The model never sees characters — only these IDs.
      </p>

      <hr />

      <h2 id="byte-pair-encoding">Byte-pair encoding</h2>

      <p>
        Qwen2.5 uses a <strong>byte-pair encoding (BPE)</strong> tokenizer with a vocabulary of
        151,936 tokens. BPE builds the vocabulary by iteratively merging the most frequent adjacent
        byte pairs in the training corpus. Common words become single tokens; rare words are split
        into subword pieces.
      </p>

      <p>Example — the sentence <em>&ldquo;The cat sat on the mat.&rdquo;</em>:</p>

      <table>
        <thead>
          <tr>
            <th>Token text</th>
            <th>Vocabulary ID</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>The</code></td><td><code>#785</code></td></tr>
          <tr><td><code>cat</code></td><td><code>#9982</code></td></tr>
          <tr><td><code>sat</code></td><td><code>#14524</code></td></tr>
          <tr><td><code>on</code></td><td><code>#389</code></td></tr>
          <tr><td><code>the</code></td><td><code>#279</code></td></tr>
          <tr><td><code>mat</code></td><td><code>#4264</code></td></tr>
          <tr><td><code>.</code></td><td><code>#13</code></td></tr>
        </tbody>
      </table>

      <p>
        These are real vocabulary IDs from the Qwen2.5 tokenizer. Common words like{" "}
        <code>the</code> (ID 279) and <code>.</code> (ID 13) have low IDs because they appeared
        early in the BPE merge sequence.
      </p>

      <hr />

      <h2 id="tokenprint-visualization">TokenPrint visualization</h2>

      <p>
        The Tokenization chapter in Walkthrough mode renders each token as a colored chip showing
        both the token text and its vocabulary ID. The chip color encodes the token&apos;s position
        in the sequence.
      </p>

      <p>
        The language selector lets you switch between tokenizations of the same sentence in different
        languages — the number of tokens changes even for semantically equivalent text, which
        demonstrates how tokenizer vocabulary coverage affects efficiency.
      </p>

      <DocsCallout variant="note">
        <p>
          Token IDs are read from a real tokenizer call on the backend. They are not estimated or
          approximated.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="special-tokens">Special tokens</h2>

      <p>
        The Qwen2.5 tokenizer uses several special tokens that are not natural text:
      </p>

      <table>
        <thead>
          <tr>
            <th>Token</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>&lt;|im_start|&gt;</code></td><td>Marks the start of a chat turn</td></tr>
          <tr><td><code>&lt;|im_end|&gt;</code></td><td>Marks the end of a chat turn</td></tr>
          <tr><td><code>&lt;|endoftext|&gt;</code></td><td>End-of-sequence marker</td></tr>
        </tbody>
      </table>

      <p>
        These appear in the token stream during Generation mode and are visible in the top-k
        skyline panel when the model predicts end-of-generation.
      </p>

      <DocsPrevNext slug="concepts/tokens" />
    </>
  );
}
