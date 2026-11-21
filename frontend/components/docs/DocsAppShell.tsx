"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DocsNav from "./DocsNav";
import DocsOnThisPage from "./DocsOnThisPage";
import DocsSearchModal from "./DocsSearchModal";

export default function DocsAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Lock root html & body overflow so top header & sidebar remain fixed while main container scrolls
  useEffect(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    htmlEl.classList.add("docs-page-active");
    bodyEl.classList.add("docs-page-active");

    const prevHtmlOverflow = htmlEl.style.overflow;
    const prevBodyOverflow = bodyEl.style.overflow;
    const prevBodyHeight = bodyEl.style.height;

    htmlEl.style.overflow = "hidden";
    bodyEl.style.overflow = "hidden";
    bodyEl.style.height = "100vh";

    return () => {
      htmlEl.classList.remove("docs-page-active");
      bodyEl.classList.remove("docs-page-active");
      htmlEl.style.overflow = prevHtmlOverflow;
      bodyEl.style.overflow = prevBodyOverflow;
      bodyEl.style.height = prevBodyHeight;
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

  // Keyboard shortcut Ctrl+K / ⌘K to open Search Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="docs-shell">
      <DocsSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      {/* Mobile-only sidebar toggle (global header handles site nav) */}
      <button
        className="docs-mobile-menu-btn"
        aria-label="Open documentation sidebar"
        onClick={() => setMobileOpen((v) => !v)}
      >
        <span className="docs-mobile-menu-icon" />
      </button>

      {/* Main body flex container */}
      <div className="docs-body-wrapper">
        {/* Fixed left sidebar */}
        <DocsNav
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenSearchModal={() => setSearchModalOpen(true)}
        />

        {/* Independent main article scroll container */}
        <main className="docs-main" id="docs-main-content">
          <div className="docs-article-wrapper">
            <article className="docs-content">{children}</article>
            <aside className="docs-aside">
              <DocsOnThisPage />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
