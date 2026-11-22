"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sun,
  Moon,
  Copy,
  CaretDown,
  ArrowSquareOut,
  List,
  Check,
} from "@phosphor-icons/react";
import { getSectionForSlug, getPageBySlug } from "@/lib/docsNav";

interface TopBarProps {
  onToggleMobileNav: () => void;
}

export default function TopBar({ onToggleMobileNav }: TopBarProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const cleanSlug = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
  const isDocsHome = !cleanSlug || cleanSlug === "docs";
  const isDevHome = cleanSlug === "developers";

  const isDevelopers = pathname.startsWith("/docs/developers") || pathname === "/docs/api-reference";
  const sectionLabel = getSectionForSlug(cleanSlug, isDevelopers);
  const pageMeta = getPageBySlug(cleanSlug, isDevelopers);

  // Sync theme with data-theme on html
  useEffect(() => {
    const savedTheme = (localStorage.getItem("tp_docs_theme") as "dark" | "light") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("tp_docs_theme", nextTheme);
  };

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
    const subtitle = article.querySelector("p.docs-subtitle")?.textContent || "";
    let md = `# ${title}\n\n`;
    if (subtitle) md += `> ${subtitle}\n\n`;

    const sections = article.querySelectorAll("h2, h3, p, pre, ul, ol");
    sections.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim() || "";
      if (tag === "h2") md += `\n## ${text}\n\n`;
      else if (tag === "h3") md += `\n### ${text}\n\n`;
      else if (tag === "pre") md += `\`\`\`\n${text}\n\`\`\`\n\n`;
      else if (tag === "p" && !el.classList.contains("docs-subtitle")) md += `${text}\n\n`;
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
    const prompt = encodeURIComponent(`Here is the TokenPrint documentation for "${pageMeta?.title || "Docs"}":\n\n${md.slice(0, 3000)}\n\nCan you explain this and help me?`);
    window.open(`https://claude.ai/new?q=${prompt}`, "_blank");
    setDropdownOpen(false);
  };

  const handleOpenChatGPT = () => {
    const md = extractArticleMarkdown();
    const prompt = encodeURIComponent(`Here is the TokenPrint documentation for "${pageMeta?.title || "Docs"}":\n\n${md.slice(0, 3000)}\n\nCan you explain this and help me?`);
    window.open(`https://chatgpt.com/?q=${prompt}`, "_blank");
    setDropdownOpen(false);
  };

  return (
    <header className="h-[56px] px-6 lg:px-8 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between select-none">
      {/* Left: Mobile hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden text-[var(--muted)] hover:text-[var(--text)] transition-colors p-1"
          aria-label="Toggle navigation menu"
        >
          <List size={20} weight="bold" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[17px] tracking-tight">
          {isDocsHome ? (
            <span className="text-[var(--text)] font-medium">Home</span>
          ) : isDevHome ? (
            <>
              <Link href="/docs" className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">
                Docs
              </Link>
              <span className="text-[var(--faint)]">/</span>
              <span className="text-[var(--text)] font-medium">Developers</span>
            </>
          ) : (
            <>
              {sectionLabel && (
                <>
                  <span className="text-[var(--muted)]">{sectionLabel}</span>
                  <span className="text-[var(--faint)]">/</span>
                </>
              )}
              <span className="text-[var(--text)] font-medium">{pageMeta?.title || "Page"}</span>
            </>
          )}
        </nav>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2.5">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-colors duration-150"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun size={17} weight="fill" /> : <Moon size={17} weight="fill" />}
        </button>

        {/* Split Copy Page Button */}
        <div className="relative" ref={dropdownRef}>
          <div className="inline-flex rounded-md border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <button
              onClick={handleCopyMarkdown}
              className="h-8 px-3 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--border)] transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="fill" />}
              <span>{copied ? "Copied" : "Copy page"}</span>
            </button>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="h-8 px-1.5 border-l border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors flex items-center justify-center"
              aria-label="Copy options"
            >
              <CaretDown size={12} weight="bold" />
            </button>
          </div>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-lg border border-[var(--border-strong)] bg-[var(--card)] shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={handleCopyMarkdown}
                className="w-full text-left px-3 py-1.5 text-[13px] text-[var(--text)] hover:bg-[var(--border)] rounded flex items-center justify-between"
              >
                <span>Copy as Markdown</span>
                <Copy size={13} weight="fill" className="text-[var(--muted)]" />
              </button>
              <button
                onClick={handleOpenClaude}
                className="w-full text-left px-3 py-1.5 text-[13px] text-[var(--text)] hover:bg-[var(--border)] rounded flex items-center justify-between"
              >
                <span>Open in Claude</span>
                <ArrowSquareOut size={13} weight="bold" className="text-[var(--muted)]" />
              </button>
              <button
                onClick={handleOpenChatGPT}
                className="w-full text-left px-3 py-1.5 text-[13px] text-[var(--text)] hover:bg-[var(--border)] rounded flex items-center justify-between"
              >
                <span>Open in ChatGPT</span>
                <ArrowSquareOut size={13} weight="bold" className="text-[var(--muted)]" />
              </button>
            </div>
          )}
        </div>

        {/* Pill "Open app" Button */}
        <a
          href="https://tokenprint.in"
          target="_blank"
          rel="noopener noreferrer"
          className="h-8 px-3.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[13px] font-medium text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--border)] transition-colors flex items-center gap-1.5"
        >
          <span>Open app</span>
          <ArrowSquareOut size={13} weight="bold" className="text-[var(--muted)]" />
        </a>
      </div>
    </header>
  );
}
