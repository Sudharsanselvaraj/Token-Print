"use client";

import React from "react";
import Link from "next/link";
import { Search, ChevronRight, ArrowRight } from "lucide-react";
import DocCard from "@/components/docs/DocCard";

export default function DocsHomePage() {
  const handleOpenSearch = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-docs-search"));
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <div>
        <h1 className="text-[30px] font-semibold tracking-[-0.02em] text-[#f4f4f5] mb-2">
          TokenPrint documentation
        </h1>
        <p className="text-[13.5px] text-[#a1a1aa] font-normal max-w-xl leading-relaxed mb-5">
          Guides for exploring transformer internals in 3D, tracing real forward-pass activations, and debugging mechanistic interpretability on live weights.
        </p>

        {/* Hero Search Bar (Matches Lori.sh & Linear Docs) */}
        <button
          type="button"
          onClick={handleOpenSearch}
          className="w-full max-w-lg h-[38px] px-3 rounded-lg border border-[var(--docs-border)] bg-[var(--docs-surface)] hover:border-[var(--docs-border-strong)] hover:bg-[var(--docs-surface-hover)] flex items-center justify-between text-[#777780] text-[12px] transition-colors cursor-pointer group"
          title="Search docs (⌘K)"
        >
          <div className="flex items-center gap-2.5">
            <Search size={14} strokeWidth={1.5} className="text-[#777780] group-hover:text-white transition-colors" />
            <span className="text-[12px] text-[#777780] group-hover:text-[#d1d1d6]">Search the docs</span>
          </div>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--docs-bg)] border border-[var(--docs-border)] font-mono text-[#777780]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* 3 Core Area Cards (Linear / Lori.sh Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <Link
          href="/docs/quick-start"
          className="p-3.5 rounded-[10px] border border-[var(--docs-border)] bg-[var(--docs-surface)] hover:border-[var(--docs-border-strong)] hover:bg-[var(--docs-surface-hover)] transition-all no-underline group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[14px] font-semibold text-[#f4f4f5] tracking-tight">Guides</span>
              <ChevronRight size={13} className="text-[#777780] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-[12px] text-[#a1a1aa] leading-relaxed">
              Run real forward passes, trace attention layers in 3D, and step through autoregressive token generation.
            </p>
          </div>
        </Link>

        <Link
          href="/docs/using/debugger"
          className="p-3.5 rounded-[10px] border border-[var(--docs-border)] bg-[var(--docs-surface)] hover:border-[var(--docs-border-strong)] hover:bg-[var(--docs-surface-hover)] transition-all no-underline group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-[#f4f4f5] tracking-tight">Mechanistic Labs</span>
                <span className="text-[9.5px] px-1.5 py-0.2 rounded font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">Lab</span>
              </div>
              <ChevronRight size={13} className="text-[#777780] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-[12px] text-[#a1a1aa] leading-relaxed">
              Set activation breakpoints, zero attention heads, patch hidden states, and measure causal logit shifts.
            </p>
          </div>
        </Link>

        <Link
          href="/docs/developers"
          className="p-3.5 rounded-[10px] border border-[var(--docs-border)] bg-[var(--docs-surface)] hover:border-[var(--docs-border-strong)] hover:bg-[var(--docs-surface-hover)] transition-all no-underline group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[14px] font-semibold text-[#f4f4f5] tracking-tight">Developers &amp; API</span>
              <ChevronRight size={13} className="text-[#777780] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-[12px] text-[#a1a1aa] leading-relaxed">
              FastAPI backend architecture, ZeroGPU dynamic runner lifecycle, streaming WebSockets, and trace schemas.
            </p>
          </div>
        </Link>
      </div>

      {/* Intro paragraph & Summary Table */}
      <div className="space-y-3.5">
        <p className="text-[13px] text-[#d1d1d6] leading-relaxed">
          TokenPrint is an interactive 3D visual debugger for transformer models. Every tensor dimension, attention weight, and activation norm is computed directly from live model forward passes — zero mocked numbers.
        </p>

        <div className="rounded-[8px] border border-[var(--docs-border)] overflow-hidden">
          <table className="w-full text-left text-[12.5px] border-collapse m-0">
            <thead>
              <tr className="border-b border-[var(--docs-border)] bg-[var(--docs-surface)]/40">
                <th className="py-2 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#777780] w-[160px]">Area</th>
                <th className="py-2 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#777780]">What it&apos;s for</th>
                <th className="py-2 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#777780] w-[130px]">Start here</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--docs-border)]">
              <tr className="hover:bg-[var(--docs-surface-hover)]/40 transition-colors">
                <td className="py-2.5 px-3.5 font-medium text-white">Guides</td>
                <td className="py-2.5 px-3.5 text-[#a1a1aa]">Step-by-step visual exploration, generation walkthrough, camera navigation</td>
                <td className="py-2.5 px-3.5">
                  <Link href="/docs/quick-start" className="text-[#d1d1d6] hover:text-white inline-flex items-center gap-1 group no-underline">
                    <span>Quick start</span>
                    <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </td>
              </tr>
              <tr className="hover:bg-[var(--docs-surface-hover)]/40 transition-colors">
                <td className="py-2.5 px-3.5 font-medium text-white">Mechanistic Labs</td>
                <td className="py-2.5 px-3.5 text-[#a1a1aa]">Head ablation, activation patching, residual stream trajectory analysis</td>
                <td className="py-2.5 px-3.5">
                  <Link href="/docs/concepts/attention" className="text-[#d1d1d6] hover:text-white inline-flex items-center gap-1 group no-underline">
                    <span>Attention</span>
                    <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </td>
              </tr>
              <tr className="hover:bg-[var(--docs-surface-hover)]/40 transition-colors">
                <td className="py-2.5 px-3.5 font-medium text-white">Model Ecosystem</td>
                <td className="py-2.5 px-3.5 text-[#a1a1aa]">Hugging Face Hub models, local GGUF quantization, and browser GPT-2</td>
                <td className="py-2.5 px-3.5">
                  <Link href="/docs/loading-a-model" className="text-[#d1d1d6] hover:text-white inline-flex items-center gap-1 group no-underline">
                    <span>Loading a Model</span>
                    <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </td>
              </tr>
              <tr className="hover:bg-[var(--docs-surface-hover)]/40 transition-colors">
                <td className="py-2.5 px-3.5 font-medium text-white">Developers &amp; API</td>
                <td className="py-2.5 px-3.5 text-[#a1a1aa]">FastAPI Swagger contracts, ZeroGPU runner lifecycle, and WebSockets</td>
                <td className="py-2.5 px-3.5">
                  <Link href="/docs/developers" className="text-[#d1d1d6] hover:text-white inline-flex items-center gap-1 group no-underline">
                    <span>Developers</span>
                    <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Popular Guides Section */}
      <section>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-[17px] font-semibold text-[#f4f4f5] tracking-tight">
            Popular guides
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-[17px] font-semibold text-[#f4f4f5] tracking-tight">
            Architecture &amp; Platform
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <DocCard
            href="/docs/using/3d-architecture"
            title="3D Architecture Viewport"
            description="Explore the 24-layer transformer tower, SwiGLU MLP funnels, and attention geometry in 3D."
            imageSrc="/docs/raw/real-explorer.png"
            iconName="Cpu"
          />
          <DocCard
            href="/docs/loading-a-model"
            title="Supported Architectures"
            description="Discover supported Hugging Face Hub models including Qwen 2.5, Llama 3, Gemma 2, and Mistral."
            imageSrc="/docs/raw/model-card.png"
            iconName="Cpu"
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
            href="/docs/compatibility-matrix"
            title="Compatibility Matrix"
            description="Six-stage verification status across architecture discovery, inference, and attention hooks."
            imageSrc="/docs/raw/matrix-card.png"
            iconName="Table"
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
