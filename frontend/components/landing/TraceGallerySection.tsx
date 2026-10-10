"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Play, Code2, Download, Copy, Check, Layers, ExternalLink, Sparkles } from "lucide-react";
import { DEMO_TRACES } from "@/lib/demo";
import { assetUrl } from "@/lib/assets";
import { Reveal } from "./LandingMotion";

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
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        className="trace-modal-box"
        style={{
          width: "100%",
          maxWidth: "560px",
          backgroundColor: "#0C0D10",
          border: "1px solid #26262B",
          borderRadius: "10px",
          padding: "24px",
          color: "#F4F4F5",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.8)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 id="embed-modal-title" style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
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

        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", color: "#71717A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
            HTML Embed Code
          </div>
          <pre
            style={{
              backgroundColor: "#14151A",
              border: "1px solid #26262B",
              borderRadius: "6px",
              padding: "12px",
              fontSize: "11px",
              fontFamily: "var(--font-mono, monospace)",
              overflowX: "auto",
              color: "#38BDF8",
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
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
              borderRadius: "6px",
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
              borderRadius: "6px",
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
    </div>
  );
}

export function TraceGallerySection() {
  const [embedModalTrace, setEmbedModalTrace] = useState<{ id: string; title: string } | null>(null);

  return (
    <section id="trace-gallery" className="landing-gallery-section" style={{ padding: "80px 0", borderTop: "1px solid #1C1F26" }}>
      <div className="landing-container">
        {/* Header */}
        <div style={{ maxWidth: "640px", marginBottom: "40px" }}>
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
            <h2
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "#F4F4F5",
                letterSpacing: "-0.02em",
                margin: "0 0 12px",
                lineHeight: 1.2,
              }}
            >
              Community & Curated Trace Gallery
            </h2>
          </Reveal>

          <Reveal delay={0.15}>
            <p
              style={{
                fontSize: "14px",
                color: "#A1A1AA",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Browse verified transformer forward passes. Inspect attention patterns, logits, and residual stream trajectories in real 3D right in your browser — or embed them into course materials.
            </p>
          </Reveal>
        </div>

        {/* Trace Cards Grid */}
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
                  border: "1px solid #26262B",
                  borderRadius: "10px",
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
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        backgroundColor: "rgba(56, 189, 248, 0.1)",
                        border: "1px solid rgba(56, 189, 248, 0.25)",
                        color: "#38BDF8",
                        fontSize: "10px",
                        fontFamily: "var(--font-mono, monospace)",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {trace.architecture}
                    </span>

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
                      borderRadius: "6px",
                      backgroundColor: "#FFFFFF",
                      color: "#09090B",
                      fontSize: "12px",
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "opacity 0.15s ease",
                    }}
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Replay in 3D</span>
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
                      borderRadius: "6px",
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
                      borderRadius: "6px",
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
                border: "1px dashed #26262B",
                borderRadius: "10px",
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
                  width: "40px",
                  height: "40px",
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
                  Capture a real short forward pass with <code style={{ color: "#A1A1AA" }}>scripts/generate-demo-trace.py</code> and submit a PR to add it to the gallery.
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
