"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { assetUrl } from "@/lib/assets";
import { GithubIcon } from "./landing/GithubIcon";

const APP_MODES: { href: string; label: string; mode: string }[] = [
  { href: "/app?mode=explorer", label: "Architecture", mode: "explorer" },
  { href: "/app?mode=generation", label: "Generation", mode: "generation" },
  { href: "/app?mode=walkthrough", label: "Walkthrough", mode: "walkthrough" },
  { href: "/app?mode=debugger", label: "Debugger", mode: "debugger" },
];

function GlobalHeaderInner() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isApp = pathname.startsWith("/app");
  const activeMode = searchParams?.get("mode") ?? (isApp ? "explorer" : null);
  const docsActive = pathname.startsWith("/docs");

  const close = () => setOpen(false);

  return (
    <header
      className={`landing-nav global-nav${scrolled ? " scrolled" : ""}`}
      role="banner"
    >
      <div className="landing-nav-inner">
        {/* Left: Brand Logo */}
        <Link href="/" className="landing-nav-brand" onClick={close} aria-label="TokenPrint home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl("/tokenprint-logo.png")}
            alt="TokenPrint"
            className="brand-logo"
            style={{ height: "36px", width: "auto" }}
          />
        </Link>

        {/* Nav links (desktop) */}
        <nav className="landing-nav-items global-nav-links" aria-label="Primary">
          {APP_MODES.map((item) => (
            <Link
              key={item.mode}
              href={item.href}
              className={"landing-nav-item" + (isApp && activeMode === item.mode ? " active" : "")}
              onClick={close}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/docs"
            className={"landing-nav-item" + (docsActive ? " active" : "")}
            onClick={close}
          >
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

        {/* Mobile menu toggle */}
        <button
          className="global-nav-toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="global-nav-menu" role="group">
          {APP_MODES.map((item) => (
            <Link
              key={item.mode}
              href={item.href}
              className={"landing-nav-item" + (isApp && activeMode === item.mode ? " active" : "")}
              onClick={close}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/docs"
            className={"landing-nav-item" + (docsActive ? " active" : "")}
            onClick={close}
          >
            Docs
          </Link>
          <a
            href="https://github.com/Sudharsanselvaraj/Token-Print"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-nav-item github-nav-item"
            onClick={close}
          >
            <GithubIcon size={14} />
            GitHub
          </a>
        </div>
      )}
    </header>
  );
}

export default function GlobalHeader() {
  return (
    <Suspense fallback={null}>
      <GlobalHeaderInner />
    </Suspense>
  );
}