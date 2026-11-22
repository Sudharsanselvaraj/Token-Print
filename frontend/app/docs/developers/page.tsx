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
    <div className="space-y-12 w-full max-w-[1240px]">
      {/* Hero Header */}
      <div>
        <h1 className="text-[34px] font-semibold tracking-[-0.02em] text-white mb-2.5">
          TokenPrint Developers
        </h1>
        <p className="text-[15px] text-[#8a8f98] font-normal max-w-2xl leading-relaxed">
          Build integrations with TokenPrint REST endpoints, streaming WebSocket channels, and model inspection hooks.
        </p>
      </div>

      {/* Getting Started Section */}
      <section>
        <h2 className="text-[17px] font-semibold text-white tracking-tight mb-4">
          Getting Started
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DocCard
            href="/docs/api-reference"
            title="API Overview"
            description="Complete interactive reference covering all FastAPI endpoints with cURL, Python, and JavaScript snippets."
            iconName="Terminal"
            tag="REST"
          />
          <DocCard
            href="/docs/api-reference"
            title="Model Inference"
            description="POST /analyze extracts attention tensors, 3D PCA projections, and hidden state norms across 24 layers."
            iconName="Network"
            tag="Inference"
          />
          <DocCard
            href="/docs/api-reference"
            title="WebSocket Streaming"
            description="Real-time autoregressive token generation with backpressure and client-driven queue streaming over /ws/generate."
            iconName="Zap"
            tag="WS"
          />
          <DocCard
            href="/openapi.json"
            title="OpenAPI Spec"
            description="Download the raw OpenAPI 3.1.0 JSON contract directly to generate client libraries or SDK bindings."
            iconName="FileCode"
            tag="JSON"
          />
        </div>
      </section>

      {/* Developer Guides */}
      <section>
        <h2 className="text-[17px] font-semibold text-white tracking-tight mb-4">
          Guides &amp; Tooling
        </h2>

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
            iconName="Boxes"
          />
          <DocCard
            href="/docs/verification"
            title="Verification Suite"
            description="Continuous integration test harness verifying zero Math.random or simulated values reach app code."
            iconName="Shield"
          />
        </div>
      </section>

      {/* Interactive API Explorer */}
      <section className="pt-8 border-t border-white/[0.08]">
        <div className="mb-4">
          <h2 className="text-[17px] font-semibold text-white tracking-tight mb-1">
            API Explorer
          </h2>
          <p className="text-[13px] text-[#8a8f98]">
            Interactive testing harness for TokenPrint backend routes.
          </p>
        </div>

        <DocsApiExplorer />
      </section>
    </div>
  );
}
