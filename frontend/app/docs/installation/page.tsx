import type { Metadata } from "next";
import Link from "next/link";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCode from "@/components/docs/DocsCode";
import DocsCallout from "@/components/docs/DocsCallout";

export const metadata: Metadata = {
  title: "Installation",
  description: "Prerequisites and setup for the TokenPrint backend and frontend.",
};

export default function InstallationPage() {
  return (
    <>
      <DocsBreadcrumb slug="installation" title="Installation" />
      <h1>Installation</h1>
      <p className="docs-meta">Getting Started</p>

      <p>
        TokenPrint has two components: a <strong>FastAPI + PyTorch backend</strong> that runs model
        forward passes and a <strong>Next.js frontend</strong> that renders the 3D visualization.
        Both must be running simultaneously for full functionality.
      </p>

      <hr />

      <h2 id="prerequisites">Prerequisites</h2>

      <table>
        <thead>
          <tr>
            <th>Requirement</th>
            <th>Version</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Python</td>
            <td>3.11+</td>
            <td>Required for the backend</td>
          </tr>
          <tr>
            <td>Node.js</td>
            <td>18.0+</td>
            <td>Required for the frontend</td>
          </tr>
          <tr>
            <td>Hardware</td>
            <td>Any</td>
            <td>macOS (Apple Silicon / Intel), Linux, or Windows. CUDA, MPS, or CPU fallback.</td>
          </tr>
          <tr>
            <td>Disk space</td>
            <td>~2 GB</td>
            <td>~1 GB for the Qwen model cache + dependencies</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2 id="backend-setup">Backend setup</h2>

      <DocsCode
        lang="bash"
        filename="terminal"
        code={`cd backend
python3 -m venv .venv --system-site-packages
source .venv/bin/activate          # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt

# Optional: GGUF execution support
pip install -r requirements-gguf.txt

# Start the API server with auto-reload
python -m uvicorn app.main:app --app-dir . --port 8000 --reload`}
      />

      <p>
        On first startup, the backend automatically downloads{" "}
        <code>Qwen/Qwen2.5-0.5B-Instruct</code> (~1 GB) into the local HuggingFace cache and
        initializes all model hooks. Subsequent startups are fast.
      </p>

      <DocsCallout variant="note">
        <p>
          The backend uses <code>eager</code> attention by default for maximum compatibility. On
          machines with CUDA or MPS, PyTorch will automatically select the appropriate device.
        </p>
      </DocsCallout>

      <h3 id="verify-backend">Verify the backend is running</h3>

      <DocsCode
        lang="bash"
        code={`curl http://localhost:8000/health
# {"status":"ok","model_loaded":true}`}
      />

      <hr />

      <h2 id="frontend-setup">Frontend setup</h2>

      <DocsCode
        lang="bash"
        filename="terminal"
        code={`cd frontend
npm install
npm run dev`}
      />

      <p>
        Navigate to <code>http://localhost:3000</code>. The frontend automatically connects to the
        backend at <code>http://localhost:8000</code>.
      </p>

      <DocsCallout variant="warning">
        <p>
          The frontend requires the backend to be running to load model data. Without the backend,
          the 3D canvas will show a loading state. GGUF drag-and-drop works client-side without the
          backend.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="gguf-only">GGUF-only mode (no Python required)</h2>

      <p>
        You can use the Architecture mode without a running backend by dragging a{" "}
        <code>.gguf</code> file onto the 3D canvas. The browser parses the binary header
        client-side using a TypeScript GGUF parser — no server required. Generation, Walkthrough,
        and Debugger modes require the backend.
      </p>

      <DocsPrevNext slug="installation" />
    </>
  );
}
