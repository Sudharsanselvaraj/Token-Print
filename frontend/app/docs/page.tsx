"use client";

import React from "react";
import Link from "next/link";
import LinearIcon from "@/components/docs/LinearIcon";

const POPULAR_CARDS = [
  {
    title: "Start Guide",
    description: "Learn the essentials and start inspecting real forward passes in TokenPrint",
    icon: "BookOpen",
    href: "/docs/introduction",
  },
  {
    title: "Model Explorer",
    description: "Inspect 24 layers, attention dimensions, and local GGUF quantized tensors",
    icon: "Layers",
    href: "/docs/using/model-explorer",
  },
  {
    title: "Interactive Debugger",
    description: "Step through execution, pause inference, and inspect activations in real time",
    icon: "Sliders",
    href: "/docs/using/debugger",
  },
  {
    title: "API Reference",
    description: "Connect to the FastAPI inference engine and real-time WebSocket telemetry",
    icon: "Terminal",
    href: "/docs/api-reference",
  },
];

const EXPLORE_CARDS = [
  {
    title: "Attention & RoPE",
    description: "Multi-head attention matrices, Q/K/V projections, and rotary embeddings",
    icon: "Network",
    href: "/docs/concepts/attention",
  },
  {
    title: "Residual Streams",
    description: "Hidden state trajectories, RMSNorm scaling, and SwiGLU activation norms",
    icon: "Activity",
    href: "/docs/concepts/residual-streams",
  },
  {
    title: "Logit Lens",
    description: "Early vocabulary prediction readout across intermediate transformer layers",
    icon: "Eye",
    href: "/docs/concepts/logits",
  },
  {
    title: "Activation Patching",
    description: "Causal intervention experiments on individual heads to trace knowledge",
    icon: "Zap",
    href: "/docs/concepts/tokens",
  },
];

export default function DocsHomePage() {
  return (
    <div className="space-y-12 w-full max-w-[1240px]">
      {/* Linear Docs Hero */}
      <div>
        <h1 className="text-[34px] font-semibold tracking-[-0.02em] text-white mb-2.5">
          TokenPrint Docs
        </h1>
        <p className="text-[15px] text-[#8a8f98] font-normal max-w-2xl leading-relaxed">
          Get an overview of TokenPrint&apos;s features, mechanistic interpretability, and how to use them.
        </p>
      </div>

      {/* Popular Section (Spacious 4-column grid matching Linear Docs Image 5) */}
      <section>
        <h2 className="text-[17px] font-semibold text-white tracking-tight mb-4">
          Popular
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {POPULAR_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="min-h-[195px] p-6 rounded-xl bg-[#141518] border border-white/[0.08] hover:border-white/20 transition-all no-underline flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <LinearIcon
                  name={card.icon}
                  size={19}
                  className="text-[#8a8f98] group-hover:text-white transition-colors"
                />
              </div>
              <div className="pt-6">
                <div className="text-[15px] font-semibold text-white tracking-tight mb-1.5 group-hover:text-white transition-colors">
                  {card.title}
                </div>
                <div className="text-[13px] text-[#8a8f98] leading-[1.5] group-hover:text-[#a1a1aa] transition-colors">
                  {card.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Explore Section (Spacious 4-column grid matching Linear Docs Image 5) */}
      <section>
        <h2 className="text-[17px] font-semibold text-white tracking-tight mb-4">
          Explore TokenPrint
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {EXPLORE_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="min-h-[195px] p-6 rounded-xl bg-[#141518] border border-white/[0.08] hover:border-white/20 transition-all no-underline flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <LinearIcon
                  name={card.icon}
                  size={19}
                  className="text-[#8a8f98] group-hover:text-white transition-colors"
                />
              </div>
              <div className="pt-6">
                <div className="text-[15px] font-semibold text-white tracking-tight mb-1.5 group-hover:text-white transition-colors">
                  {card.title}
                </div>
                <div className="text-[13px] text-[#8a8f98] leading-[1.5] group-hover:text-[#a1a1aa] transition-colors">
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
