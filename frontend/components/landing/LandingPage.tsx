"use client";

import React, { useState } from "react";
import Link from "next/link";
import { assetUrl } from "@/lib/assets";
import { Code2, GitBranch, Layers, Play } from "lucide-react";

import { ComputationalHeroVisual, MicroDotGridVisual, MicroTargetIcon, MicroLightningIcon } from "./LandingVisuals";
import { Reveal } from "./LandingMotion";
import { InspectFlowSection } from "./InspectFlowSection";
import { GithubIcon } from "./GithubIcon";
import { ECOSYSTEM_STACK } from "./EcosystemLogos";

const SHOWCASE_CELLS = [
  {
    img: "/backgrounds/col1_arch.png",
    alt: "Understand the architecture",
    imgClass: "arch-img",
    icon: <Layers size={14} strokeWidth={1.5} className="text-[#A1A1AA]" />,
    title: "Understand the architecture",
    desc: "Inspect layers, tensors, residual streams, and model topology.",
    infoTitle: "Understand the architecture",
    infoPara:
      "See how the model is organized from embeddings through transformer layers, residual streams, and the final prediction.",
    meta: ["LAYERS", "HIDDEN STATE", "MODEL TOPOLOGY"],
  },
  {
    img: "/backgrounds/col2_attn.png",
    alt: "See attention unfold",
    imgClass: "attn-img",
    icon: <GitBranch size={14} strokeWidth={1.5} className="text-[#A1A1AA]" />,
    title: "See attention unfold",
    desc: "Follow Q, K, V, attention scores, RoPE, and weighted values.",
    infoTitle: "See attention unfold",
    infoPara:
      "Follow Q, K, and V through attention, from projections and positional encoding to scores, masking, and weighted values.",
    meta: ["Q / K / V", "ROPE", "ATTENTION WEIGHTS"],
  },
  {
    img: "/backgrounds/col3_gen.png",
    alt: "Watch generation happen",
    imgClass: "gen-img",
    icon: <Play size={14} strokeWidth={1.5} className="text-[#A1A1AA]" />,
    title: "Watch generation happen",
    desc: "Trace prefill, KV cache, decoding, logits, and next-token prediction.",
    infoTitle: "Watch generation happen",
    infoPara:
      "Follow the transition from prefill to decode as hidden states become logits, KV cache state, and the next generated token.",
    meta: ["PREFILL", "KV CACHE", "NEXT TOKEN"],
  },
];

