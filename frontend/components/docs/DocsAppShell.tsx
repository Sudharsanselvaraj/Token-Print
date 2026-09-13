"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DocsHeader from "./DocsHeader";
import DocsNav from "./DocsNav";
import DocsOnThisPage from "./DocsOnThisPage";

export default function DocsAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Keyboard shortcut Ctrl+K / ⌘K to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector(
          ".docs-nav-search-input"
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleHeaderSearchClick = () => {
    setMobileOpen(true);
    setTimeout(() => {
      const searchInput = document.querySelector(
        ".docs-nav-search-input"
      ) as HTMLInputElement;
      if (searchInput) searchInput.focus();
    }, 100);
  };

  return (
    <div className="docs-shell">
      {/* Fixed top header */}
      <DocsHeader
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onSearchClick={handleHeaderSearchClick}
      />

      {/* Main body flex container */}
      <div className="docs-body-wrapper">
        {/* Fixed left sidebar */}
        <DocsNav
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
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
