import React from "react";
import type { Metadata } from "next";
import DocCard from "@/components/docs/DocCard";

export const metadata: Metadata = {
  title: "TokenPrint Docs — 3D Transformer Debugger",
  description:
    "Comprehensive documentation for TokenPrint: inspect attention matrices, RoPE embeddings, KV caches, and residual stream trajectories in real time.",
};

export default function DocsHomePage() {
  return (
    <div className="space-y-14">
      {/* Hero Header */}
      <div>
        <div className="text-[11.5px] uppercase font-mono tracking-wider text-[var(--docs-accent)] mb-2 font-medium">
          TOKENPRINT DOCUMENTATION
        </div>
        <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.02em] text-[var(--docs-heading)] mb-3">
          TokenPrint Docs
        </h1>
        <p className="text-[15px] text-[var(--docs-text-secondary)] font-normal max-w-2xl leading-relaxed">
          Watch your model think. Explore transformer internals, model execution and mechanistic interpretability with real forward-pass telemetry.
        </p>
      </div>

      {/* Popular Section */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[20px] font-semibold text-[var(--docs-heading)] tracking-tight">
            Popular
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DocCard
            href="/docs/concepts/attention"
            title="Attention & QKV"
            description="Inspect multi-head attention matrices, query-key dot products, and GQA geometry clustering."
            imageSrc="/docs/raw/attention-card.png"
            iconName="Graph"
            tag="Core"
          />
          <DocCard
            href="/docs/using/model-explorer"
            title="Model Explorer & GGUF"
            description="Client-side quantized GGUF parsing, metadata discovery, and zero-install offline inspection."
            imageSrc="/docs/raw/gguf-card.png"
            iconName="Cube"
            tag="GGUF"
          />
          <DocCard
            href="/docs/using/walkthrough"
            title="Generation Walkthrough"
            description="Step-by-step token decoding, KV cache expansion, and real top-k probability distributions."
            imageSrc="/docs/raw/walkthrough-card.png"
            iconName="Lightning"
            tag="Decode"
          />
          <DocCard
            href="/docs/using/debugger"
            title="Debugger & Ablation"
            description="Set activation breakpoints, zero attention heads, and measure causal logit shifts."
            imageSrc="/docs/raw/debugger-card.png"
            iconName="Bug"
            tag="Lab"
          />
        </div>
      </section>

      {/* Explore TokenPrint Section */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[20px] font-semibold text-[var(--docs-heading)] tracking-tight">
            Explore TokenPrint
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DocCard
            href="/docs/loading-a-model"
            title="Supported Architectures"
            description="Discover supported Hugging Face Hub models including Qwen 2.5, Llama 3, Gemma 2, and Mistral."
            imageSrc="/docs/raw/model-card.png"
            iconName="Cpu"
          />
          <DocCard
            href="/docs/compatibility-matrix"
            title="Compatibility Matrix"
            description="Six-stage verification status across architecture discovery, inference, and attention hooks."
            imageSrc="/docs/raw/matrix-card.png"
            iconName="Table"
          />
          <DocCard
            href="/docs/concepts/logits"
            title="Logit Lens & Hidden States"
            description="Decode intermediate vocabulary predictions at every transformer layer to observe early token collapse."
            imageSrc="/docs/raw/logits-card.png"
            iconName="Layers"
          />
          <DocCard
            href="/docs/architecture"
            title="Hugging Face Space & ZeroGPU"
            description="ZeroGPU dynamic slicing, ASGI reverse proxy mounting, and automatic CPU failover lifecycles."
            imageSrc="/docs/raw/space-card.png"
            iconName="Cloud"
          />
          <DocCard
            href="/docs/developers"
            title="Developers & API Reference"
            description="FastAPI OpenAPI contracts, streaming WebSocket endpoints, and cURL / Python code snippets."
            imageSrc="/docs/raw/api-card.png"
            iconName="TerminalWindow"
          />
          <DocCard
            href="/docs/contributing"
            title="Contributing & Community"
            description="Development setup, verified pull request guidelines, Discord community, and good first issues."
            imageSrc="/docs/raw/community-card.png"
            iconName="GitPullRequest"
          />
        </div>
      </section>
    </div>
  );
}
