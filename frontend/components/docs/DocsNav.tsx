"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Search, X } from "lucide-react";
import {
  DOCS_SECTIONS,
  DocSection,
  DocPage,
} from "@/lib/docsNav";

interface DocsNavProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  onOpenSearchModal: () => void;
}

export default function DocsNav({
  mobileOpen,
  setMobileOpen,
  onOpenSearchModal,
}: DocsNavProps) {
  const pathname = usePathname();
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

  const isPageActive = (slug: string) => {
    const cleanPath = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
    return cleanPath === slug;
  };

  const isParentActive = (page: DocPage) => {
    const cleanPath = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
    if (page.slug === cleanPath) return true;
    return page.children?.some((child) => child.slug === cleanPath) || false;
  };

  const isDevSection = pathname.includes("/developers") || pathname.includes("/api-reference");

  const navContent = (
    <aside className="w-[248px] h-full flex flex-col bg-[var(--docs-bg)] border-r border-[var(--docs-border)] select-none">
      {/* Top Bar: Brand + Search trigger */}
      <div className="h-[52px] px-3.5 flex items-center justify-between border-b border-[var(--docs-border)] flex-shrink-0">
        <Link
          href="/docs"
          className="flex items-center gap-2 group no-underline"
          aria-label="TokenPrint Docs Home"
        >
          <div className="w-[18px] h-[18px] relative flex-shrink-0">
            <Image
              src="/icon.png"
              alt="TokenPrint"
              width={18}
              height={18}
              className="object-contain"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-semibold text-white tracking-tight">
              TokenPrint
            </span>
            <span className="text-zinc-600 text-xs font-light">/</span>
            <span className="text-[12px] text-zinc-400 font-medium">
              Docs
            </span>
          </div>
        </Link>

        <button
          type="button"
          onClick={onOpenSearchModal}
          className="w-7 h-7 rounded-md border border-[var(--docs-border)] bg-transparent flex items-center justify-center text-zinc-400 hover:text-white hover:border-[var(--docs-border-strong)] transition-colors duration-150 cursor-pointer"
          aria-label="Search documentation (⌘K)"
          title="Search (⌘K)"
        >
          <Search size={13} strokeWidth={1.5} />
        </button>
      </div>

      {/* Mode Switcher Segmented Control (Lori / Linear Docs Style) */}
      <div className="px-2.5 pt-2.5 pb-2 border-b border-[var(--docs-border)]">
        <div className="flex items-center p-0.5 rounded-lg bg-[var(--docs-surface)] border border-[var(--docs-border)]">
          <Link
            href="/docs"
            onClick={() => setMobileOpen(false)}
            className={`flex-1 py-1 text-center rounded-[6px] text-[11.5px] font-medium transition-all no-underline ${
              !isDevSection
                ? "bg-[var(--docs-surface-hover)] text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Guides
          </Link>
          <Link
            href="/docs/developers"
            onClick={() => setMobileOpen(false)}
            className={`flex-1 py-1 text-center rounded-[6px] text-[11.5px] font-medium transition-all no-underline ${
              isDevSection
                ? "bg-[var(--docs-surface-hover)] text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Developers &amp; API
          </Link>
        </div>
      </div>

      {/* Scrolling Navigation Tree (Lori / Linear Docs Typography-First Style) */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-4 scrollbar-thin scrollbar-thumb-[var(--docs-border)]">
        {DOCS_SECTIONS.map((section: DocSection) => (
          <div key={section.id} className="space-y-0.5">
            {/* Clean Section Heading without accordion button or chevrons */}
            <div className="px-2 pt-2.5 pb-1 text-[12px] font-medium text-zinc-400 select-none tracking-tight">
              {section.label}
            </div>

            {/* Items in section */}
            <div className="space-y-0.5">
              {section.pages.map((page: DocPage) => {
                const active = isPageActive(page.slug);
                const parentActive = isParentActive(page);

                return (
                  <div key={page.slug}>
                    <Link
                      href={`/docs/${page.slug}`}
                      ref={active ? activeItemRef : null}
                      onClick={() => setMobileOpen(false)}
                      className={`h-[28px] px-2.5 flex items-center justify-between rounded-md text-[12px] font-[450] no-underline transition-colors duration-150 ${
                        active
                          ? "text-white bg-white/[0.08] font-medium"
                          : parentActive
                          ? "text-zinc-200 hover:text-white"
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="truncate flex-1">{page.title}</span>
                      {page.badge && (
                        <span className="ml-auto text-[9.5px] px-1.5 py-0.5 rounded font-mono uppercase bg-white/[0.06] text-zinc-400 border border-white/5">
                          {page.badge}
                        </span>
                      )}
                    </Link>

                    {/* Nested Children Tree Lines */}
                    {page.children && page.children.length > 0 && (
                      <div className="ml-3 pl-3 border-l border-white/10 space-y-0.5 my-1">
                        {page.children.map((child) => {
                          const childActive = isPageActive(child.slug);
                          return (
                            <Link
                              key={child.slug}
                              href={`/docs/${child.slug}`}
                              onClick={() => setMobileOpen(false)}
                              className={`h-[26px] flex items-center px-2 rounded-md text-[11.5px] font-[450] no-underline transition-colors duration-150 relative ${
                                childActive
                                  ? "text-white bg-white/[0.08] font-medium"
                                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                              }`}
                            >
                              <span className="truncate">{child.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <div className="hidden lg:block h-full flex-shrink-0">{navContent}</div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-[280px] max-w-[85vw] h-full z-10 bg-[var(--docs-bg)] shadow-2xl flex flex-col">
            <div className="absolute top-3 right-3 z-20">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] cursor-pointer"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
