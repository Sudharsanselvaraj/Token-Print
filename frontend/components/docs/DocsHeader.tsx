"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface DocsHeaderProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  onSearchClick?: () => void;
}

export default function DocsHeader({
  mobileOpen,
  setMobileOpen,
  onSearchClick,
}: DocsHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="docs-header" aria-label="Documentation Header">
      <div className="docs-header-left">
        {/* Mobile menu hamburger toggle */}
        <button
          className="docs-header-mobile-toggle"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? (
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

        {/* Brand / Logo */}
        <Link href="/docs/introduction" className="docs-header-logo">
          <img
            src="/tokenprint-logo.png"
            alt="TokenPrint"
            className="brand-logo"
            style={{ height: "32px", width: "auto", display: "block" }}
          />
          <span className="docs-header-slash">/</span>
          <span className="docs-header-badge">Docs</span>
        </Link>
      </div>

      {/* Center Search trigger */}
      <button
        className="docs-header-search"
        onClick={onSearchClick}
        aria-label="Search documentation"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="docs-header-search-placeholder">Search docs...</span>
        <kbd className="docs-header-search-kbd">⌘K</kbd>
      </button>

      {/* Right nav controls */}
      <div className="docs-header-right">
        <Link
          href="/docs/introduction"
          className={`docs-header-link${pathname.startsWith("/docs") ? " docs-header-link--active" : ""}`}
        >
          Docs
        </Link>
        <a
          href="https://github.com/Sudharsanselvaraj/Token-Print"
          target="_blank"
          rel="noopener noreferrer"
          className="docs-header-link docs-header-link-ext"
        >
          GitHub
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </a>
        <Link href="/" className="docs-header-btn">
          <span>Open App</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
