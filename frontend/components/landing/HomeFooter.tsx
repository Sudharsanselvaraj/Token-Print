"use client";

import React from "react";
import Link from "next/link";
import {
  Code2,
  Box,
  Database,
  Zap,
  Cpu,
  Layers,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { GithubIcon } from "./GithubIcon";

const FOOTER_MARKS = [
  { name: "Hugging Face", icon: <Box size={15} strokeWidth={1.5} className="text-[#A1A1AA]" /> },
  { name: "GGUF", icon: <Database size={15} strokeWidth={1.5} className="text-[#A1A1AA]" /> },
  { name: "PyTorch", icon: <Zap size={15} strokeWidth={1.5} className="text-[#A1A1AA]" /> },
  { name: "FastAPI", icon: <Cpu size={15} strokeWidth={1.5} className="text-[#A1A1AA]" /> },
  { name: "Next.js", icon: <Layers size={15} strokeWidth={1.5} className="text-[#A1A1AA]" /> },
  { name: "React Three Fiber", icon: <Globe size={15} strokeWidth={1.5} className="text-[#A1A1AA]" /> },
  { name: "GitHub", icon: <GithubIcon size={15} className="text-[#A1A1AA]" /> },
  { name: "MIT License", icon: <CheckCircle2 size={15} strokeWidth={1.5} className="text-[#A1A1AA]" /> },
];

export function HomeFooter() {
  return (
    <footer className="home-footer">
      {/* 1. Large Computational Wave Visual Asset */}
      <div className="home-footer-wave-section">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/backgrounds/vp4ZmztrjAphkATuR4JIP18ALQ.svg"
          alt="TokenPrint computational wave visual"
          className="home-footer-wave-img"
        />
      </div>

      <div className="home-container">
        {/* 2. 2x4 Bordered Ecosystem Grid (Exact Marshal Mark Grid) */}
        <div className="home-footer-mark-grid">
          {FOOTER_MARKS.map((mark) => (
            <div key={mark.name} className="home-footer-mark-cell">
              {mark.icon}
              <span className="home-footer-mark-label">{mark.name}</span>
            </div>
          ))}
        </div>

        {/* 3. Link Columns */}
        <div className="home-footer-grid">
          {/* Brand Info */}
          <div className="home-footer-brand">
            <Link href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/tokenprint-logo.png"
                alt="TokenPrint"
                style={{ height: "34px", width: "auto" }}
              />
            </Link>
            <p>
              Interactive LLM & Transformer Visual Debugger.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="home-footer-col-title">PRODUCT</h4>
            <ul className="home-footer-list">
              <li>
                <Link href="/app?mode=explorer">Architecture</Link>
              </li>
              <li>
                <Link href="/app?mode=generation">Generation</Link>
              </li>
              <li>
                <Link href="/app?mode=walkthrough">Walkthrough</Link>
              </li>
              <li>
                <Link href="/app?mode=debugger">Debugger</Link>
              </li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="home-footer-col-title">RESOURCES</h4>
            <ul className="home-footer-list">
              <li>
                <Link href="/docs">Documentation</Link>
              </li>
              <li>
                <a
                  href="https://github.com/Sudharsanselvaraj/Token-Print"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Sudharsanselvaraj/Token-Print/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Issues
                </a>
              </li>
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h4 className="home-footer-col-title">COMMUNITY</h4>
            <ul className="home-footer-list">
              <li>
                <Link href="/docs/introduction">About TokenPrint</Link>
              </li>
              <li>
                <a
                  href="https://github.com/Sudharsanselvaraj/Token-Print"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Community & Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 4. Bottom Legal Line */}
        <div className="home-footer-bottom">
          <div className="bottom-left">
            <Code2 size={14} className="text-[#4C86FF]" />
            <span>© 2026 TokenPrint · MIT License</span>
          </div>
          <div className="bottom-right">
            <a
              href="https://github.com/Sudharsanselvaraj/Token-Print"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit" }}
              title="GitHub"
            >
              <GithubIcon size={16} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
