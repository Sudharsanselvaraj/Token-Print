"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, ArrowRight, X, Command } from "lucide-react";
import { ALL_DOC_PAGES, getSectionForSlug } from "@/lib/docsNav";

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
  }, [isOpen, searchResults, activeIndex, onClose, router]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl rounded-xl border border-slate-800 bg-[#0c101a] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/80 bg-[#0f1422]">
          <Search size={18} className="text-cyan-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search documentation (e.g. attention, ablation, API, Qwen)..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="p-2 max-h-80 overflow-y-auto divide-y divide-slate-800/40">
          {searchResults.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-slate-500">
              No documentation pages found matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            searchResults.map((page, idx) => {
              const section = getSectionForSlug(page.slug);
              const isSelected = activeIndex === idx;
              return (
                <div
                  key={page.slug}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    onClose();
                    router.push(`/docs/${page.slug}`);
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-cyan-500/10 text-cyan-200 border border-cyan-500/30"
                      : "text-slate-300 hover:bg-slate-900/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText size={15} className={isSelected ? "text-cyan-400" : "text-slate-500"} />
                    <div>
                      <div className="text-xs font-medium">{page.title}</div>
                      {section && (
                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                          {section}
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={13} className={isSelected ? "text-cyan-400" : "text-slate-600"} />
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-[#080b12] flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400">
              <Command size={10} /> K
            </span>
            <span>to open anytime</span>
          </div>
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
