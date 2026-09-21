import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCode from "@/components/docs/DocsCode";
import DocsCallout from "@/components/docs/DocsCallout";

export const metadata: Metadata = {
  title: "Quick Start",
  description: "Run TokenPrint and load your first model in under five minutes.",
};

export default function QuickStartPage() {
  return (
    <>
      <DocsBreadcrumb slug="quick-start" title="Quick Start" />
      <h1>Quick Start</h1>
      <p className="docs-meta">Getting Started</p>

      <p>
        Get TokenPrint running with a real model trace in under five minutes.
      </p>

      <DocsCallout variant="tip">
        <p>
          <strong>No backend available?</strong> Open the frontend anyway and use{" "}
          <a href="/docs/using/browser-inference">Browser GPT-2</a> for generation or drag a{" "}
          <code>.gguf</code> file onto the canvas for Architecture mode. Both run client-side.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="step-0">Step 0 — One-command launcher (optional)</h2>

      <p>
        Instead of the manual steps below, run <code>python3 scripts/start.py</code> from the repo
        root. It checks prerequisites (Python 3.11/3.12, Node 20.9+), provisions the Python
        environment, installs frontend dependencies, downloads the model, and starts both services.
        Skip to Step 3 once it reports ready.
      </p>

      <hr />

      <h2 id="step-1">Step 1 — Start the backend</h2>

      <DocsCode
        lang="bash"
        filename="terminal (tab 1)"
        code={`cd backend
source .venv/bin/activate
python -m uvicorn app.main:app --app-dir . --port 8000 --reload`}
      />

      <p>
        Wait until you see <code>Application startup complete</code> and the model has finished
        loading. The first run downloads the model (~1 GB) — subsequent runs start in seconds.
      </p>

      <hr />

      <h2 id="step-2">Step 2 — Start the frontend</h2>

      <DocsCode
        lang="bash"
        filename="terminal (tab 2)"
        code={`cd frontend
npm run dev`}
      />

      <p>
        Open <code>http://localhost:3000</code>. You should see the TokenPrint shell with the 3D
        canvas loading.
      </p>

      <hr />

      <h2 id="step-3">Step 3 — Explore the architecture</h2>

      <p>
        The default view is <strong>Architecture mode</strong>. The 3D canvas shows a point cloud
        of all 290 tensors in the Qwen2.5-0.5B-Instruct model. Each point represents one tensor;
        the Y-axis encodes layer depth and the X-axis encodes tensor kind (embedding,
        attention projections, MLP, norm).
      </p>

      <p>
        Click any point to open the <strong>Tensor Inspector</strong> in the right panel — it shows
        the tensor name, shape, dtype, and parameter count.
      </p>

      <hr />

      <h2 id="step-4">Step 4 — Run a generation trace</h2>

      <p>
        Click <strong>Generation</strong> in the top navigation bar. The default prompt
        (<em>&ldquo;The cat sat on the mat.&rdquo;</em>) is pre-loaded. Click{" "}
        <strong>Generate</strong> to start a real forward pass. The 3D model begins animating:
        each lit component represents the currently executing operation.
      </p>

      <DocsCallout variant="tip">
        <p>
          Use the speed slider in the bottom transport bar to slow down the animation and inspect
          individual operations. Press the layer-skip button to jump to the next transformer layer.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="step-5">Step 5 — Run a walkthrough</h2>

      <p>
        Click <strong>Walkthrough</strong>. TokenPrint runs a full <code>POST /analyze</code> call
        on the example sentence and generates a 7-chapter interactive explanation. Each chapter
        shows real numbers from that forward pass — attention weights, embedding distances, logit
        lens values.
      </p>

      <DocsPrevNext slug="quick-start" />
    </>
  );
}
