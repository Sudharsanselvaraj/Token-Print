"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { assetUrl } from "@/lib/assets";

export function HomeNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`home-navbar${scrolled ? " scrolled" : ""}`}>
      <div className="home-navbar-inner">
        {/* Left: Brand Logo */}
        <Link href="/" className="home-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl("/tokenprint-logo.png")}
            alt="TokenPrint"
            className="brand-logo"
            style={{ height: "32px", width: "auto" }}
          />
        </Link>

        {/* Nav links right after logo */}
        <nav className="home-nav-links">
          <Link href="/app?mode=explorer" className="home-nav-link">
            Architecture
          </Link>
          <Link href="/app?mode=generation" className="home-nav-link">
            Generation
          </Link>
          <Link href="/app?mode=walkthrough" className="home-nav-link">
            Walkthrough
          </Link>
          <Link href="/app?mode=debugger" className="home-nav-link">
            Debugger
          </Link>
          <Link href="/docs" className="home-nav-link">
            Docs
          </Link>
          <a
            href="https://github.com/Sudharsanselvaraj/Token-Print"
            target="_blank"
            rel="noopener noreferrer"
            className="home-nav-link"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
