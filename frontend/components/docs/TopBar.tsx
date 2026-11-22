"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Copy,
  Check,
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
  const [copied, setCopied] = useState(false);

  const cleanSlug = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
  const isDocsHome = !cleanSlug || cleanSlug === "docs";
  const isDevHome = cleanSlug === "developers";

  const sectionLabel = getSectionForSlug(cleanSlug);
  const pageMeta = getPageBySlug(cleanSlug);

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
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-[52px] px-4 lg:px-8 border-b border-[var(--docs-border)] bg-[var(--docs-bg)]/95 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between select-none">
      {/* Left: Mobile hamburger & Brand/Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="lg:hidden text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu size={16} strokeWidth={1.5} />
        </button>

        {/* Breadcrumbs in 11px muted text without underlines */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] truncate">
          {isDocsHome ? (
            <span className="text-zinc-200 font-medium">Docs</span>
          ) : isDevHome ? (
            <>
              <Link
                href="/docs"
                className="text-zinc-400 hover:text-white transition-colors no-underline"
              >
                Docs
              </Link>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-200 font-medium">Developers</span>
            </>
          ) : (
            <>
              <Link
                href="/docs"
                className="text-zinc-400 hover:text-white transition-colors no-underline"
              >
                Docs
              </Link>
              {sectionLabel && (
                <>
                  <span className="text-zinc-600">/</span>
                  <span className="text-zinc-400 truncate">{sectionLabel}</span>
                </>
              )}
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-200 font-medium truncate">
                {pageMeta?.title || "Page"}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right controls (Lori / Linear Docs Style) */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Rounded Pill Search Trigger */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden sm:inline-flex items-center gap-2 h-8 px-3 rounded-full border border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          title="Search docs (⌘K)"
        >
          <Search size={13} strokeWidth={1.5} />
          <span className="text-[12px]">Search docs</span>
          <kbd className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 border border-white/10 font-mono text-zinc-400 ml-1">
            ⌘K
          </kbd>
        </button>

        {/* Clean Single Copy Button */}
        <button
          type="button"
          onClick={handleCopyMarkdown}
          className="h-7 px-2.5 rounded-md border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-[11.5px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          title="Copy page as Markdown"
        >
          {copied ? (
            <Check size={12} className="text-emerald-400" />
          ) : (
            <Copy size={12} strokeWidth={1.5} />
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>

        {/* GitHub link */}
        <a
          href="https://github.com/Sudharsanselvaraj/Token-Print"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-zinc-400 hover:text-white transition-colors hidden md:inline-block px-1 no-underline"
        >
          GitHub
        </a>

        {/* Open App / Launch White Pill Button */}
        <a
          href="https://tokenprint.in"
          target="_blank"
          rel="noopener noreferrer"
          className="h-7 px-3 rounded-full bg-white text-black font-medium text-[12px] hover:bg-zinc-200 transition-colors inline-flex items-center gap-1.5 no-underline flex-shrink-0"
        >
          <span>Open app</span>
          <ExternalLink size={11} strokeWidth={2} />
        </a>
      </div>
    </header>
  );
}
