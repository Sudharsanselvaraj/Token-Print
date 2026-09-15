"use client";

import React from "react";
import { Reveal } from "./LandingMotion";
import { MicroTensorIcon, MicroAttentionIcon } from "./LandingVisuals";
import { GithubIcon } from "./GithubIcon";
import { assetUrl } from "@/lib/assets";

function ImageVisual({ tag, src }: { tag: string; src: string }) {
  return (
    <div className="marshal-tile-visual image-visual">
      <div className="marshal-visual-header overlaid">
        <span className="tech-visual-tag">{tag}</span>
        <span className="marshal-plus">+</span>
      </div>
      <img src={assetUrl(src)} alt="" className="marshal-tile-img" />
    </div>
  );
}

function InspectGridPanel() {
  return (
    <div className="marshal-grid-2x2">
      <Reveal delay={0.1} className="marshal-tile">
        <ImageVisual tag="INPUT" src="/backgrounds/inspect-input.png" />
        <div className="marshal-tile-body">
          <h3 className="marshal-tile-title">Token → Embedding</h3>
          <p className="marshal-tile-copy">Tokens bind to an index and resolve into dense vectors.</p>
        </div>
      </Reveal>

      <Reveal delay={0.15} className="marshal-tile">
        <div className="marshal-tile-visual dark-visual">
          <div className="marshal-visual-header">
            <MicroTensorIcon />
            <span className="marshal-plus">+</span>
          </div>
        </div>
        <div className="marshal-tile-body">
          <h3 className="marshal-tile-title">Hidden State</h3>
          <p className="marshal-tile-copy">Shapes, activations, and residual streams at every depth.</p>
        </div>
      </Reveal>

      <Reveal delay={0.2} className="marshal-tile">
        <div className="marshal-tile-visual dark-visual">
          <div className="marshal-visual-header">
            <MicroAttentionIcon />
            <span className="marshal-plus">+</span>
          </div>
        </div>
        <div className="marshal-tile-body">
          <h3 className="marshal-tile-title">Attention</h3>
          <p className="marshal-tile-copy">Q, K, and V projections and the scores that combine them.</p>
        </div>
      </Reveal>

      <Reveal delay={0.25} className="marshal-tile">
        <ImageVisual tag="DECODE" src="/backgrounds/inspect-generation.png" />
        <div className="marshal-tile-body">
          <h3 className="marshal-tile-title">Generation</h3>
          <p className="marshal-tile-copy">Prefill, the KV cache, and logits choosing the next token.</p>
        </div>
      </Reveal>
    </div>
  );
}

export function InspectFlowSection() {
  return (
    <section className="inspect-section">
      <div className="inspect-container">
        <div className="inspect-grid">
          {/* LEFT: 2x2 technical grid (mirrored composition) */}
          <Reveal delay={0.05} className="inspect-grid-panel">
            <InspectGridPanel />
          </Reveal>

          {/* RIGHT: editorial copy — mirrors capability section's heading + tagline */}
          <div className="inspect-copy">
            <div>
              <Reveal delay={0.1}>
                <h2 className="inspect-heading">Inspect what moves through the model.</h2>
              </Reveal>
              <Reveal delay={0.15}>
                <p className="inspect-sub">
                  Follow tokens, representations, and operations as they pass through every stage of inference.
                </p>
              </Reveal>
            </div>

            <Reveal delay={0.2} className="inspect-cta-wrap">
              <a
                href="https://github.com/Sudharsanselvaraj/Token-Print"
                target="_blank"
                rel="noreferrer"
                className="marshal-discover-btn inspect-github-cta"
              >
                <GithubIcon size={15} />
                <span>Contribute on GitHub</span>
                <span className="inspect-cta-arrow">→</span>
              </a>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}