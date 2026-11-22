"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function DocsOnThisPage() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [indicatorTop, setIndicatorTop] = useState<number>(0);
  const [indicatorHeight, setIndicatorHeight] = useState<number>(0);
  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const mainContainer = document.getElementById("docs-main-content");
      const els = Array.from(
        document.querySelectorAll("article.docs-content h2, article.docs-content h3")
      ) as HTMLElement[];

      const parsed: HeadingItem[] = els.map((el, index) => {
        let id = el.id;
        if (!id) {
          id = slugify(el.textContent || `heading-${index}`);
          el.id = id;
        }
        return {
          id,
          text: el.textContent || "",
          level: parseInt(el.tagName[1], 10),
        };
      });

      setHeadings(parsed);
      if (parsed.length > 0) {
        setActiveId(parsed[0].id);
      }

      if (parsed.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(entry.target.id);
            }
          });
        },
        {
          root: mainContainer,
          rootMargin: "-20px 0px -65% 0px",
          threshold: 0,
        }
      );

      els.forEach((el) => observer.observe(el));
      return () => observer.disconnect();
    }, 60);

    return () => clearTimeout(timer);
  }, [pathname]);

  // Update active indicator bar position
  useEffect(() => {
    if (!activeId || !navRef.current) return;
    const activeEl = navRef.current.querySelector(`a[data-heading-id="${activeId}"]`) as HTMLElement | null;
    if (activeEl) {
      setIndicatorTop(activeEl.offsetTop);
      setIndicatorHeight(activeEl.offsetHeight);
    }
  }, [activeId, headings]);

  if (headings.length === 0) return null;

  return (
    <nav
      className="w-full select-none"
      aria-label="Table of contents"
    >
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--docs-text-muted)]">
          On this page
        </p>

        {/* 1px track with subtle active bar */}
        <div ref={navRef} className="relative border-l border-[var(--docs-border)] py-0.5">
          {indicatorHeight > 0 && (
            <div
              className="absolute -left-px w-[1.5px] bg-[var(--docs-heading)] rounded-full transition-all duration-150 pointer-events-none"
              style={{
                top: `${indicatorTop}px`,
                height: `${indicatorHeight}px`,
              }}
            />
          )}

          <ul className="space-y-0.5 list-none p-0 m-0">
            {headings.map((h) => {
              const active = activeId === h.id;
              return (
                <li key={h.id} className="list-none p-0 m-0">
                  <a
                    href={`#${h.id}`}
                    data-heading-id={h.id}
                    onClick={(e) => {
                      e.preventDefault();
                      const target = document.getElementById(h.id);
                      if (target) {
                        target.scrollIntoView({ behavior: "smooth", block: "start" });
                        setActiveId(h.id);
                        history.pushState(null, "", `#${h.id}`);
                      }
                    }}
                    className={`block py-1 text-[11px] leading-snug no-underline transition-colors duration-150 ${
                      h.level === 3 ? "pl-4 text-[10.5px]" : "pl-2.5"
                    } ${
                      active
                        ? "text-[var(--docs-heading)] font-medium"
                        : "text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)]"
                    }`}
                  >
                    {h.text}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
