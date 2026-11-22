import type { Metadata } from "next";
import DocsCallout from "@/components/docs/DocsCallout";
import DocsMermaid from "@/components/docs/DocsMermaid";
import ImagePanel from "@/components/docs/ImagePanel";

export const metadata: Metadata = {
  title: "System Architecture",
  description: "Comprehensive architectural specifications, data topologies, and execution flows of TokenPrint.",
};

const SYSTEM_OVERVIEW_CHART = `flowchart TD
    subgraph Browser ["Client Runtime (Browser)"]
        UI["Next.js App Router (Static Export)"]
        Canvas3D["React Three Fiber / Three.js 3D Canvas"]
        BrowserWorker["In-Browser GPT-2 (ONNX WebGPU)"]
        GGUFParser["Client-Side GGUF Binary Parser"]
    end

    subgraph HuggingFace ["Hugging Face Space Sandbox"]
        Proxy["HF Edge Proxy (WSS / HTTPS)"]
        Gradio["Gradio ASGI Container (app.py)"]
        FastAPI["FastAPI Backend Service"]
        ZeroGPU["ZeroGPU NVIDIA A10G Slice (@spaces.GPU)"]
        CPUFallback["PyTorch CPU Fallback Engine"]
    end

    subgraph LocalBackend ["Local Developer Environment"]
        LocalFastAPI["Uvicorn / FastAPI Backend"]
        LocalPyTorch["PyTorch (CUDA / Apple MPS / CPU)"]
        LlamaCpp["llama-cpp-python (Local GGUF Runtime)"]
    end

    UI -->|"HTTP REST & WSS Streaming"| Proxy
    Proxy --> Gradio
    Gradio --> FastAPI
    FastAPI -->|"GPU Available"| ZeroGPU
    FastAPI -->|"Quota Exceeded / CPU Mode"| CPUFallback
    UI -.->|"Local Port 8000"| LocalFastAPI
    LocalFastAPI --> LocalPyTorch
    LocalFastAPI --> LlamaCpp
    Canvas3D <--> UI
`;

const INFERENCE_PIPELINE_CHART = `sequenceDiagram
    autonumber
    participant Client as Frontend (Next.js)
    participant API as FastAPI Backend
    participant ZeroGPU as ZeroGPU Runner
    participant PyTorch as Model & Forward Hooks
    participant Collab as Collab WebSocket Broadcaster

    Client->>API: POST /analyze or WSS /ws/generate
    alt ZeroGPU Available
        API->>ZeroGPU: Execute inside @spaces.GPU slice (60s)
        ZeroGPU->>PyTorch: Forward pass with forward hooks
        PyTorch-->>ZeroGPU: Intercepted attention matrices & hidden states
        ZeroGPU-->>API: Serialized tensor payloads
    else ZeroGPU Exhausted / Local CPU
        API->>PyTorch: Execute analyze_cpu_fallback()
        PyTorch-->>API: Extracted attention & top-k logits
    end
    API-->>Client: Stream tokens & activation frames
    opt Collab Room Active
        API->>Collab: Broadcast trace step to peers
        Collab-->>Client: Peer cursor & view synchronization
    end
`;

const INSTRUMENTATION_FLOW_CHART = `flowchart LR
    Input["Input Tokens<br/>[B, S]"] --> Embed["Embedding Layer<br/>[B, S, D]"]
    Embed --> L0["Layer 0: RMSNorm + Self-Attn"]
    L0 -->|"Hook: Capture A0"| Attn0["Attention Matrix<br/>[H, S, S]"]
    L0 -->|"Hook: Logit Lens"| Unembed0["lm_head Projection<br/>Top Tokens L0"]
    L0 -->|"Ablation Mask"| Intervene["Head Mask / Layer Bypass"]
    Intervene --> L1["Layer 1..N-1"]
    L1 --> Final["Final Layer & RMSNorm"]
    Final --> Head["lm_head Unembedding"]
    Head --> Output["Output Top-K Probabilities"]
`;

export default function ArchitectureDocsPage() {
  return (
    <>
      <p className="docs-meta">System &amp; Infrastructure</p>
      <h1>System Architecture</h1>
      <p className="docs-intro">
        TokenPrint is split into a static client-side Next.js frontend and an asynchronous Python backend built with FastAPI, PyTorch, and ZeroGPU sandboxing.
      </p>

      <ImagePanel
        src="/docs/panels/panel-space.webp"
        alt="TokenPrint Hugging Face Spaces & ZeroGPU Deployment"
        caption="ZeroGPU dynamic slicing container, ASGI proxy mounting, and automatic CPU failover."
        annotation="[ HUGGING FACE SPACES · ZEROGPU DYNAMIC SLICING · GRADIO ]"
        priority
      />

      <DocsCallout variant="note" title="Zero Fabrication Guarantee">
        Every component, pipeline, and diagram shown on this page traces to exact implementation code in <code>backend/app/</code> and <code>frontend/</code>.
      </DocsCallout>

      <h2 id="high-level-topology">High-Level Topology</h2>
      <p>
        TokenPrint supports two primary deployment topologies: the hosted production setup on GitHub Pages + Hugging Face Spaces with ZeroGPU acceleration, and the offline local developer stack.
      </p>

      <DocsMermaid chart={SYSTEM_OVERVIEW_CHART} title="Complete System Topology" />

      <h2 id="inference-execution-pipeline">Inference Execution Pipeline</h2>
      <p>
        Forward execution is non-blocking and supports both batch inspection (<code>/analyze</code>) and token-by-token streaming (<code>/ws/generate</code>).
      </p>

      <DocsMermaid chart={INFERENCE_PIPELINE_CHART} title="Inference Execution & ZeroGPU Fallback Sequence" />

      <h2 id="mechanistic-instrumentation">Mechanistic Instrumentation Engine</h2>
      <p>
        Rather than modifying model source code, TokenPrint hooks into PyTorch modules dynamically via <code>register_forward_hook()</code> and <code>register_forward_pre_hook()</code>:
      </p>

      <DocsMermaid chart={INSTRUMENTATION_FLOW_CHART} title="Dynamic Hooking & Interventions Flow" />

      <h2 id="core-architectural-boundaries">Architectural Boundaries &amp; Constraints</h2>
      <ul>
        <li>
          <strong>Hugging Face Spaces ZeroGPU</strong>: Runs inside ephemeral A10G execution slices. Functions are dynamically bound via <code>sys.modules.get(&quot;__main__&quot;)</code>. Daily per-IP quotas automatically fall back to CPU execution.
        </li>
        <li>
          <strong>Quantized GGUF Execution</strong>: Powered by <code>llama.cpp</code> via <code>llama-cpp-python</code>. The hosted Space does not bundle C++ compilers; GGUF generation is strictly a local feature, while client-side header parsing runs in the browser.
        </li>
        <li>
          <strong>Client-Side WebGPU Inference</strong>: GPT-2 is compiled to ONNX and runs entirely inside a dedicated Web Worker via <code>onnxruntime-web</code> with WebGPU acceleration.
        </li>
      </ul>
    </>
  );
}
