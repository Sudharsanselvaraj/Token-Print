import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

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
        TokenPrint can be configured via backend environment variables (<code>.env</code>) or CLI flags
        when starting the backend inspection service.
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
            <td><code>MODEL_PATH</code></td>
            <td><code>./models/qwen2.5-0.5b-instruct.gguf</code></td>
            <td>Path to primary GGUF model file on backend.</td>
          </tr>
          <tr>
            <td><code>PORT</code></td>
            <td><code>8000</code></td>
            <td>FastAPI backend HTTP and WebSocket port.</td>
          </tr>
          <tr>
            <td><code>DEVICE</code></td>
            <td><code>cpu</code></td>
            <td>Inference target (<code>cpu</code>, <code>mps</code>, or <code>cuda</code>).</td>
          </tr>
          <tr>
            <td><code>CACHE_DIR</code></td>
            <td><code>~/.cache/tokenprint</code></td>
            <td>Local directory for downloaded models and trace records.</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2 id="frontend-settings">Frontend Settings</h2>
      <p>
        Frontend configuration options (such as WebGL rendering precision, maximum FPS cap, and auto-scroll behavior)
        can be adjusted in the App Settings panel or persisted in <code>localStorage</code>.
      </p>

      <DocsPrevNext slug="configuration" />
    </>
  );
}
