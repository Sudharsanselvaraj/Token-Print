import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCallout from "@/components/docs/DocsCallout";

export const metadata: Metadata = {
  title: "Generation",
  description: "Generation mode — real forward pass, op catalog, playback controls, and prediction game.",
};

export default function GenerationPage() {
  return (
    <>
      <DocsBreadcrumb slug="using/generation" title="Generation" />
      <h1>Generation</h1>
      <p className="docs-meta">Using TokenPrint</p>

      <p>
        Generation mode runs a real autoregressive forward pass via <code>WS /ws/generate</code>{" "}
        and replays the result as a 3D animation. Each operation in the computation graph lights
        up the corresponding 3D component as it executes.
      </p>

      <hr />

      <h2 id="op-catalog">Op catalog</h2>

      <p>
        Before animation begins, the backend sends a complete op catalog describing every operation
        in the forward pass. For the reference model, the catalog contains <strong>243 ops</strong>:
      </p>

      <ul>
        <li>10 ops per layer × 24 layers = 240 layer ops</li>
        <li>3 top-level ops: embedding lookup, final norm, vocabulary unembedding</li>
      </ul>

      <p>
        Each op entry includes the op name, layer index, input/output shapes, bias status, and
        cumulative parameter count. The final op (vocabulary unembedding) shows cumulative
        parameters used: <strong>630,167,424</strong> (exceeds unique param count due to weight
        tying — the embedding matrix is counted twice).
      </p>

      <hr />

      <h2 id="playback-controls">Playback controls</h2>

      <table>
        <thead>
          <tr>
            <th>Control</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Play / Pause</td><td>Start or pause the animation</td></tr>
          <tr><td>Speed slider</td><td>1× to 16× animation speed</td></tr>
          <tr><td>Step buttons</td><td>Move one op forward or backward</td></tr>
          <tr><td>Layer skip</td><td>Jump to the first op of the next layer</td></tr>
          <tr><td>Follow mode</td><td>Auto-pan camera to the active operation</td></tr>
        </tbody>
      </table>

      <hr />

      <h2 id="prediction-game">Prediction game</h2>

      <p>
        Before the model reveals each predicted token, the top-k panel offers a prediction game:
        guess which token the model will produce. Your score depends on whether your guess matches
        the real argmax. The game is scored against the real <code>torch.argmax</code> output,
        not a simulation.
      </p>

      <DocsCallout variant="note">
        <p>
          TokenPrint uses greedy decoding by default. The prediction game is deterministic —
          the same prompt always produces the same token sequence.
        </p>
      </DocsCallout>

      <DocsPrevNext slug="using/generation" />
    </>
  );
}
