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
import LinearIcon from "./LinearIcon";

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

  const isDevActive = pathname.includes("/developers");
  const isApiActive = pathname.includes("/api-reference");
  const isDocsActive = !isDevActive && !isApiActive;

  const navContent = (
    <aside className="w-[270px] h-full flex flex-col bg-[#08090a] border-r border-white/[0.07] select-none">
      {/* Top Bar: Brand + Circular Search Trigger (Linear Docs Style) */}
      <div className="h-[52px] px-4 flex items-center justify-between border-b border-white/[0.07] flex-shrink-0">
        <Link
          href="/docs"
          className="flex items-center gap-2.5 group no-underline"
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
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-white tracking-tight">
              Docs
            </span>
          </div>
        </Link>

        {/* Circular Search Button (Linear Docs 32px round button) */}
        <button
          type="button"
          onClick={onOpenSearchModal}
          className="w-8 h-8 rounded-full border border-white/10 bg-transparent hover:border-white/20 hover:bg-white/[0.04] flex items-center justify-center text-[#8a8f98] hover:text-white transition-colors duration-150 cursor-pointer"
          aria-label="Search documentation (⌘K)"
          title="Search (⌘K)"
        >
          <Search size={13} strokeWidth={1.5} />
        </button>
      </div>

      {/* Scrolling Navigation Tree with Linear Glyphs */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {DOCS_SECTIONS.map((section: DocSection) => (
          <div key={section.id} className="space-y-0.5">
            {/* Clean Section Heading in sentence-case */}
            <div className="px-2 pt-2.5 pb-1 text-[12px] font-medium text-[#70757e] select-none tracking-tight">
              {section.label}
            </div>

            {/* Items with Linear-style filled/stroke glyphs */}
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
                      className={`h-[32px] px-2.5 flex items-center gap-2.5 rounded-md text-[13px] font-[450] no-underline transition-colors duration-150 group ${
                        active
                          ? "text-white bg-white/[0.08] font-medium"
                          : parentActive
                          ? "text-white"
                          : "text-[#8a8f98] hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      {page.icon && (
                        <span
                          className={`flex-shrink-0 transition-colors duration-150 ${
                            active
                              ? "text-white"
                              : "text-[#70757e] group-hover:text-white"
                          }`}
                        >
                          <LinearIcon name={page.icon} size={15} strokeWidth={1.5} />
                        </span>
                      )}
                      <span className="truncate flex-1">{page.title}</span>
                      {page.badge && (
                        <span className="ml-auto text-[9.5px] px-1.5 py-0.5 rounded font-mono uppercase bg-white/[0.06] text-[#8a8f98] border border-white/5">
                          {page.badge}
                        </span>
                      )}
                    </Link>

                    {/* Nested Children Tree Lines */}
                    {page.children && page.children.length > 0 && (
                      <div className="ml-[14px] pl-[14px] border-l border-white/10 space-y-0.5 my-1">
                        {page.children.map((child) => {
                          const childActive = isPageActive(child.slug);
                          return (
                            <Link
                              key={child.slug}
                              href={`/docs/${child.slug}`}
                              onClick={() => setMobileOpen(false)}
                              className={`h-[28px] flex items-center px-2 rounded-md text-[12px] font-[450] no-underline transition-colors duration-150 ${
                                childActive
                                  ? "text-white bg-white/[0.08] font-medium"
                                  : "text-[#8a8f98] hover:text-white hover:bg-white/[0.04]"
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

      {/* Pinned Bottom Navigation (Matches Linear Docs Screenshot 3) */}
      <div className="border-t border-white/[0.08] p-2 space-y-0.5 flex-shrink-0 bg-[#08090a]">
        <Link
          href="/docs"
          onClick={() => setMobileOpen(false)}
          className={`h-[32px] px-2.5 flex items-center gap-2.5 rounded-md text-[13px] no-underline transition-colors ${
            isDocsActive
              ? "text-white bg-white/[0.08] font-medium"
              : "text-[#8a8f98] hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <LinearIcon name="BookOpen" size={15} />
          <span>Docs</span>
        </Link>
        <Link
          href="/docs/developers"
          onClick={() => setMobileOpen(false)}
          className={`h-[32px] px-2.5 flex items-center gap-2.5 rounded-md text-[13px] no-underline transition-colors ${
            isDevActive
              ? "text-white bg-white/[0.08] font-medium"
              : "text-[#8a8f98] hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <LinearIcon name="Terminal" size={15} />
          <span>Developers</span>
        </Link>
        <Link
          href="/docs/api-reference"
          onClick={() => setMobileOpen(false)}
          className={`h-[32px] px-2.5 flex items-center gap-2.5 rounded-md text-[13px] no-underline transition-colors ${
            isApiActive
              ? "text-white bg-white/[0.08] font-medium"
              : "text-[#8a8f98] hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <LinearIcon name="Code2" size={15} />
          <span>API Reference</span>
        </Link>
        <a
          href="https://github.com/Sudharsanselvaraj/Token-Print"
          target="_blank"
          rel="noopener noreferrer"
          className="h-[32px] px-2.5 flex items-center gap-2.5 rounded-md text-[13px] text-[#8a8f98] hover:text-white hover:bg-white/[0.04] no-underline transition-colors"
        >
          <LinearIcon name="GitBranch" size={15} />
          <span>GitHub</span>
        </a>
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
          <div className="relative w-[280px] max-w-[85vw] h-full z-10 bg-[#08090a] shadow-2xl flex flex-col">
            <div className="absolute top-3 right-3 z-20">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-md text-[#8a8f98] hover:text-white hover:bg-white/[0.06] cursor-pointer"
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
