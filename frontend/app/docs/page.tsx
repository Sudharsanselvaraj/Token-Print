"use client";

import React from "react";
import Link from "next/link";
import LinearIcon from "@/components/docs/LinearIcon";

const POPULAR_CARDS = [
  {
    title: "Start Guide",
    description: "Learn the essentials and start inspecting transformers in TokenPrint",
    icon: "BookOpen",
    href: "/docs/introduction",
  },
  {
    title: "Model Explorer",
    description: "Inspect 24 layers, attention dimensions, and GGUF quantized tensors",
    icon: "Layers",
    href: "/docs/using/model-explorer",
  },
  {
    title: "Interactive Debugger",
    description: "Step through forward passes and freeze activations in real time",
    icon: "Sliders",
    href: "/docs/using/debugger",
  },
  {
    title: "API Reference",
    description: "Connect to the FastAPI inference engine and WebSocket telemetry",
    icon: "Terminal",
    href: "/docs/api-reference",
  },
];

const EXPLORE_CARDS = [
  {
    title: "Attention & RoPE",
    description: "Multi-head attention matrices, Q/K/V projections and rotary embeddings",
    icon: "Network",
    href: "/docs/concepts/attention",
  },
  {
    title: "Residual Streams",
    description: "Hidden state trajectories, RMSNorm scaling, and SwiGLU activations",
    icon: "Activity",
    href: "/docs/concepts/residual-streams",
  },
  {
    title: "Logit Lens",
    description: "Decode intermediate predictions before final unembedding",
    icon: "Eye",
    href: "/docs/concepts/logits",
  },
  {
    title: "Activation Patching",
    description: "Causal intervention experiments on individual attention heads",
    icon: "Zap",
    href: "/docs/concepts/tokens",
  },
];

export default function DocsHomePage() {
  return (
    <div className="space-y-10 max-w-[1040px]">
      {/* Linear Docs Hero */}
      <div>
        <h1 className="text-[34px] font-semibold tracking-[-0.02em] text-white mb-2">
          TokenPrint Docs
        </h1>
        <p className="text-[15px] text-[#8a8f98] font-normal max-w-2xl leading-relaxed">
          Get an overview of TokenPrint&apos;s features, mechanistic interpretability, and how to use them.
        </p>
      </div>

      {/* Popular Section (4-column grid matching Linear Docs) */}
      <section>
        <h2 className="text-[17px] font-semibold text-white tracking-tight mb-4">
          Popular
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {POPULAR_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="min-h-[160px] p-4.5 rounded-xl bg-[#141518] border border-white/[0.08] hover:border-white/20 transition-all no-underline flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <LinearIcon
                  name={card.icon}
                  size={18}
                  className="text-[#8a8f98] group-hover:text-white transition-colors"
                />
              </div>
              <div className="pt-8">
                <div className="text-[14px] font-medium text-white mb-1 group-hover:text-white transition-colors">
                  {card.title}
                </div>
                <div className="text-[12px] text-[#8a8f98] leading-snug line-clamp-2">
                  {card.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Explore Section (4-column grid matching Linear Docs) */}
      <section>
        <h2 className="text-[17px] font-semibold text-white tracking-tight mb-4">
          Explore TokenPrint
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {EXPLORE_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="min-h-[160px] p-4.5 rounded-xl bg-[#141518] border border-white/[0.08] hover:border-white/20 transition-all no-underline flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <LinearIcon
                  name={card.icon}
                  size={18}
                  className="text-[#8a8f98] group-hover:text-white transition-colors"
                />
              </div>
              <div className="pt-8">
                <div className="text-[14px] font-medium text-white mb-1 group-hover:text-white transition-colors">
                  {card.title}
                </div>
                <div className="text-[12px] text-[#8a8f98] leading-snug line-clamp-2">
                  {card.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
