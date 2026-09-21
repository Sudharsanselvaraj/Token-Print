import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCallout from "@/components/docs/DocsCallout";
import DocsCode from "@/components/docs/DocsCode";

export const metadata: Metadata = {
  title: "Loading a Model",
  description: "Load models via Hugging Face or drag-and-drop GGUF files.",
};

export default function LoadingAModelPage() {
  return (
    <>
      <DocsBreadcrumb slug="loading-a-model" title="Loading a Model" />
      <h1>Loading a Model</h1>
      <p className="docs-meta">Getting Started</p>

      <p>
        TokenPrint supports three model paths: a <strong>PyTorch model</strong> loaded by the
        backend (via Hugging Face), a <strong>GGUF binary file</strong> parsed client-side in the
        browser, and the <strong>in-browser GPT-2</strong> engine that runs generation entirely in
        the browser.
      </p>

      <hr />

      <h2 id="hugging-face">Hugging Face model (backend)</h2>

      <p>
        The backend loads a model on startup using the <code>MODEL_NAME</code> environment variable.
        The default is <code>Qwen/Qwen2.5-0.5B-Instruct</code>.
      </p>

      <DocsCode
        lang="bash"
        code={`MODEL_NAME=meta-llama/Llama-3.2-3B-Instruct \\
  python -m uvicorn app.main:app --app-dir . --port 8000 --reload`}
      />

      <p>
        Any model architecture supported by the backend is available. The frontend detects the
        architecture from <code>GET /model-info</code> and selects the correct formula set
        (RMSNorm vs LayerNorm, SwiGLU vs GELU, GQA vs MHA).
      </p>

      <DocsCallout variant="note">
        <p>
          The Model Explorer modal in the top navigation bar lists curated models with parameter
          counts, VRAM estimates, and instrumentation capability flags.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="gguf">GGUF drag-and-drop (client-side)</h2>

      <p>
        Drag a <code>.gguf</code> file onto the 3D canvas in Architecture mode. The browser reads
        the binary header and parses tensor metadata without sending the file to the backend.
      </p>

      <p>Two tested GGUF models (from the verification report):</p>

      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Architecture</th>
            <th>Parameters</th>
            <th>Tensors</th>
            <th>Quantization</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Qwen3 8B</td>
            <td><code>qwen3</code></td>
            <td>8.19B</td>
            <td>399</td>
            <td>Q4_K</td>
          </tr>
          <tr>
            <td>Llama 3.2 3B</td>
            <td><code>llama</code></td>
            <td>3.21B</td>
            <td>255</td>
            <td>Q4_K</td>
          </tr>
        </tbody>
      </table>

      <p>
        The GGUF path produces the same data shape as <code>GET /architecture</code> with{" "}
        <code>&quot;source&quot;: &quot;gguf&quot;</code> and extra fields for quantization type and
        GGUF version.
      </p>

      <DocsCallout variant="warning">
        <p>
          GGUF mode only supports Architecture visualization (drag-and-drop diff/compare).
          However, <em>generation</em> without the backend is possible via the in-browser GPT-2
          engine — see <a href="/docs/using/browser-inference">Browser GPT-2</a>. Walkthrough and
          Debugger modes require the backend with a PyTorch model loaded.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="browser-gpt2">Browser GPT-2 (no backend)</h2>

      <p>
        Instead of loading a file, you can switch Generation mode to the{" "}
        <strong>Browser GPT-2</strong> engine (WebGPU or CPU/WASM). It downloads a pinned
        <code>Xenova/gpt2</code> model (~500 MB, cached) and runs real greedy generation entirely
        in the browser. No backend is required for this path.
      </p>

      <p>
        The backend can also serve a dedicated GGUF execution engine over the{" "}
        <code>/gguf/*</code> API for running quantized llama.cpp models server-side — see{" "}
        <a href="/docs/api-reference">API Reference</a>.
      </p>

      <DocsPrevNext slug="loading-a-model" />
    </>
  );
}
