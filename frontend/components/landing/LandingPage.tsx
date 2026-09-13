"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Layers,
  Play,
  Map,
  Bug,
  Hash,
  Sliders,
  Cpu,
  RotateCcw,
  ScanLine,
  Eye,
  Network,
  TrendingUp,
  GitBranch,
  Zap,
  GitMerge,
  BarChart2,
  Shuffle,
  Database,
  Box,
  Globe,
  CheckCircle2,
  Code2,
} from "lucide-react";

import {
  ECOSYSTEM_LOGOS,
  PINNED_STORY_STEPS,
  FEATURE_GRID_ITEMS,
  SCIENTIFIC_TRUST_CONCEPTS,
} from "@/lib/landing/content";
import {
  ComputationalHeroVisual,
  PinnedStoryVisual,
  LargeDataFieldVisual,
  MicroDotGridVisual,
  MicroCrosshairVisual,
  MicroTargetIcon,
  MicroLightningIcon,
} from "./LandingVisuals";
import { Reveal, usePinnedScrollProgress } from "./LandingMotion";
import { GithubIcon } from "./GithubIcon";
import { ECOSYSTEM_STACK } from "./EcosystemLogos";

// Icon lookup map for step points
const STEP_ICONS: Record<string, React.ReactNode> = {
  Hash: <Hash size={14} className="text-[#4C86FF]" />,
  Sliders: <Sliders size={14} className="text-[#4C86FF]" />,
  Cpu: <Cpu size={14} className="text-[#4C86FF]" />,
  Layers: <Layers size={14} className="text-[#4C86FF]" />,
  RotateCcw: <RotateCcw size={14} className="text-[#4C86FF]" />,
  ScanLine: <ScanLine size={14} className="text-[#4C86FF]" />,
  Eye: <Eye size={14} className="text-[#4C86FF]" />,
  Network: <Network size={14} className="text-[#4C86FF]" />,
  TrendingUp: <TrendingUp size={14} className="text-[#4C86FF]" />,
  GitBranch: <GitBranch size={14} className="text-[#4C86FF]" />,
  Zap: <Zap size={14} className="text-[#4C86FF]" />,
  GitMerge: <GitMerge size={14} className="text-[#4C86FF]" />,
  BarChart2: <BarChart2 size={14} className="text-[#4C86FF]" />,
  Shuffle: <Shuffle size={14} className="text-[#4C86FF]" />,
  Database: <Database size={14} className="text-[#4C86FF]" />,
};

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  architecture: <Layers size={15} className="text-[#4C86FF]" />,
  generation: <Play size={15} className="text-[#4C86FF]" />,
  walkthrough: <Map size={15} className="text-[#4C86FF]" />,
  debugger: <Bug size={15} className="text-[#4C86FF]" />,
};

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [showcaseTab, setShowcaseTab] = useState<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing-root">
      {/* 1. Restrained Navbar */}
      <header className={`landing-nav${scrolled ? " scrolled" : ""}`}>
        <div className="landing-nav-inner">
          <Link href="/" className="landing-nav-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tokenprint-logo.png"
              alt="TokenPrint"
              className="brand-logo"
              style={{ height: "36px", width: "auto" }}
            />
          </Link>

          <nav className="landing-nav-items">
            <Link href="/app?mode=explorer" className="landing-nav-item">
              Architecture
            </Link>
            <Link href="/app?mode=generation" className="landing-nav-item">
              Generation
            </Link>
            <Link href="/app?mode=walkthrough" className="landing-nav-item">
              Walkthrough
            </Link>
            <Link href="/app?mode=debugger" className="landing-nav-item">
              Debugger
            </Link>
            <Link href="/docs" className="landing-nav-item">
              Docs
            </Link>
            <a
              href="https://github.com/Sudharsanselvaraj/Token-Print"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-nav-item github-nav-item"
            >
              <GithubIcon size={14} />
              GitHub
            </a>
          </nav>
        </div>
      </header>

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
              <Link href="/app" className="landing-btn-hero-solid">
                <span>Open Debugger</span>
              </Link>
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
            {/* Left Column: Brand & Tagline */}
            <div className="landing-split-left">
              <Reveal delay={0.05} className="landing-split-left-top">
                <h2 className="marshal-brand-title">TokenPrint</h2>
                <p className="marshal-brand-sub">Built for the moments that matter most.</p>
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
                    <h3 className="marshal-tile-title">01 — Real Model Execution</h3>
                    <p className="marshal-tile-headline">See what the model actually computes.</p>
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
                    <h3 className="marshal-tile-title">02 — Every Tensor, Inspectable</h3>
                    <p className="marshal-tile-headline">Follow representations at every stage.</p>
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
                    <h3 className="marshal-tile-title">03 — Token-by-Token Generation</h3>
                    <p className="marshal-tile-headline">Watch generation unfold.</p>
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
                      src="/backgrounds/ooO9QydwmDfIDysUFcHDwRzdC8.avif"
                      alt="Attention Decoded"
                      className="marshal-tile-img"
                    />
                  </div>
                  <div className="marshal-tile-body">
                    <h3 className="marshal-tile-title">04 — Attention, Decoded</h3>
                    <p className="marshal-tile-headline">See how tokens interact.</p>
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
                  onClick={() => setShowcaseTab(0)}
                >
                  <span className="tab-num">01</span> — Architecture
                </button>
                <button
                  type="button"
                  className={`marshal-tab-rail-item ${showcaseTab === 1 ? "active" : ""}`}
                  onClick={() => setShowcaseTab(1)}
                >
                  <span className="tab-num">02</span> — Attention
                </button>
                <button
                  type="button"
                  className={`marshal-tab-rail-item ${showcaseTab === 2 ? "active" : ""}`}
                  onClick={() => setShowcaseTab(2)}
                >
                  <span className="tab-num">03</span> — Generation
                </button>
              </div>
            </div>
          </Reveal>

          {/* ONE GIANT UNIFIED 3-COLUMN BORDERED COMPOSITION */}
          <div className="marshal-unified-grid">
            {/* Column 1: Architecture */}
            <div
              className={`marshal-grid-cell ${showcaseTab === 0 ? "active-cell" : ""}`}
              onClick={() => setShowcaseTab(0)}
            >
              <div className="marshal-cell-visual-area">
                <img
                  src="/backgrounds/col1_arch.png"
                  alt="Understand the architecture"
                  className="marshal-cell-img arch-img"
                />
              </div>
              <div className="marshal-cell-text-area">
                <div className="marshal-cell-icon-box">
                  <Layers size={14} strokeWidth={1.5} className="text-[#A1A1AA]" />
                </div>
                <h3 className="marshal-cell-title">Understand the architecture</h3>
                <p className="marshal-cell-desc">
                  Inspect layers, tensors, residual streams, and model topology.
                </p>
              </div>
            </div>

            {/* Column 2: Attention */}
            <div
              className={`marshal-grid-cell ${showcaseTab === 1 ? "active-cell" : ""}`}
              onClick={() => setShowcaseTab(1)}
            >
              <div className="marshal-cell-visual-area">
                <img
                  src="/backgrounds/col2_attn.png"
                  alt="See attention unfold"
                  className="marshal-cell-img attn-img"
                />
              </div>
              <div className="marshal-cell-text-area">
                <div className="marshal-cell-icon-box">
                  <GitBranch size={14} strokeWidth={1.5} className="text-[#A1A1AA]" />
                </div>
                <h3 className="marshal-cell-title">See attention unfold</h3>
                <p className="marshal-cell-desc">
                  Follow Q, K, V, attention scores, RoPE, and weighted values.
                </p>
              </div>
            </div>

            {/* Column 3: Generation */}
            <div
              className={`marshal-grid-cell ${showcaseTab === 2 ? "active-cell" : ""}`}
              onClick={() => setShowcaseTab(2)}
            >
              <div className="marshal-cell-visual-area">
                <img
                  src="/backgrounds/col3_gen.png"
                  alt="Watch generation happen"
                  className="marshal-cell-img gen-img"
                />
              </div>
              <div className="marshal-cell-text-area">
                <div className="marshal-cell-icon-box">
                  <Play size={14} strokeWidth={1.5} className="text-[#A1A1AA]" />
                </div>
                <h3 className="marshal-cell-title">Watch generation happen</h3>
                <p className="marshal-cell-desc">
                  Trace prefill, KV cache, decoding, logits, and next-token prediction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Final Editorial Statement + Large Computational Wave Visual */}
      <section className="landing-closing-section">
        <div className="landing-closing-content">
          <h2 className="landing-closing-title">From token to prediction.</h2>
          <p className="landing-closing-subtitle">Every layer. Every tensor. Every step.</p>
          <Link href="/app" className="landing-closing-cta">
            <span>Open the Debugger</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        {/* Wave band at top of footer */}
        <div className="landing-footer-wave-band">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/backgrounds/6XkvzY5rYbYfuwU8Ov6xZQo9x4.webp"
            alt=""
            className="landing-footer-wave-img"
          />
        </div>

        <div className="landing-container">
          <div className="landing-footer-cols">
            <div className="footer-col-brand">
              <Link href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/tokenprint-logo.png" alt="TokenPrint" style={{ height: "30px", width: "auto" }} />
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
                <li><a href="https://x.com" target="_blank" rel="noopener noreferrer">X</a></li>
                <li><a href="https://youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a></li>
                <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
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
