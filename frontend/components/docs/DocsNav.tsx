"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  MagnifyingGlass,
  CaretDown,
  CaretRight,
  BookOpen,
  Code,
  GraduationCap,
  Lifebuoy,
  X,
} from "@phosphor-icons/react";
import {
  DOCS_SECTIONS,
  DEVELOPERS_SECTIONS,
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
  const isDevelopersView = pathname.startsWith("/docs/developers") || pathname === "/docs/api-reference";
  const activeSectionTree: DocSection[] = isDevelopersView ? DEVELOPERS_SECTIONS : DOCS_SECTIONS;
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

  // Collapsible groups state persisted in localStorage
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tp_docs_collapsed_groups");
      if (stored) {
        setCollapsedGroups(JSON.parse(stored));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem("tp_docs_collapsed_groups", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Scroll active item into view on navigation
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [pathname]);

  const isCurrentSlug = (slug: string) => {
    const clean = slug.replace(/^\/docs\//, "").replace(/\/$/, "");
    const currentClean = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
    if (!clean && (!currentClean || currentClean === "docs")) return true;
    return currentClean === clean;
  };

  const navContent = (
    <aside className="w-[285px] h-full flex flex-col bg-[var(--sidebar)] border-r border-[var(--border)] select-none">
      {/* Top Bar */}
      <div className="h-[56px] px-5 flex items-center justify-between border-b border-[var(--border)] flex-shrink-0">
        <Link href="/" className="flex items-center gap-3 group" aria-label="TokenPrint Home">
          <div className="w-5 h-5 relative flex-shrink-0">
            <Image
              src="/icon.png"
              alt="TokenPrint"
              width={20}
              height={20}
              className="object-contain"
            />
          </div>
          <div className="h-4 w-px bg-[var(--border-strong)]" />
          <span className="text-[19px] font-medium text-[var(--text)] tracking-tight">
            {isDevelopersView ? "Developers" : "Docs"}
          </span>
        </Link>

        {/* Circular search button */}
        <button
          onClick={onOpenSearchModal}
          className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-colors duration-150"
          aria-label="Search documentation (Cmd+K)"
          title="Search (⌘K)"
        >
          <MagnifyingGlass size={16} weight="bold" />
        </button>
      </div>

      {/* Scrolling Navigation */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6 [mask-image:linear-gradient(to_bottom,black_calc(100%-48px),transparent_100%)] scrollbar-none">
        {activeSectionTree.map((section) => {
          const isCollapsed = Boolean(collapsedGroups[section.id]);
          return (
            <div key={section.id} className="space-y-1">
              {/* Group label */}
              <div
                onClick={() => toggleGroup(section.id)}
                className="px-2.5 py-1 flex items-center justify-between text-[13px] text-[var(--muted)] font-normal cursor-pointer hover:text-[var(--text)] transition-colors duration-150"
              >
                <span>{section.label}</span>
                <span className="text-[var(--faint)]">
                  {isCollapsed ? <CaretRight size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
                </span>
              </div>

              {/* Group items */}
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {section.pages.map((page) => {
                    const active = isCurrentSlug(page.slug);
                    const hasChildren = Boolean(page.children && page.children.length > 0);
                    const isParentOfActive = Boolean(
                      page.children?.some((c) => isCurrentSlug(c.slug))
                    );

                    return (
                      <div key={page.slug}>
                        <Link
                          href={`/docs/${page.slug}`}
                          ref={active ? activeItemRef : undefined}
                          onClick={() => setMobileOpen(false)}
                          className={`h-[38px] px-2.5 flex items-center gap-3 rounded-md text-[15px] font-normal transition-colors duration-150 ${
                            active
                              ? "text-[var(--text)] font-medium"
                              : isParentOfActive
                              ? "text-[var(--text)]"
                              : "text-[var(--muted)] hover:text-[var(--text)]"
                          }`}
                        >
                          <span
                            className={`flex-shrink-0 transition-colors duration-150 ${
                              active ? "text-[var(--text)]" : "text-[var(--muted)] group-hover:text-[var(--text)]"
                            }`}
                          >
                            <LinearIcon name={page.icon} size={20} weight="fill" />
                          </span>
                          <span className="truncate">{page.title}</span>
                        </Link>

                        {/* Nested tree children */}
                        {hasChildren && (
                          <div className="ml-[15px] pl-[18px] border-l border-[var(--border)] space-y-0.5 my-0.5">
                            {page.children?.map((child) => {
                              const childActive = isCurrentSlug(child.slug);
                              return (
                                <Link
                                  key={child.slug}
                                  href={`/docs/${child.slug}`}
                                  ref={childActive ? activeItemRef : undefined}
                                  onClick={() => setMobileOpen(false)}
                                  className={`h-[30px] flex items-center px-2 rounded-md text-[13.5px] font-normal transition-colors duration-150 relative ${
                                    childActive
                                      ? "text-[var(--text)] font-medium"
                                      : "text-[var(--muted)] hover:text-[var(--text)]"
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
              )}
            </div>
          );
        })}
      </div>

      {/* Pinned Bottom Switcher */}
      <div className="p-3 border-t border-[var(--border)] space-y-0.5 bg-[var(--sidebar)] flex-shrink-0">
        <Link
          href="/docs"
          onClick={() => setMobileOpen(false)}
          className={`h-[36px] px-2.5 flex items-center gap-3 rounded-md text-[14px] font-normal transition-colors duration-150 ${
            !isDevelopersView && pathname !== "/docs/using/walkthrough"
              ? "text-[var(--text)] font-medium bg-[var(--card)]/50"
              : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          <BookOpen size={18} weight="fill" />
          <span>Docs</span>
        </Link>

        <Link
          href="/docs/developers"
          onClick={() => setMobileOpen(false)}
          className={`h-[36px] px-2.5 flex items-center gap-3 rounded-md text-[14px] font-normal transition-colors duration-150 ${
            isDevelopersView
              ? "text-[var(--text)] font-medium bg-[var(--card)]/50"
              : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          <Code size={18} weight="fill" />
          <span>Developers</span>
        </Link>

        <Link
          href="/docs/using/walkthrough"
          onClick={() => setMobileOpen(false)}
          className={`h-[36px] px-2.5 flex items-center gap-3 rounded-md text-[14px] font-normal transition-colors duration-150 ${
            pathname === "/docs/using/walkthrough"
              ? "text-[var(--text)] font-medium bg-[var(--card)]/50"
              : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          <GraduationCap size={18} weight="fill" />
          <span>Learn</span>
        </Link>

        <a
          href="https://discord.gg/RbxZBq2Gh"
          target="_blank"
          rel="noopener noreferrer"
          className="h-[36px] px-2.5 flex items-center gap-3 rounded-md text-[14px] font-normal text-[var(--muted)] hover:text-[var(--text)] transition-colors duration-150"
        >
          <Lifebuoy size={18} weight="fill" />
          <span>Contact support</span>
        </a>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop view */}
      <div className="hidden lg:block h-full flex-shrink-0">
        {navContent}
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-[285px] max-w-[85vw] h-full z-10 flex flex-col bg-[var(--sidebar)] shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 z-20 text-[var(--muted)] hover:text-[var(--text)]"
              aria-label="Close menu"
            >
              <X size={20} weight="bold" />
            </button>
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
