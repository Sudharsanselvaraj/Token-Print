"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, FileText, ArrowRight, X, Command } from "@phosphor-icons/react";
import { ALL_DOC_PAGES, getSectionForSlug } from "@/lib/docsNav";
import LinearIcon from "./LinearIcon";

interface DocsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DocsSearchModal({ isOpen, onClose }: DocsSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return ALL_DOC_PAGES.slice(0, 8);
    }
    const q = query.toLowerCase().trim();
    return ALL_DOC_PAGES.filter((page) => {
      const section = getSectionForSlug(page.slug) || "";
      return (
        page.title.toLowerCase().includes(q) ||
        page.slug.toLowerCase().includes(q) ||
        section.toLowerCase().includes(q)
      );
    }).slice(0, 10);
  }, [query]);

  // Keyboard navigation inside modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
      } else if (e.key === "Enter" && searchResults[activeIndex]) {
        e.preventDefault();
        const page = searchResults[activeIndex];
        onClose();
        router.push(`/docs/${page.slug}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, searchResults, activeIndex, router, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl rounded-[14px] border border-[var(--border-strong)] bg-[var(--card)] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--border)] gap-3 bg-[var(--sidebar)]">
          <MagnifyingGlass size={18} weight="bold" className="text-[var(--muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search documentation, guides, and API endpoints..."
            className="flex-1 bg-transparent border-none text-[15px] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--text)] transition-colors p-1"
            aria-label="Close search modal"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 scrollbar-none">
          {searchResults.length === 0 ? (
            <div className="py-12 text-center text-[14px] text-[var(--muted)]">
              No matching pages found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              {searchResults.map((page, idx) => {
                const active = idx === activeIndex;
                const section = getSectionForSlug(page.slug);

                return (
                  <button
                    key={page.slug + idx}
                    onClick={() => {
                      onClose();
                      router.push(`/docs/${page.slug}`);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center justify-between text-[14px] transition-colors ${
                      active
                        ? "bg-[var(--border)] text-[var(--text)]"
                        : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className={active ? "text-white" : "text-[var(--muted)]"}>
                        <LinearIcon name={page.icon} size={16} weight="fill" />
                      </span>
                      <span className="font-medium truncate">{page.title}</span>
                      {section && (
                        <span className="text-[12px] text-[var(--faint)] truncate">
                          in {section}
                        </span>
                      )}
                    </div>
                    {active && <ArrowRight size={14} weight="bold" className="text-[var(--muted)] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--sidebar)] flex items-center justify-between text-[12px] font-mono text-[var(--muted)]">
          <div className="flex items-center gap-3">
            <span>&uarr;&darr; Navigate</span>
            <span>&crarr; Select</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-1">
            <Command size={12} weight="bold" />
            <span>K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
