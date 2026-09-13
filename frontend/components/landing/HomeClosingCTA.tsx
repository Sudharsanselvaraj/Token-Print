"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GithubIcon } from "./GithubIcon";
import { Reveal } from "./motion/primitives/Reveal";

export function HomeClosingCTA() {
  return (
    <section className="home-cta-section">
      <div className="home-container" style={{ maxWidth: "800px" }}>
        <Reveal delay={0.05}>
          <h2 className="home-cta-title">Load a model and start tracing.</h2>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="home-cta-sub">
            Inspect real transformer layer representations and KV cache states in seconds — zero proprietary backend required.
          </p>
        </Reveal>

        <Reveal delay={0.25}>
          <div className="home-hero-ctas">
            <Link href="/app" className="home-btn-lg-primary">
              <span>Open the Debugger</span>
              <ArrowRight size={15} />
            </Link>
            <a
              href="https://github.com/Sudharsanselvaraj/Token-Print"
              target="_blank"
              rel="noopener noreferrer"
              className="home-btn-lg-outline"
            >
              <GithubIcon size={15} />
              <span>Star on GitHub</span>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
