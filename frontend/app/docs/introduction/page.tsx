import type { Metadata } from "next";
import Link from "next/link";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "Introduction",
  description: "TokenPrint — Interactive LLM & Transformer Visual Debugger.",
};

export default function IntroductionPage() {
  return (
    <>
      <DocsBreadcrumb slug="introduction" title="Introduction" />

      <p className="docs-meta">DOCUMENTATION</p>
      <h1>TokenPrint</h1>
      <p className="docs-intro">
        Interactive LLM &amp; Transformer Visual Debugger. Every value displayed is computed from real parsed model weights or a real forward pass — zero illustrative or faked numbers.
      </p>

      {/* Large technical visual frame (Arble-style hero container) */}
      <div className="docs-image-frame">
        <svg width="100%" height="180" viewBox="0 0 680 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0.5" y="0.5" width="679" height="179" rx="7.5" stroke="#202225" fill="#0A0B0D" />
          {/* Subtle grid pattern */}
          <line x1="40" y1="20" x2="640" y2="20" stroke="#141518" strokeDasharray="4 4" />
          <line x1="40" y1="60" x2="640" y2="60" stroke="#141518" strokeDasharray="4 4" />
          <line x1="40" y1="100" x2="640" y2="100" stroke="#141518" strokeDasharray="4 4" />
          <line x1="40" y1="140" x2="640" y2="140" stroke="#141518" strokeDasharray="4 4" />

          {/* Node sequence representation */}
          <rect x="60" y="70" width="80" height="40" rx="6" fill="#141518" stroke="#383A40" />
          <text x="100" y="94" fill="#F5F5F5" fontSize="12" fontFamily="monospace" textAnchor="middle">Token</text>

          <line x1="140" y1="90" x2="190" y2="90" stroke="#6F737A" strokeWidth="1.5" markerEnd="url(#arrow)" />

          <rect x="190" y="70" width="100" height="40" rx="6" fill="#141518" stroke="#383A40" />
          <text x="240" y="94" fill="#F5F5F5" fontSize="12" fontFamily="monospace" textAnchor="middle">Embedding</text>

          <line x1="290" y1="90" x2="340" y2="90" stroke="#6F737A" strokeWidth="1.5" />

          <rect x="340" y="55" width="120" height="70" rx="6" fill="#141518" stroke="#f5f5f5" strokeWidth="1.5" />
          <text x="400" y="85" fill="#F5F5F5" fontSize="12" fontFamily="monospace" textAnchor="middle">Transformer</text>
          <text x="400" y="103" fill="#6F737A" fontSize="10" fontFamily="monospace" textAnchor="middle">24 Layers • GQA</text>

          <line x1="460" y1="90" x2="510" y2="90" stroke="#6F737A" strokeWidth="1.5" />

          <rect x="510" y="70" width="110" height="40" rx="6" fill="#141518" stroke="#383A40" />
          <text x="565" y="94" fill="#F5F5F5" fontSize="12" fontFamily="monospace" textAnchor="middle">Logits / Softmax</text>
        </svg>
        <p className="docs-image-caption">
          TokenPrint architectural pipeline for Qwen2.5-0.5B — 24 Layers, 14 Q Heads, 2 KV Heads (GQA).
        </p>
      </div>

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

      <DocsPrevNext slug="introduction" />
    </>
  );
}
