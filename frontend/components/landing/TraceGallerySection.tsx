"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Play,
  Code2,
  Download,
  Copy,
  Check,
  Layers,
  ExternalLink,
  Sparkles,
  Terminal,
  MonitorPlay,
  Eye,
} from "lucide-react";
import { DEMO_TRACES } from "@/lib/demo";
import { assetUrl } from "@/lib/assets";
import { Reveal } from "./LandingMotion";
import { CardCarousel, CarouselItem } from "@/components/ui/card-carousel";
import { Badge } from "@/components/ui/badge";
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

  const embedUrl = `https://tokenprint.org/app?mode=generation&demo=${encodeURIComponent(traceId)}&embed=true`;
  const embedCode = `<iframe\n  src="${embedUrl}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  allow="fullscreen"\n  loading="lazy"\n  title="${title} - TokenPrint 3D Inspector"\n></iframe>`;

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
        color="var(--color-blue-500, #38BDF8)"
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
                color: "#38BDF8",
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
                border: "1px solid #38BDF8",
                backgroundColor: "#0284C7",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
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
  const [showLiveEmbedPreview, setShowLiveEmbedPreview] = useState<boolean>(false);

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
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#38BDF8",
                marginBottom: "12px",
              }}
            >
              <Sparkles size={13} />
              <span>Verified Replays · Zero GPU Required</span>
            </div>
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
              badgeIcon={<Sparkles className="fill-[#38BDF8] stroke-1 text-sky-400 mr-1.5" size={14} />}
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

        {/* 2. Unified Abstracted Interactive Embed Player Frame */}
        <Reveal delay={0.25}>
          <div style={{ marginBottom: "40px", width: "100%" }}>
            <FocusFrameBorder
              duration={2.4}
              color="var(--color-blue-500, #38BDF8)"
              className="w-full shadow-[0_0_50px_rgba(56,189,248,0.18)]"
            >
              {/* Frame Header Bar */}
              <div
                style={{
                  backgroundColor: "#0C0D10",
                  padding: "20px 24px",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  borderBottom: showLiveEmbedPreview ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(56, 189, 248, 0.1)",
                      border: "1px solid rgba(56, 189, 248, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#38BDF8",
                    }}
                  >
                    <MonitorPlay size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#F4F4F5" }}>
                      Interactive Embed Player
                    </h4>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#A1A1AA" }}>
                      Live embed preview for blog authors, course educators, and documentation maintainers.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setShowLiveEmbedPreview(!showLiveEmbedPreview)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      backgroundColor: showLiveEmbedPreview ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.05)",
                      color: showLiveEmbedPreview ? "#38BDF8" : "#F4F4F5",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Eye size={13} color={showLiveEmbedPreview ? "#38BDF8" : "#F4F4F5"} />
                    <span style={{ color: showLiveEmbedPreview ? "#38BDF8" : "#F4F4F5", fontWeight: 600 }}>
                      {showLiveEmbedPreview ? "Hide Live Player" : "Preview Live Embed Player"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmbedModalTrace({ id: "hello-world", title: "Inside a real forward pass" })}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#0284C7",
                      border: "1px solid #38BDF8",
                      color: "#FFFFFF",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <Code2 size={13} color="#FFFFFF" />
                    <span style={{ color: "#FFFFFF", fontWeight: 600 }}>Get Iframe Code</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Live Embed Player inside the same unified frame */}
              {showLiveEmbedPreview && (
                <div style={{ width: "100%", backgroundColor: "#050505" }}>
                  <div
                    style={{
                      padding: "10px 18px",
                      backgroundColor: "#0A0B0E",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      color: "#A1A1AA",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10B981", boxShadow: "0 0 8px #10B981" }} />
                      <span style={{ fontFamily: "var(--font-mono, monospace)", color: "#38BDF8", fontSize: "11px", fontWeight: 500 }}>
                        &lt;iframe src="/app?mode=generation&demo=hello-world&embed=true" /&gt;
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", color: "#71717A", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono, monospace)" }}>
                      Live Embed Sandbox
                    </span>
                  </div>
                  <iframe
                    src="/app?mode=generation&demo=hello-world"
                    width="100%"
                    height="560"
                    style={{ border: "none", display: "block" }}
                    title="TokenPrint Live Embed Player"
                  />
                </div>
              )}
            </FocusFrameBorder>
          </div>
        </Reveal>

        {/* 3. Catalog Trace Grid & Contribution Callout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          {DEMO_TRACES.map((trace, idx) => (
            <Reveal key={trace.id} delay={0.1 + idx * 0.05}>
              <div
                style={{
                  backgroundColor: "#0C0D10",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "16px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                  transition: "border-color 0.2s ease, transform 0.2s ease",
                }}
                className="trace-card-hover"
              >
                <div>
                  {/* Card badges */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "16px" }}>
                    <Badge
                      variant="outline"
                      className="border-sky-400/30 bg-sky-950/60 text-sky-400 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5"
                    >
                      {trace.architecture}
                    </Badge>

                    <span
                      style={{
                        fontSize: "11px",
                        color: "#71717A",
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    >
                      {trace.tokenCount} tokens
                    </span>
                  </div>

                  {/* Title & Model */}
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "#F4F4F5",
                      margin: "0 0 6px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {trace.title}
                  </h3>

                  <div
                    style={{
                      fontSize: "11px",
                      color: "#A1A1AA",
                      fontFamily: "var(--font-mono, monospace)",
                      marginBottom: "12px",
                    }}
                  >
                    {trace.model}
                  </div>

                  <p
                    style={{
                      fontSize: "13px",
                      color: "#A1A1AA",
                      lineHeight: 1.5,
                      margin: "0 0 16px",
                    }}
                  >
                    {trace.description}
                  </p>

                  {/* Tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
                    {trace.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: "#18181B",
                          color: "#71717A",
                          border: "1px solid #26262B",
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ paddingTop: "16px", borderTop: "1px solid #1C1F26", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Link
                    href={`/app?mode=generation&demo=${trace.id}&tour=1`}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#FFFFFF",
                      color: "#09090B",
                      fontSize: "12px",
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "opacity 0.15s ease",
                    }}
                  >
                    <Play size={12} fill="#09090B" color="#09090B" />
                    <span style={{ color: "#09090B", fontWeight: 700 }}>Replay in 3D</span>
                  </Link>

                  <button
                    onClick={() => setEmbedModalTrace({ id: trace.id, title: trace.title })}
                    type="button"
                    title="Get embed iframe code"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #26262B",
                      backgroundColor: "#18181B",
                      color: "#A1A1AA",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    <Code2 size={14} />
                  </button>

                  <a
                    href={assetUrl(trace.filePath)}
                    download
                    title="Download real trace JSON"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #26262B",
                      backgroundColor: "#18181B",
                      color: "#A1A1AA",
                      fontSize: "12px",
                      textDecoration: "none",
                    }}
                  >
                    <Download size={14} />
                  </a>
                </div>
              </div>
            </Reveal>
          ))}

          {/* Callout Card: Contribute a Trace */}
          <Reveal delay={0.2}>
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.015)",
                border: "1px dashed rgba(255, 255, 255, 0.15)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                height: "100%",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  backgroundColor: "#18181B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#38BDF8",
                }}
              >
                <Layers size={18} />
              </div>

              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 600, color: "#F4F4F5" }}>
                  Record & Contribute a Trace
                </h4>
                <p style={{ margin: 0, fontSize: "12px", color: "#71717A", lineHeight: 1.5, maxWidth: "260px" }}>
                  Capture a real short forward pass with <code style={{ color: "#38BDF8" }}>scripts/generate-demo-trace.py</code> and submit a PR to add it to the gallery.
                </p>
              </div>

              <a
                href="https://github.com/Sudharsanselvaraj/Token-Print/blob/main/docs/contributor-examples.md"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#38BDF8",
                  textDecoration: "none",
                  marginTop: "6px",
                }}
              >
                <span>Read contributor docs</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </Reveal>
        </div>
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
