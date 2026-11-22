"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  Menu,
  Search,
} from "lucide-react";
import { getSectionForSlug, getPageBySlug } from "@/lib/docsNav";

interface TopBarProps {
  onToggleMobileNav: () => void;
  onOpenSearch?: () => void;
}

export default function TopBar({ onToggleMobileNav, onOpenSearch }: TopBarProps) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const cleanSlug = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
  const isDocsHome = !cleanSlug || cleanSlug === "docs";
  const isDevHome = cleanSlug === "developers";

  const sectionLabel = getSectionForSlug(cleanSlug);
  const pageMeta = getPageBySlug(cleanSlug);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Serialize current article content as Markdown
  const extractArticleMarkdown = (): string => {
    const article = document.querySelector("article.docs-content");
    if (!article) return `# ${pageMeta?.title || "TokenPrint Docs"}\n\n`;

    const title = article.querySelector("h1")?.textContent || pageMeta?.title || "TokenPrint Docs";
    const subtitle = article.querySelector("p.docs-intro")?.textContent || "";
    let md = `# ${title}\n\n`;
    if (subtitle) md += `> ${subtitle}\n\n`;

    const sections = article.querySelectorAll("h2, h3, p, pre, ul, ol");
    sections.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim() || "";
      if (tag === "h2") md += `\n## ${text}\n\n`;
      else if (tag === "h3") md += `\n### ${text}\n\n`;
      else if (tag === "pre") md += `\`\`\`\n${text}\n\`\`\`\n\n`;
      else if (tag === "p" && !el.classList.contains("docs-intro")) md += `${text}\n\n`;
      else if (tag === "ul") md += `${text}\n\n`;
    });

    return md;
  };

  const handleCopyMarkdown = () => {
    const md = extractArticleMarkdown();
    navigator.clipboard.writeText(md);
    setCopied(true);
    setDropdownOpen(false);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenClaude = () => {
    const md = extractArticleMarkdown();
    const prompt = encodeURIComponent(
      `Here is the TokenPrint documentation for "${pageMeta?.title || "Docs"}":\n\n${md.slice(
        0,
        3000
      )}\n\nCan you explain this and help me?`
    );
    window.open(`https://claude.ai/new?q=${prompt}`, "_blank");
    setDropdownOpen(false);
  };

  const handleOpenChatGPT = () => {
    const md = extractArticleMarkdown();
    const prompt = encodeURIComponent(
      `Here is the TokenPrint documentation for "${pageMeta?.title || "Docs"}":\n\n${md.slice(
        0,
        3000
      )}\n\nCan you explain this and help me?`
    );
    window.open(`https://chatgpt.com/?q=${prompt}`, "_blank");
    setDropdownOpen(false);
  };

  return (
    <header className="h-[56px] px-4 lg:px-8 border-b border-[var(--docs-border)] bg-[var(--docs-bg)]/95 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between select-none">
      {/* Left: Mobile hamburger & Brand/Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] transition-colors p-1"
          aria-label="Toggle navigation menu"
        >
          <Menu size={18} strokeWidth={1.5} />
        </button>

        {/* Breadcrumbs in 12px muted text */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] truncate">
          {isDocsHome ? (
            <span className="text-[var(--docs-heading)] font-medium">Docs</span>
          ) : isDevHome ? (
            <>
              <Link
                href="/docs"
                className="text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] transition-colors no-underline"
              >
                Docs
              </Link>
              <span className="text-[var(--docs-border-strong)]">/</span>
              <span className="text-[var(--docs-heading)] font-medium">Developers</span>
            </>
          ) : (
            <>
              <Link
                href="/docs"
                className="text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] transition-colors no-underline"
              >
                Docs
              </Link>
              {sectionLabel && (
                <>
                  <span className="text-[var(--docs-border-strong)]">/</span>
                  <span className="text-[var(--docs-text-muted)] truncate">{sectionLabel}</span>
                </>
              )}
              <span className="text-[var(--docs-border-strong)]">/</span>
              <span className="text-[var(--docs-heading)] font-medium truncate">
                {pageMeta?.title || "Page"}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Compact Search Trigger */}
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-2 h-8 px-2.5 rounded-md border border-[var(--docs-border)] bg-[var(--docs-surface)] text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] hover:border-[var(--docs-border-strong)] transition-colors"
          title="Search docs (⌘K)"
        >
          <Search size={13} strokeWidth={1.5} />
          <span className="text-[12px]">Search docs</span>
          <kbd className="text-[10px] px-1 py-0.5 rounded bg-[var(--docs-bg)] border border-[var(--docs-border)] font-mono text-[var(--docs-text-muted)]">
            ⌘K
          </kbd>
        </button>

        {/* Split Copy Page Button */}
        <div className="relative" ref={dropdownRef}>
          <div className="inline-flex rounded-md border border-[var(--docs-border)] bg-[var(--docs-surface)] overflow-hidden">
            <button
              onClick={handleCopyMarkdown}
              className="h-8 px-2.5 text-[12px] font-medium text-[var(--docs-heading)] hover:bg-[var(--docs-surface-hover)] transition-colors flex items-center gap-1.5"
            >
              {copied ? (
                <Check size={13} className="text-[var(--docs-semantic-success)]" />
              ) : (
                <Copy size={13} strokeWidth={1.5} />
              )}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="h-8 px-1.5 border-l border-[var(--docs-border)] text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] hover:bg-[var(--docs-surface-hover)] transition-colors flex items-center justify-center"
              aria-label="Copy options"
            >
              <ChevronDown size={12} strokeWidth={1.5} />
            </button>
          </div>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-44 rounded-md border border-[var(--docs-border-strong)] bg-[var(--docs-surface-elevated)] shadow-2xl p-1 z-50 animate-in fade-in duration-100">
              <button
                onClick={handleCopyMarkdown}
                className="w-full text-left px-2.5 py-1.5 text-[12px] text-[var(--docs-heading)] hover:bg-[var(--docs-surface-hover)] rounded flex items-center justify-between"
              >
                <span>Markdown</span>
                <span className="text-[10px] text-[var(--docs-text-muted)] font-mono">.md</span>
              </button>
              <button
                onClick={handleOpenClaude}
                className="w-full text-left px-2.5 py-1.5 text-[12px] text-[var(--docs-heading)] hover:bg-[var(--docs-surface-hover)] rounded flex items-center justify-between"
              >
                <span>Ask Claude</span>
                <ExternalLink size={11} strokeWidth={1.5} className="text-[var(--docs-text-muted)]" />
              </button>
              <button
                onClick={handleOpenChatGPT}
                className="w-full text-left px-2.5 py-1.5 text-[12px] text-[var(--docs-heading)] hover:bg-[var(--docs-surface-hover)] rounded flex items-center justify-between"
              >
                <span>Ask ChatGPT</span>
                <ExternalLink size={11} strokeWidth={1.5} className="text-[var(--docs-text-muted)]" />
              </button>
            </div>
          )}
        </div>

        {/* Open App Link */}
        <a
          href="https://tokenprint.in"
          target="_blank"
          rel="noopener noreferrer"
          className="h-8 px-3 rounded-md bg-[var(--docs-surface)] border border-[var(--docs-border)] hover:border-[var(--docs-border-strong)] text-[12px] font-medium text-[var(--docs-heading)] transition-colors inline-flex items-center gap-1.5 no-underline"
        >
          <span>Open app</span>
          <ExternalLink size={11} strokeWidth={1.5} className="text-[var(--docs-text-muted)]" />
        </a>
      </div>
    </header>
  );
}
