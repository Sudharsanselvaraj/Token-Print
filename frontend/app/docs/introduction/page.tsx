import type { Metadata } from "next";
import Link from "next/link";
import ImagePanel from "@/components/docs/ImagePanel";

export const metadata: Metadata = {
  title: "Introduction",
  description: "TokenPrint — Interactive LLM & Transformer Visual Debugger.",
};

export default function IntroductionPage() {
  return (
    <>
      <h1>TokenPrint</h1>
      <p className="docs-intro">
        Interactive LLM &amp; Transformer Visual Debugger. Every value displayed is computed from real parsed model weights or a real forward pass — zero illustrative or faked numbers.
      </p>

      {/* Large technical visual frame with real 3D workspace telemetry */}
      <ImagePanel
        src="/docs/panels/hero-explorer.png"
        alt="TokenPrint 3D Transformer Visual Workspace"
        caption="Live 3D telemetry of Qwen2.5-0.5B: 24 transformer layers, embedding projections, and real-time tensor inspection."
        annotation="[ TOKENPRINT WORKSPACE · 3D ARCHITECTURE · 24 LAYERS · LIVE TELEMETRY ]"
        priority
      />

      <hr />

      <h2 id="what-is-tokenprint">What is TokenPrint?</h2>
      <p>
        TokenPrint is designed for machine learning engineers and researchers who need to inspect what is actually happening inside a transformer during inference. Instead of illustrative block diagrams, TokenPrint maps real tensor dimensions, activation norms, attention matrices, and KV cache states directly from backend execution.
      </p>

      <hr />

      <h2 id="how-it-works">How it works</h2>
      <p>
        The backend engine loads standard PyTorch or GGUF model files and executes forward passes while recording step-by-step telemetry. Telemetry is streamed over WebSocket directly to the 3D viewport, rendering individual layers, heads, and residual vectors in real time.
      </p>

      <hr />

      <h2 id="core-concepts">Core concepts</h2>
      <p>
        TokenPrint breaks transformer inference into distinct inspectable operations:
      </p>
      <ul>
        <li><strong>Tokens &amp; Embeddings:</strong> Input text tokenization mapped to continuous vector representations.</li>
        <li><strong>RMSNorm &amp; Residual Streams:</strong> Root Mean Square Normalization applied across hidden states before attention and MLP blocks.</li>
        <li><strong>Grouped Query Attention (GQA):</strong> Efficient multi-head attention where multiple Query heads share key-value heads.</li>
        <li><strong>Rotary Position Embeddings (RoPE):</strong> Complex rotation matrices applied to Queries and Keys to encode position.</li>
        <li><strong>SwiGLU &amp; Logits:</strong> Swish-Gated Linear Units in FFN blocks and final linear output projection.</li>
        <li><strong>Decoding:</strong> Greedy, sampling, sliding window, and speculative strategies for turning logits into generated tokens.</li>
      </ul>

      <hr />

      <h2 id="quick-start">Quick start</h2>
      <p>
        To run TokenPrint locally or inspect a model:
      </p>

      <div className="docs-code-block">
        <div className="docs-code-header">
          <span className="docs-code-lang">bash</span>
        </div>
        <pre className="docs-code-pre">
          <code>{`# Start backend server with reference model (Qwen2.5-0.5B)
cd backend && python3 -m uvicorn app.main:app --port 8000

# Start frontend application
cd frontend && npm run dev`}</code>
        </pre>
      </div>

      <div style={{ marginTop: "32px", marginBottom: "48px" }}>
        <Link href="/" className="docs-header-btn" style={{ padding: "10px 18px", fontSize: "14px" }}>
          <span>Explore TokenPrint →</span>
        </Link>
      </div>
    </>
  );
}
