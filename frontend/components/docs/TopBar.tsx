"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  Menu,
} from "lucide-react";
import { getSectionForSlug, getPageBySlug } from "@/lib/docsNav";

interface TopBarProps {
  onToggleMobileNav: () => void;
  onOpenSearch?: () => void;
}

export default function TopBar({ onToggleMobileNav }: TopBarProps) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const cleanSlug = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
  const isDocsHome = !cleanSlug || cleanSlug === "docs";
  const isDevHome = cleanSlug === "developers";

  const sectionLabel = getSectionForSlug(cleanSlug);
  const pageMeta = getPageBySlug(cleanSlug);

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
    <header className="h-[48px] px-4 lg:px-7 border-b border-white/[0.07] bg-[#08090a]/95 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between select-none">
      {/* Left: Mobile hamburger & Linear-style Breadcrumbs */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="lg:hidden text-[#8a8f98] hover:text-white transition-colors p-1 cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu size={15} strokeWidth={1.5} />
        </button>

        {/* Breadcrumbs matching Linear Docs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11.5px] truncate">
          {isDocsHome ? (
            <span className="text-white font-medium">Home</span>
          ) : isDevHome ? (
            <>
              <Link
                href="/docs"
                className="text-[#8a8f98] hover:text-white transition-colors no-underline"
              >
                Docs
              </Link>
              <span className="text-[#4a4d53]">/</span>
              <span className="text-white font-medium">Developers</span>
            </>
          ) : (
            <>
              {sectionLabel && (
                <>
                  <span className="text-[#8a8f98] truncate">{sectionLabel}</span>
                  <span className="text-[#4a4d53]">/</span>
                </>
              )}
              <span className="text-white font-medium truncate">
                {pageMeta?.title || "Page"}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right controls matching Linear Docs */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Compact Copy Page Split Button */}
        {!isDocsHome && (
          <div className="relative" ref={dropdownRef}>
            <div className="inline-flex items-center h-[26px] rounded-[5px] bg-[#16171a] border border-white/10 hover:border-white/20 text-[#c4c7cf] hover:text-white transition-colors">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="h-full px-2 flex items-center gap-1.5 text-[11px] font-[450] text-inherit bg-transparent border-0 cursor-pointer"
                title="Copy page as Markdown"
              >
                {copied ? (
                  <Check size={11} className="text-emerald-400" />
                ) : (
                  <Copy size={11} strokeWidth={1.5} />
                )}
                <span>{copied ? "Copied" : "Copy page"}</span>
              </button>
              <div className="h-3 w-px bg-white/10" />
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="h-full px-1 flex items-center justify-center text-[#8a8f98] hover:text-white bg-transparent border-0 cursor-pointer"
                aria-label="Copy options"
              >
                <ChevronDown size={9} strokeWidth={1.5} />
              </button>
            </div>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-36 rounded-md border border-white/10 bg-[#16171a] shadow-2xl p-1 z-50 animate-in fade-in duration-100">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="w-full text-left px-2 py-1 text-[11px] text-[#c4c7cf] hover:text-white hover:bg-white/[0.06] rounded flex items-center justify-between cursor-pointer"
                >
                  <span>Markdown</span>
                  <span className="text-[9.5px] text-[#8a8f98] font-mono">.md</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenClaude}
                  className="w-full text-left px-2 py-1 text-[11px] text-[#c4c7cf] hover:text-white hover:bg-white/[0.06] rounded flex items-center justify-between cursor-pointer"
                >
                  <span>Ask Claude</span>
                  <ExternalLink size={10} strokeWidth={1.5} className="text-[#8a8f98]" />
                </button>
                <button
                  type="button"
                  onClick={handleOpenChatGPT}
                  className="w-full text-left px-2 py-1 text-[11px] text-[#c4c7cf] hover:text-white hover:bg-white/[0.06] rounded flex items-center justify-between cursor-pointer"
                >
                  <span>Ask ChatGPT</span>
                  <ExternalLink size={10} strokeWidth={1.5} className="text-[#8a8f98]" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Compact Open App Button */}
        <a
          href="/"
          className="h-[26px] px-2.5 rounded-full border border-white/10 hover:border-white/25 bg-[#16171a] hover:bg-[#202227] text-white text-[11px] font-medium inline-flex items-center transition-colors no-underline"
        >
          <span>Open app</span>
        </a>
      </div>
    </header>
  );
}
