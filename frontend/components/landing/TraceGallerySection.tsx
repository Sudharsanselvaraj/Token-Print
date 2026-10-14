"use client";

import React, { useState } from "react";
import { Code2, Copy, Check, Sparkles } from "lucide-react";
import { Reveal } from "./LandingMotion";
import { CardCarousel, CarouselItem } from "@/components/ui/card-carousel";
import FocusFrameBorder from "@/components/ui/shine-border-06";

interface TraceEmbedModalProps {
  traceId: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

function TraceEmbedModal({ traceId, title, isOpen, onClose }: TraceEmbedModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const embedUrl = `https://tokenprint.org/app/?mode=generation&demo=${encodeURIComponent(traceId)}&embed=true&autoplay=true`;
  const embedCode = `<iframe\n  src="${embedUrl}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  allow="autoplay; fullscreen"\n  loading="lazy"\n  title="${title} - TokenPrint 3D Inspector"\n></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="trace-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="embed-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <FocusFrameBorder
        duration={2.4}
        color="rgba(255, 255, 255, 0.45)"
        className="trace-modal-box w-full max-w-[580px] shadow-[0_28px_60px_rgba(0,0,0,0.9)]"
      >
        <div style={{ padding: "26px", color: "#F4F4F5" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 id="embed-modal-title" style={{ margin: 0, fontSize: "17px", fontWeight: 600 }}>
                Embed 3D Trace
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#A1A1AA" }}>
                Embed this interactive 3D forward pass in your course, blog, or documentation.
              </p>
            </div>
            <button
              onClick={onClose}
              type="button"
              aria-label="Close"
              style={{
                background: "transparent",
                border: "none",
                color: "#71717A",
                fontSize: "18px",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "11px", color: "#71717A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
              HTML Iframe Snippet
            </div>
            <pre
              style={{
                backgroundColor: "#14151A",
                border: "1px solid #26262B",
                borderRadius: "8px",
                padding: "14px",
                fontSize: "11px",
                fontFamily: "var(--font-mono, monospace)",
                overflowX: "auto",
                color: "#E2E8F0",
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                lineHeight: 1.5,
              }}
            >
              {embedCode}
            </pre>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              onClick={onClose}
              type="button"
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #26262B",
                backgroundColor: "transparent",
                color: "#A1A1AA",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCopy}
              type="button"
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #FFFFFF",
                backgroundColor: "#FFFFFF",
                color: "#000000",
                fontSize: "12px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              {copied ? <Check size={14} color="#000000" /> : <Copy size={14} color="#000000" />}
              {copied ? "Copied to Clipboard!" : "Copy Embed Code"}
            </button>
          </div>
        </div>
      </FocusFrameBorder>
    </div>
  );
}

export function TraceGallerySection() {
  const [embedModalTrace, setEmbedModalTrace] = useState<{ id: string; title: string } | null>(null);

  // Gallery items formatted for the 3D Card Carousel
  const carouselItems: CarouselItem[] = [
    {
      id: "trace-hello-world",
      src: "/screenshots/generation.png",
      alt: "Qwen2.5-0.5B Greedy Decode Trace",
      badge: "QWEN2 · 16 TOKENS",
      title: "Inside a Real Forward Pass",
      subtitle: "Qwen/Qwen2.5-0.5B-Instruct",
      description: "Follow a recorded causal LM generation, inspect its predictions, and explore captured attention patterns in real 3D.",
      tags: ["recorded", "greedy", "qwen2", "logits"],
      primaryAction: {
        label: "Replay in 3D",
        href: "/app?mode=generation&demo=hello-world&tour=1",
      },
      secondaryAction: {
        title: "Get Embed Code",
        icon: <Code2 size={13} />,
        onClick: () => setEmbedModalTrace({ id: "hello-world", title: "Inside a real forward pass" }),
      },
    },
    {
      id: "trace-architecture-flow",
      src: "/screenshots/architecture.png",
      alt: "Attention Heads & Residual Streams",
      badge: "ATTENTION · 32 HEADS",
      title: "Attention Heads & Residual Trajectory",
      subtitle: "Transformer Geometry",
      description: "Step through multi-head self-attention projections, rotary positional embeddings, and residual stream accumulation.",
      tags: ["attention", "rope", "residual-stream"],
      primaryAction: {
        label: "Inspect 3D Geometry",
        href: "/app?mode=explorer",
      },
      secondaryAction: {
        title: "Get Embed Code",
        icon: <Code2 size={13} />,
        onClick: () => setEmbedModalTrace({ id: "hello-world", title: "Attention Heads & Residual Trajectory" }),
      },
    },
    {
      id: "trace-matrix-debugger",
      src: "/screenshots/debugger.png",
      alt: "Tensor-by-Tensor Matrix Debugger",
      badge: "DEBUGGER · EXACT TENSORS",
      title: "Tensor Matrix Inspection",
      subtitle: "Zero Synthetic Data",
      description: "Inspect precision logits, hidden states at layer boundaries, and exact activation values across all forward passes.",
      tags: ["matrix", "activations", "logits"],
      primaryAction: {
        label: "Launch Debugger",
        href: "/app?mode=debugger",
      },
      secondaryAction: {
        title: "Get Embed Code",
        icon: <Code2 size={13} />,
        onClick: () => setEmbedModalTrace({ id: "hello-world", title: "Tensor Matrix Inspection" }),
      },
    },
    {
      id: "trace-guided-walkthrough",
      src: "/screenshots/walkthrough.png",
      alt: "Guided Concept Walkthrough",
      badge: "TUTORIAL · ZERO GPU",
      title: "Interactive Transformer Walkthrough",
      subtitle: "Step-by-Step Educational Tour",
      description: "Explore the computational flow of modern LLMs from input tokenization to final temperature softmax sampling.",
      tags: ["tutorial", "education", "walkthrough"],
      primaryAction: {
        label: "Start Walkthrough",
        href: "/app?mode=walkthrough",
      },
      secondaryAction: {
        title: "Get Embed Code",
        icon: <Code2 size={13} />,
        onClick: () => setEmbedModalTrace({ id: "hello-world", title: "Interactive Transformer Walkthrough" }),
      },
    },
  ];

  return (
    <section id="trace-gallery" className="landing-gallery-section" style={{ padding: "80px 0", borderTop: "1px solid #1C1F26" }}>
      <div className="landing-container">
        {/* Section Header */}
        <div style={{ maxWidth: "680px", margin: "0 auto 40px", textAlign: "center" }}>
          <Reveal delay={0.05}>
            <p className="landing-eyebrow">
              Verified Replays · Zero GPU Required
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="marshal-showcase-title text-4xl font-light tracking-tight text-white mb-3">
              Community & Curated Trace Gallery
            </h2>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="marshal-showcase-sub">
              Browse verified transformer forward passes. Inspect attention patterns, logits, and residual stream trajectories in real 3D right in your browser — or embed them directly into course materials.
            </p>
          </Reveal>
        </div>

        {/* 1. The 3D Card Carousel for Curated Traces */}
        <Reveal delay={0.2}>
          <div style={{ marginBottom: "48px" }}>
            <CardCarousel
              badgeText="Curated 3D Traces"
              badgeIcon={<Sparkles className="fill-white stroke-1 text-white/80 mr-1.5" size={14} />}
              title="Interactive Trace Replays"
              subtitle="Swipe through verified model passes. Click Replay to inspect in real 3D, or copy embed codes for your documentation."
              items={carouselItems}
              autoplayDelay={3000}
              showPagination={true}
              showNavigation={true}
              maxWidth="max-w-5xl"
            />
          </div>
        </Reveal>

        {/* 2. Interactive 3D Tensor Sandbox */}
        <Reveal delay={0.25}>
          <div style={{ width: "100%", marginBottom: "16px" }}>
            <h3
              className="marshal-showcase-title"
              style={{
                fontSize: "26px",
                textAlign: "center",
                marginBottom: "24px",
                fontWeight: 300,
                color: "#FFFFFF",
              }}
            >
              Interactive 3D Tensor Sandbox
            </h3>

            <FocusFrameBorder
              duration={2.4}
              color="rgba(255, 255, 255, 0.45)"
              className="w-full overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.06)]"
            >
              <iframe
                src="/app/?mode=generation&demo=hello-world&embed=true&autoplay=true"
                width="100%"
                height="620"
                style={{ border: "none", display: "block" }}
                title="Interactive 3D Tensor Sandbox"
                allow="autoplay; fullscreen"
                loading="lazy"
              />
            </FocusFrameBorder>
          </div>
        </Reveal>
      </div>

      {embedModalTrace && (
        <TraceEmbedModal
          traceId={embedModalTrace.id}
          title={embedModalTrace.title}
          isOpen={Boolean(embedModalTrace)}
          onClose={() => setEmbedModalTrace(null)}
        />
      )}
    </section>
  );
}
