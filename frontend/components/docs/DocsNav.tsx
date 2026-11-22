"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Search,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
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

  // Ensure active group is expanded on route change
  useEffect(() => {
    const cleanPath = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
    for (const section of DOCS_SECTIONS) {
      const hasActiveChild = section.pages.some(
        (p) => p.slug === cleanPath || p.children?.some((c) => c.slug === cleanPath)
      );
      if (hasActiveChild && collapsedGroups[section.id]) {
        setCollapsedGroups((prev) => ({ ...prev, [section.id]: false }));
      }
    }
  }, [pathname]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem("tp_docs_collapsed_groups", JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const isPageActive = (slug: string) => {
    const cleanPath = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
    return cleanPath === slug;
  };

  const isParentActive = (page: DocPage) => {
    const cleanPath = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
    if (page.slug === cleanPath) return true;
    return page.children?.some((child) => child.slug === cleanPath) || false;
  };

  const navContent = (
    <aside className="w-[260px] h-full flex flex-col bg-[var(--docs-bg)] border-r border-[var(--docs-border)] select-none">
      {/* Top Bar: Brand + Search trigger */}
      <div className="h-[56px] px-4 flex items-center justify-between border-b border-[var(--docs-border)] flex-shrink-0">
        <Link
          href="/docs"
          className="flex items-center gap-2.5 group no-underline"
          aria-label="TokenPrint Docs Home"
        >
          <div className="w-5 h-5 relative flex-shrink-0">
            <Image
              src="/icon.png"
              alt="TokenPrint"
              width={20}
              height={20}
              className="object-contain"
            />
          </div>
          <span className="text-[15px] font-semibold text-[var(--docs-heading)] tracking-tight">
            Docs
          </span>
        </Link>

        <button
          onClick={onOpenSearchModal}
          className="w-8 h-8 rounded-md border border-[var(--docs-border)] bg-transparent flex items-center justify-center text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] hover:border-[var(--docs-border-strong)] transition-colors duration-150"
          aria-label="Search documentation (⌘K)"
          title="Search (⌘K)"
        >
          <Search size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Scrolling Navigation Tree */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin scrollbar-thumb-[var(--docs-border)]">
        {DOCS_SECTIONS.map((section: DocSection) => {
          const isCollapsed = !!collapsedGroups[section.id];

          return (
            <div key={section.id} className="space-y-1">
              {/* Section Header (12px uppercase, collapsible) */}
              <button
                type="button"
                onClick={() => toggleGroup(section.id)}
                className="w-full px-2 py-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] transition-colors duration-150 text-left bg-transparent border-0 select-none"
              >
                <span>{section.label}</span>
                <span className="text-[var(--docs-text-muted)]">
                  {isCollapsed ? (
                    <ChevronRight size={12} strokeWidth={1.5} />
                  ) : (
                    <ChevronDown size={12} strokeWidth={1.5} />
                  )}
                </span>
              </button>

              {/* Items in section */}
              {!isCollapsed && (
                <div className="space-y-0.5 pt-0.5">
                  {section.pages.map((page: DocPage) => {
                    const active = isPageActive(page.slug);
                    const parentActive = isParentActive(page);

                    return (
                      <div key={page.slug}>
                        <Link
                          href={`/docs/${page.slug}`}
                          ref={active ? activeItemRef : null}
                          onClick={() => setMobileOpen(false)}
                          className={`h-[32px] px-2.5 flex items-center gap-2.5 rounded-md text-[13px] font-[450] no-underline transition-colors duration-150 ${
                            active
                              ? "text-white bg-[var(--docs-surface-hover)] font-medium"
                              : parentActive
                              ? "text-[var(--docs-heading)]"
                              : "text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] hover:bg-[var(--docs-surface-hover)]/60"
                          }`}
                        >
                          {page.icon && (
                            <span
                              className={`flex-shrink-0 transition-colors duration-150 ${
                                active
                                  ? "text-[var(--docs-accent)]"
                                  : "text-[var(--docs-text-muted)] group-hover:text-[var(--docs-heading)]"
                              }`}
                            >
                              <LinearIcon name={page.icon} size={15} strokeWidth={1.5} />
                            </span>
                          )}
                          <span className="truncate">{page.title}</span>
                        </Link>

                        {/* Nested Children Tree Lines */}
                        {page.children && page.children.length > 0 && (
                          <div className="ml-[14px] pl-[14px] border-l border-[var(--docs-border)] space-y-0.5 my-0.5">
                            {page.children.map((child) => {
                              const childActive = isPageActive(child.slug);
                              return (
                                <Link
                                  key={child.slug}
                                  href={`/docs/${child.slug}`}
                                  onClick={() => setMobileOpen(false)}
                                  className={`h-[28px] flex items-center px-2 rounded-md text-[12.5px] font-[450] no-underline transition-colors duration-150 relative ${
                                    childActive
                                      ? "text-[var(--docs-heading)] bg-[var(--docs-surface-elevated)] font-medium"
                                      : "text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] hover:bg-[var(--docs-surface-hover)]"
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
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-md text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] hover:bg-[var(--docs-surface-hover)]"
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
