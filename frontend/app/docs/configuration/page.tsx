import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCallout from "@/components/docs/DocsCallout";

export const metadata: Metadata = {
  title: "Configuration",
  description: "Backend environment variables, model directory paths, and frontend settings for TokenPrint.",
};

export default function ConfigurationPage() {
  return (
    <>
      <DocsBreadcrumb slug="configuration" title="Configuration" />

      <h1>Configuration</h1>
      <p className="docs-meta">Reference</p>

      <p className="docs-intro">
        TokenPrint can be configured via backend environment variables (<code>.env</code>) or CLI
        flags. The supported launcher (<code>python3 scripts/start.py</code>) also exposes{" "}
        <code>--model</code> and <code>--revision</code> flags.
      </p>

      <hr />

      <h2 id="environment-variables">Environment Variables</h2>
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>TOKENPRINT_MODEL</code></td>
            <td><code>Qwen/Qwen2.5-0.5B-Instruct</code></td>
            <td>Hugging Face model ID for the backend PyTorch model.</td>
          </tr>
          <tr>
            <td><code>TOKENPRINT_REVISION</code></td>
            <td><code>main</code></td>
            <td>
              HF revision to pin. Defaults to the resolved commit SHA reported by AutoConfig — the
              backend runs the exact commit that is resolved, guaranteeing reproducibility.
            </td>
          </tr>
          <tr>
            <td><code>TOKENPRINT_DEVICE</code></td>
            <td>auto</td>
            <td>Inference target (<code>cpu</code>, <code>mps</code>, or <code>cuda</code>).</td>
          </tr>
          <tr>
            <td><code>TOKENPRINT_MAX_TOKENS</code></td>
            <td><code>40</code></td>
            <td>Cap for generated new tokens on the backend path.</td>
          </tr>
          <tr>
            <td><code>TOKENPRINT_FRONTEND_PORT</code></td>
            <td><code>3000</code></td>
            <td>
              Used to build the CORS allow-list (the dev frontend origin allowed to call the API).
            </td>
          </tr>
          <tr>
            <td><code>PORT</code></td>
            <td><code>8000</code></td>
            <td>FastAPI backend HTTP and WebSocket port.</td>
          </tr>
          <tr>
            <td><code>MAX_GGUF_ENGINES</code></td>
            <td><code>2</code></td>
            <td>
              Maximum resident GGUF engines in the LRU cache (min 1). See{" "}
              <a href="/docs/api-reference">API Reference</a>.
            </td>
          </tr>
        </tbody>
      </table>

      <DocsCallout variant="tip">
        <p>
          <code>python3 scripts/start.py --model MODEL --revision COMMIT</code> sets{" "}
          <code>TOKENPRINT_MODEL</code> and <code>TOKENPRINT_REVISION</code>, verifies
          prerequisites (Python 3.11/3.12, Node 20.9+), and starts both services.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="frontend-settings">Frontend Settings</h2>
      <p>
        Frontend configuration options (such as WebGL rendering precision, maximum FPS cap, and
        auto-scroll behavior) can be adjusted in the App Settings panel or persisted in{" "}
        <code>localStorage</code>.
      </p>

      <p>
        The browser GPT-2 engine adds two per-run choices —<strong>device</strong> (WebGPU or
        WASM) and a token cap up to 32 — made in the Generation controls. See{" "}
        <a href="/docs/using/browser-inference">Browser GPT-2</a>.
      </p>

      <DocsPrevNext slug="configuration" />
    </>
  );
}
