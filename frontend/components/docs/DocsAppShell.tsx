"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DocsNav from "./DocsNav";
import TopBar from "./TopBar";
import DocsOnThisPage from "./DocsOnThisPage";
import DocsSearchModal from "./DocsSearchModal";
import SuggestedArticles from "./SuggestedArticles";

export default function DocsAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const cleanSlug = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
  const isOverviewPage = !cleanSlug || cleanSlug === "docs" || cleanSlug === "developers";

  // Lock root html & body overflow so top header & sidebar remain fixed while main container scrolls
  useEffect(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    htmlEl.classList.add("docs-page-active");
    bodyEl.classList.add("docs-page-active");

    const prevHtmlOverflow = htmlEl.style.overflow;
    const prevBodyOverflow = bodyEl.style.overflow;

    htmlEl.style.overflow = "hidden";
    bodyEl.style.overflow = "hidden";
    bodyEl.style.height = "100vh";

    return () => {
      htmlEl.classList.remove("docs-page-active");
      bodyEl.classList.remove("docs-page-active");
      htmlEl.style.overflow = prevHtmlOverflow;
      bodyEl.style.overflow = prevBodyOverflow;
    };
  }, []);

  // Reset main content scroll position on page change unless hash anchor is present
  useEffect(() => {
    if (!window.location.hash) {
      const mainEl = document.getElementById("docs-main-content");
      if (mainEl) {
        mainEl.scrollTop = 0;
      }
    }
  }, [pathname]);

  // Keyboard shortcut Ctrl+K / ⌘K and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      } else if (e.key === "Escape") {
        setSearchModalOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="docs-shell flex h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <DocsSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      {/* Left Sidebar (285px) */}
      <DocsNav
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onOpenSearchModal={() => setSearchModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <TopBar onToggleMobileNav={() => setMobileOpen((v) => !v)} />

        <main
          id="docs-main-content"
          className="flex-1 overflow-y-auto scrollbar-none"
        >
          {isOverviewPage ? (
            /* Wide layout for Docs Home & Developers Home */
            <div className="max-w-[1280px] mx-auto py-12 px-6 lg:px-12">
              <article className="docs-content">{children}</article>
            </div>
          ) : (
            /* Three-column layout for standard articles */
            <div className="max-w-[1100px] mx-auto py-12 px-6 lg:px-10 flex gap-12 xl:gap-16 justify-between items-start">
              <div className="flex-1 min-w-0 max-w-[720px]">
                <article className="docs-content">{children}</article>
                <SuggestedArticles />
              </div>

              {/* Right rail TOC (hidden below 1100px) */}
              <aside className="w-[230px] hidden xl:block flex-shrink-0">
                <DocsOnThisPage />
              </aside>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
