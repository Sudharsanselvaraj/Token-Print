"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GithubIcon } from "./GithubIcon";
import { Reveal } from "./motion/primitives/Reveal";

export function HomeHero() {
  return (
    <section className="home-hero">
      {/* Real Background Texture Asset from ~/Downloads/tokenprint assets */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/backgrounds/eNoaAZe2UbngDtDinHWdsSg4GRI.svg"
        alt=""
        aria-hidden="true"
        className="home-hero-bg-asset"
      />

      <div className="home-container" style={{ position: "relative", zIndex: 10, maxWidth: "860px" }}>
        <Reveal delay={0.05}>
          <div className="home-hero-badge">
            <span className="home-badge-dot" />
            <span className="home-badge-text">
              OPEN-SOURCE VISUAL DEBUGGER FOR LLM EXECUTION
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <h1 className="home-hero-headline">
            Watch a language model <span style={{ textDecoration: "underline", textDecorationColor: "rgba(76, 134, 255, 0.4)", textUnderlineOffset: "8px" }}>think</span>.
          </h1>
        </Reveal>

        <Reveal delay={0.25}>
          <p className="home-hero-subhead">
            TokenPrint traces every layer, token, and cache state of a real model — architecture, generation, and attention, all inspectable in the browser.
          </p>
        </Reveal>

        <Reveal delay={0.35}>
          <div className="home-hero-ctas">
            <Link href="/app" className="landing-btn-hero-solid">
              <span>Open Debugger</span>
              <ArrowRight size={15} />
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
    </section>
  );
}
