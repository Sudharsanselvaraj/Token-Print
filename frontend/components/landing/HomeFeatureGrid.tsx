"use client";

import Link from "next/link";
import { Plus, Layers, Play, Map, Bug, ArrowUpRight } from "lucide-react";
import { Reveal } from "./motion/primitives/Reveal";

interface FeatureCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  copy: string;
  screenshot: string;
  link: string;
}

const FEATURES: FeatureCard[] = [
  {
    id: "architecture",
    icon: <Layers size={15} style={{ color: "#4C86FF" }} />,
    title: "Architecture",
    copy: "Every layer, head, and tensor — inspect the full model graph, params to precision.",
    screenshot: "/screenshots/architecture.png",
    link: "/app?mode=explorer",
  },
  {
    id: "generation",
    icon: <Play size={15} style={{ color: "#4C86FF" }} />,
    title: "Generation",
    copy: "Watch token-by-token generation unfold in real time, embedding by embedding.",
    screenshot: "/screenshots/generation.png",
    link: "/app?mode=generation",
  },
  {
    id: "walkthrough",
    icon: <Map size={15} style={{ color: "#4C86FF" }} />,
    title: "Walkthrough",
    copy: "A guided, chapter-by-chapter tour of the forward pass — from tokens to logits.",
    screenshot: "/screenshots/walkthrough.png",
    link: "/app?mode=walkthrough",
  },
  {
    id: "debugger",
    icon: <Bug size={15} style={{ color: "#4C86FF" }} />,
    title: "Debugger",
    copy: "Set breakpoints and step through execution at any point in the pipeline.",
    screenshot: "/screenshots/debugger.png",
    link: "/app?mode=debugger",
  },
];

export function HomeFeatureGrid() {
  return (
    <section className="home-features-section">
      <div className="home-container">
        <Reveal delay={0.05}>
          <div className="home-section-header">
            <span className="home-eyebrow">CORE CAPABILITIES</span>
            <h2 className="home-section-title">See every part of the model.</h2>
          </div>
        </Reveal>

        {/* 2x2 Feature Grid */}
        <div className="home-grid-container">
          {FEATURES.map((item, idx) => (
            <Reveal key={item.id} delay={0.1 + idx * 0.08}>
              <Link href={item.link} className="home-card">
                <div>
                  {/* Top Bar inside Card */}
                  <div className="home-card-topbar">
                    <div className="home-card-meta">
                      <div className="home-card-icon-box">{item.icon}</div>
                      <span className="home-card-index">0{idx + 1}</span>
                    </div>
                    <div className="home-card-plus">
                      <Plus size={15} />
                    </div>
                  </div>

                  {/* Screenshot Tile */}
                  <div className="home-card-tile">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.screenshot}
                      alt={item.title}
                      className="home-card-img"
                    />
                  </div>
                </div>

                {/* Heading & One-line Copy Below Tile */}
                <div className="home-card-body">
                  <div className="home-card-header">
                    <h3 className="home-card-title">{item.title}</h3>
                    <ArrowUpRight size={16} className="home-card-arrow" />
                  </div>
                  <p className="home-card-desc">{item.copy}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
