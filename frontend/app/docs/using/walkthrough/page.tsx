import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "Walkthrough",
  description: "Walkthrough mode — 7 chapters, real data, model scale selector, and navigation.",
};

export default function WalkthroughPage() {
  return (
    <>
      <DocsBreadcrumb slug="using/walkthrough" title="Walkthrough" />
      <h1>Walkthrough</h1>
      <p className="docs-meta">Using TokenPrint</p>

      <p>
        Walkthrough mode is a chaptered, interactive explanation of a transformer forward pass.
        Clicking Walkthrough triggers a <code>POST /analyze</code> call on the example sentence
        (<em>&ldquo;The cat sat on the mat.&rdquo;</em>) and uses the real results to populate
        every chapter.
      </p>

      <hr />

      <h2 id="chapters">Chapters</h2>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Chapter</th>
            <th>What it shows</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Overview</td>
            <td>High-level architecture diagram, model metadata, total parameter count.</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Tokenization</td>
            <td>
              Real token chips with vocabulary IDs for the example sentence. Language switcher
              showing tokenization in multiple languages.
            </td>
          </tr>
          <tr>
            <td>3</td>
            <td>Embedding</td>
            <td>
              PCA projection of the 7 token embeddings into 3D. Clustering shows semantic structure.
            </td>
          </tr>
          <tr>
            <td>4</td>
            <td>RMSNorm</td>
            <td>
              Worked RMSNorm formula with real input values and gamma weights from layer 0.
            </td>
          </tr>
          <tr>
            <td>5</td>
            <td>Self-Attention</td>
            <td>
              Attention weight heatmap (7×7) for layer 0, head 0. Strongest link labeled
              (&ldquo;cat&rdquo; → &ldquo;The&rdquo;, weight 0.864). Head selector.
            </td>
          </tr>
          <tr>
            <td>6</td>
            <td>MLP</td>
            <td>
              SwiGLU funnel geometry with gate, up, and down projection labels and real dimensions
              (4864 × 896).
            </td>
          </tr>
          <tr>
            <td>7</td>
            <td>Softmax &amp; Output</td>
            <td>
              Top-k probability bar chart from the logit lens. Real model prediction for the
              example sentence. Prediction game.
            </td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2 id="navigation">Navigation</h2>

      <p>
        Each chapter has a <strong>Continue</strong> and <strong>Skip Back</strong> button in the
        right panel. The sidebar shows a chapter list with the current chapter highlighted. A
        progress indicator shows <em>Chapter N of 7</em>.
      </p>

      <hr />

      <h2 id="model-scale">Model scale selector</h2>

      <p>
        Each chapter includes a model scale selector (Tiny / Small / Medium / Large) that adjusts
        the reference numbers in the explanation text to the selected scale class. The 3D geometry
        scales proportionally. All numbers at each scale are derived from real model configurations,
        not interpolated.
      </p>

      <DocsPrevNext slug="using/walkthrough" />
    </>
  );
}