export function LandingPage() {
  const [showcaseTab, setShowcaseTab] = useState<number>(0);
  const [showcaseOpen, setShowcaseOpen] = useState<boolean>(false);

  const handleShowcaseSelect = (i: number) => {
    if (showcaseTab === i && showcaseOpen) {
      setShowcaseOpen(false);
    } else {
      setShowcaseTab(i);
      setShowcaseOpen(true);
    }
  };

  return (
    <div className="landing-root">
      {/* 2. Hero Section — Exact Marshal Experience */}
      <section className="landing-hero">
        <ComputationalHeroVisual />

        <div className="landing-hero-content">
          <Reveal delay={0.1}>
            <h1 className="landing-hero-title">
              Watch a Language Model Think
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="landing-hero-subtitle">
              TokenPrint traces transformer inference as it happens. Follow tokens, tensors, attention, KV cache and generation through a real model.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="landing-hero-actions">
              <Link href="/app?mode=debugger" className="landing-btn-hero-solid">
                <span>Open Debugger</span>
              </Link>
              <Link href="/app?mode=generation&demo=hello-world&tour=1" className="landing-btn-hero-text-link">Try a recorded demo</Link>
              <a
                href="https://github.com/Sudharsanselvaraj/Token-Print"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-btn-hero-text-link"
              >
                <span>View on GitHub</span>
              </a>
            </div>
          </Reveal>
        </div>

        {/* Ecosystem Logos Marquee Strip at Hero Bottom */}
        <div className="landing-hero-bottom-strip">
          <div className="landing-strip-wrapper">
            <div className="landing-strip-track">
              {[...ECOSYSTEM_STACK, ...ECOSYSTEM_STACK, ...ECOSYSTEM_STACK].map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="landing-strip-item" title={item.name}>
                  {item.svg}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Large Editorial Split Section — Exact Marshal Experience */}
      <section className="landing-split-section">
        <div className="landing-container">
          <div className="landing-split-grid">
            {/* Left Column: Brand, Tagline & System Snapshot */}
            <div className="landing-split-left">
              <Reveal delay={0.05} className="landing-split-left-top">
                <p className="landing-eyebrow">Model Inspection</p>
                <h2 className="marshal-brand-title">TokenPrint</h2>
                <p className="marshal-brand-sub">Built for the moments that matter most.</p>
              </Reveal>

              <Reveal delay={0.08} className="landing-split-left-middle">
                <p className="landing-lead-copy">
                  Go beyond the output and inspect the computation behind it. TokenPrint lets you
                  follow tokens, hidden states, attention, residual streams, and logits through a
                  real transformer forward pass — making the model easier to understand, debug, and
                  explore.
                </p>
              </Reveal>

              <Reveal delay={0.1} className="landing-split-left-bottom">
                <p className="marshal-brand-footer">
                  A modern foundation for teams that care about craft and speed.
                </p>
                <a href="#architecture" className="marshal-discover-btn">
                  Discover More
                </a>
              </Reveal>
            </div>

            {/* Right Column: 2x2 Feature Grid */}
            <div className="landing-split-right">
              <div className="marshal-grid-2x2">
                {/* Tile 01 - Top Left */}
                <Reveal delay={0.1} className="marshal-tile">
                  <MicroDotGridVisual />
                  <div className="marshal-tile-body">
                    <h3 className="marshal-tile-title">Real Model Execution</h3>
                    <p className="marshal-tile-copy">
                      Trace real transformer execution from input tokens through embeddings,
                      normalization, attention, MLPs, residual streams and logits.
                    </p>
                  </div>
                </Reveal>

                {/* Tile 02 - Top Right */}
                <Reveal delay={0.15} className="marshal-tile">
                  <div className="marshal-tile-visual dark-visual">
                    <div className="marshal-visual-header">
                      <MicroTargetIcon />
                      <span className="marshal-plus">+</span>
                    </div>
                    <div className="marshal-crosshair-lines">
                      <div className="crosshair-h" />
                      <div className="crosshair-v" />
                    </div>
                  </div>
                  <div className="marshal-tile-body">
                    <h3 className="marshal-tile-title">Every Tensor, Inspectable</h3>
                    <p className="marshal-tile-copy">
                      Inspect tensor shapes, parameters, hidden states, attention weights and
                      model metadata directly inside the computation.
                    </p>
                  </div>
                </Reveal>

                {/* Tile 03 - Bottom Left */}
                <Reveal delay={0.2} className="marshal-tile">
                  <div className="marshal-tile-visual dark-visual">
                    <div className="marshal-visual-header">
                      <MicroLightningIcon />
                      <span className="marshal-plus">+</span>
                    </div>
                  </div>
                  <div className="marshal-tile-body">
                    <h3 className="marshal-tile-title">Token-by-Token Generation</h3>
                    <p className="marshal-tile-copy">
                      Follow a token through the transformer during prefill and decode, with
                      KV-cache state and operation progress visible as inference runs.
                    </p>
                  </div>
                </Reveal>

                {/* Tile 04 - Bottom Right */}
                <Reveal delay={0.25} className="marshal-tile">
                  <div className="marshal-tile-visual image-visual">
                    <div className="marshal-visual-header overlaid">
                      <span />
                      <span className="marshal-plus">+</span>
                    </div>
                    <img
                      src={assetUrl("/backgrounds/ooO9QydwmDfIDysUFcHDwRzdC8.avif")}
                      alt="Attention Decoded"
                      className="marshal-tile-img"
                    />
                  </div>
                  <div className="marshal-tile-body">
                    <h3 className="marshal-tile-title">Attention Decoded</h3>
                    <p className="marshal-tile-copy">
                      Explore Q, K and V projections, grouped-query attention, RoPE, attention
                      scores and weighted values as the computation happens.
                    </p>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* 4.5. Inspect what moves through the model — editorial split */}
      <InspectFlowSection />

      {/* 5. Editorial Feature Showcase Section — Exact Marshal Rhythm & Proportions */}
      <section className="marshal-showcase-section" id="showcase">
        <div className="marshal-showcase-container">
          {/* Section Header */}
          <Reveal delay={0.05}>
            <div className="marshal-showcase-header">
              <h2 className="marshal-showcase-title">See how a model thinks.</h2>
              <p className="marshal-showcase-sub">
                Follow the structures, tensors, and computations behind every prediction.
              </p>
            </div>
          </Reveal>

          {/* Full-width 3-Tab Rail */}
          <Reveal delay={0.1}>
            <div className="marshal-tab-rail-container">
              <div className="marshal-tab-rail">
                <button
                  type="button"
                  className={`marshal-tab-rail-item ${showcaseTab === 0 ? "active" : ""}`}
                  onClick={() => handleShowcaseSelect(0)}
                >
                  <span className="tab-num">01</span> — Architecture
                </button>
                <button
                  type="button"
                  className={`marshal-tab-rail-item ${showcaseTab === 1 ? "active" : ""}`}
                  onClick={() => handleShowcaseSelect(1)}
                >
                  <span className="tab-num">02</span> — Attention
                </button>
                <button
                  type="button"
                  className={`marshal-tab-rail-item ${showcaseTab === 2 ? "active" : ""}`}
                  onClick={() => handleShowcaseSelect(2)}
                >
                  <span className="tab-num">03</span> — Generation
                </button>
              </div>
            </div>
          </Reveal>

          {/* ONE GIANT UNIFIED 3-COLUMN BORDERED COMPOSITION */}
          <div className="marshal-unified-grid">
            {SHOWCASE_CELLS.map((c, i) => {
              const isRevealed = showcaseTab === i && showcaseOpen;
              return (
                <div
                  key={c.title}
                  className={`marshal-grid-cell ${isRevealed ? "active-cell" : ""}`}
                  onClick={() => handleShowcaseSelect(i)}
                >
                  <div className={`marshal-cell-visual-area ${isRevealed ? "revealed" : ""}`}>
                    <img
                      src={assetUrl(c.img)}
                      alt={c.alt}
                      className={`marshal-cell-img ${c.imgClass}`}
                    />
                    <div className="marshal-cell-info">
                      <h4 className="marshal-cell-info-title">{c.infoTitle}</h4>
                      <p className="marshal-cell-info-p">{c.infoPara}</p>
                      <div className="marshal-cell-info-meta">
                        {c.meta.map((m, j) => (
                          <span key={j} className="marshal-cell-meta-item">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="marshal-cell-text-area">
                    <div className="marshal-cell-icon-box">{c.icon}</div>
                    <h3 className="marshal-cell-title">{c.title}</h3>
                    <p className="marshal-cell-desc">{c.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Final Editorial Statement + Large Computational Wave Visual */}
      <section className="landing-closing-section">
        <div className="landing-closing-content">
          <h2 className="landing-closing-title">From token to prediction.</h2>
          <p className="landing-closing-subtitle">See what happens in between.</p>
          <p className="landing-closing-support">
            Every layer. Every tensor. Every step — open for inspection.
          </p>
          <a
            href="https://github.com/Sudharsanselvaraj/Token-Print"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-closing-cta"
          >
            <GithubIcon size={15} />
            <span>Contribute on GitHub</span>
            <span className="closing-cta-arrow">→</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        {/* Wave band at top of footer */}
        <div className="landing-footer-wave-band">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl("/backgrounds/6XkvzY5rYbYfuwU8Ov6xZQo9x4.webp")}
            alt=""
            className="landing-footer-wave-img"
          />
        </div>

        <div className="landing-container">
          <div className="landing-footer-cols">
            <div className="footer-col-brand">
              <Link href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl("/tokenprint-logo.png")} alt="TokenPrint" style={{ height: "30px", width: "auto" }} />
              </Link>
              <p>Interactive LLM & Transformer Visual Debugger.</p>
            </div>

            <div className="footer-col">
              <h4>PRODUCT</h4>
              <ul>
                <li><Link href="/app?mode=explorer">Architecture</Link></li>
                <li><Link href="/app?mode=generation">Generation</Link></li>
                <li><Link href="/app?mode=walkthrough">Walkthrough</Link></li>
                <li><Link href="/app?mode=debugger">Debugger</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>RESOURCES</h4>
              <ul>
                <li><Link href="/docs">Documentation</Link></li>
                <li><Link href="/docs/research">Research</Link></li>
                <li><a href="https://github.com/Sudharsanselvaraj/Token-Print" target="_blank" rel="noopener noreferrer">GitHub</a></li>
                <li><a href="https://github.com/Sudharsanselvaraj/Token-Print/issues" target="_blank" rel="noopener noreferrer">Issues</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>PROJECT</h4>
              <ul>
                <li><Link href="/docs/introduction">About TokenPrint</Link></li>
                <li><a href="https://github.com/Sudharsanselvaraj/Token-Print" target="_blank" rel="noopener noreferrer">Contribute</a></li>
                <li><a href="https://github.com/Sudharsanselvaraj/Token-Print/discussions" target="_blank" rel="noopener noreferrer">Discussions</a></li>
                <li><a href="https://github.com/Sudharsanselvaraj/Token-Print/projects" target="_blank" rel="noopener noreferrer">Roadmap</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>COMMUNITY</h4>
              <ul>
                <li><a href="https://github.com/Sudharsanselvaraj/Token-Print" target="_blank" rel="noopener noreferrer">GitHub</a></li>
                <li><a href="https://x.com/sudharsan_sel" target="_blank" rel="noopener noreferrer">X</a></li>
                <li><a href="mailto:tokenprint.in@gmail.com">Gmail</a></li>
                <li><a href="https://www.linkedin.com/in/sudharsan-s-528a8a2a0/" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Line */}
          <div className="landing-footer-bottom">
            <div className="bottom-left">
              <Code2 size={14} className="text-[#4C86FF]" />
              <span>© 2026 TokenPrint · MIT License</span>
            </div>
            <div className="bottom-right">
              <a href="https://github.com/Sudharsanselvaraj/Token-Print" target="_blank" rel="noopener noreferrer" title="GitHub">
                <GithubIcon size={16} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
