import React from "react";
import type { Metadata } from "next";
import DocCard from "@/components/docs/DocCard";
import DocsApiExplorer from "@/components/docs/DocsApiExplorer";

export const metadata: Metadata = {
  title: "TokenPrint Developers — API & Integration Reference",
  description:
    "Developer documentation for TokenPrint: FastAPI REST routes, streaming WebSockets, ZeroGPU lifecycles, and model inference contracts.",
};

export default function DevelopersPage() {
  return (
    <div className="space-y-16">
      {/* Hero Header */}
      <div>
        <h1 className="text-[52px] sm:text-[60px] font-semibold tracking-[-0.03em] text-[var(--text)] mb-3">
          TokenPrint Developers
        </h1>
        <p className="text-[19px] text-[var(--muted)] font-normal max-w-2xl leading-relaxed">
          Build integrations with TokenPrint REST endpoints, streaming WebSocket channels, and model inspection hooks.
        </p>
      </div>

      {/* Getting Started Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-medium text-[var(--text)] tracking-tight">
            Getting Started
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DocCard
            href="/docs/api-reference"
            title="API Overview"
            description="Complete interactive reference covering all FastAPI endpoints with cURL, Python, and JavaScript snippets."
            iconName="TerminalWindow"
            tag="REST"
          />
          <DocCard
            href="/docs/api-reference"
            title="Model Inference"
            description="POST /analyze extracts attention tensors, 3D PCA projections, and hidden state norms across 24 layers."
            iconName="Graph"
            tag="Inference"
          />
          <DocCard
            href="/docs/api-reference"
            title="WebSocket Streaming"
            description="Real-time autoregressive token generation with backpressure and client-driven queue streaming over /ws/generate."
            iconName="Lightning"
            tag="WS"
          />
          <DocCard
            href="/openapi.json"
            title="OpenAPI Spec"
            description="Download the raw OpenAPI 3.1.0 JSON contract directly to generate client libraries or SDK bindings."
            iconName="DownloadSimple"
            tag="JSON"
          />
        </div>
      </section>

      {/* Developer Guides */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-medium text-[var(--text)] tracking-tight">
            Guides & Tooling
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DocCard
            href="/docs/trace-schema"
            title="Trace Recording & Replay"
            description="Serialize and replay complete forward-pass state dumps for deterministic offline analysis."
            iconName="FileText"
          />
          <DocCard
            href="/docs/using/model-explorer"
            title="Quantized GGUF Loading"
            description="Upload and parse local .gguf models with llama.cpp quantization metadata client-side."
            iconName="Cube"
          />
          <DocCard
            href="/docs/verification"
            title="Verification Suite"
            description="Continuous integration test harness verifying zero Math.random or simulated values reach app code."
            iconName="ShieldCheck"
          />
        </div>
      </section>

      {/* Interactive API Explorer */}
      <section className="pt-8 border-t border-[var(--border)]">
        <div className="mb-6">
          <h2 className="text-[24px] font-medium text-[var(--text)] tracking-tight mb-2">
            API Explorer
          </h2>
          <p className="text-[15px] text-[var(--muted)]">
            Explore live request contracts and response schemas directly against your local backend.
          </p>
        </div>
        <DocsApiExplorer />
      </section>
    </div>
  );
}
