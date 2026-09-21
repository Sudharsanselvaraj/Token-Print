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
        Generation mode runs a real autoregressive forward pass and replays the result as a 3D
        animation. Each operation in the computation graph lights up the corresponding 3D
        component as it executes.
      </p>

      <p>
        Three engine options are available, selected via the{" "}
        <strong>Inference engine</strong> dropdown:
      </p>

      <table>
        <thead>
          <tr>
            <th>Engine</th>
            <th>Source</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>Python backend</code></td>
            <td>Streams over <code>WS /ws/generate</code></td>
            <td>
              Full capabilities — attention, hidden states, logit lens, KV cache. Decoding modes
              dependent on the backend.
            </td>
          </tr>
          <tr>
            <td><code>Browser GPT-2 · WebGPU</code></td>
            <td>Runs fully client-side in a Web Worker</td>
            <td>
              Greedy only, ≤ 32 new tokens, ~500 MB cached download. See{" "}
              <a href="/docs/using/browser-inference">Browser GPT-2</a>.
            </td>
          </tr>
          <tr>
            <td><code>Browser GPT-2 · CPU (WASM)</code></td>
            <td>Runs fully client-side in a Web Worker</td>
            <td>Same as WebGPU, but CPU compute — an explicit choice, never an automatic fallback.</td>
          </tr>
        </tbody>
      </table>

      <DocsCallout variant="tip">
        <p>
          The browser engine requires no backend at all. To export a run for reproducible
          verification, use the <a href="/docs/using/experiments">Experiments</a> panel in Debugger
          mode, or hit the <a href="/docs/api-reference">API reference</a> directly for defaults.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="op-catalog">Op catalog</h2>

      <p>
        Before animation begins, the backend engine sends a complete op catalog describing every
        operation in the forward pass. The browser GPT-2 engine does not instrument
        layer-level ops — it streams per-token frames with <code>num_layer_stats: 0</code> and an
        explicit honesty note. For the reference model, the backend catalog contains{" "}
        <strong>243 ops</strong>:
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
          Capped at 40 new tokens by default. With the browser engine the cap is clamped to 32.
          TokenPrint uses greedy decoding by default; the prediction game is deterministic — the
          same prompt always produces the same token sequence for greedy runs.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="decoding-strategies">Decoding strategies</h2>

      <p>
        Behind the scenes, generation options support four decoding modes — greedy, sampling,
        sliding window, and speculative — plus temperature, top-k, top-p, and seed. The browser
        engine is greedy-only. See the{" "}
        <a href="/docs/concepts/decoding">Decoding Strategies</a> concept page for what each mode
        does and what its options mean.
      </p>

      <DocsPrevNext slug="using/generation" />
    </>
  );
}
