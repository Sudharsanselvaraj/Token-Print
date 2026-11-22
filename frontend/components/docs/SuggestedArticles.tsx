"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { ALL_DOC_PAGES, getPrevNext, DocPage } from "@/lib/docsNav";
import LinearIcon from "./LinearIcon";

export default function SuggestedArticles() {
  const pathname = usePathname();
  const cleanSlug = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
  const isDevelopers = pathname.startsWith("/docs/developers") || pathname === "/docs/api-reference";
  const { prev, next } = getPrevNext(cleanSlug, isDevelopers);

  // Pick 3 related suggestions that are not the current page
  const otherPages = ALL_DOC_PAGES.filter(
    (p) => p.slug !== cleanSlug && !p.slug.startsWith("http")
  );
  // Deterministic shuffle based on slug length
  const offset = (cleanSlug.length * 7) % Math.max(1, otherPages.length - 3);
  const suggestions: DocPage[] = otherPages.slice(offset, offset + 3);

  return (
    <footer className="mt-20 pt-10 border-t border-[var(--border)] select-none">
      {/* Suggested articles section */}
      <div className="mb-12">
        <h3 className="text-[14px] font-medium text-[var(--muted)] tracking-tight mb-4">
          Suggested articles
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {suggestions.map((p) => (
            <Link
              key={p.slug}
              href={`/docs/${p.slug}`}
              className="group p-4 rounded-[12px] border border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)] transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="w-7 h-7 rounded-md bg-[#18181b] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] group-hover:text-[var(--text)] transition-colors mb-3">
                  <LinearIcon name={p.icon} size={15} weight="fill" />
                </div>
                <h4 className="text-[15px] font-medium text-[var(--text)] mb-1 group-hover:text-white transition-colors line-clamp-1">
                  {p.title}
                </h4>
                <p className="text-[13px] leading-relaxed text-[var(--muted)] line-clamp-2">
                  {p.description || "Learn how to use this feature in TokenPrint."}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Prev / Next links */}
      {(prev || next) && (
        <nav
          aria-label="Previous and next documentation pages"
          className="flex items-center justify-between pt-6 border-t border-[var(--border)]"
        >
          {prev ? (
            <Link
              href={`/docs/${prev.slug}`}
              className="group flex items-center gap-2 text-[14px] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              <ArrowLeft size={16} weight="bold" />
              <span>{prev.title}</span>
            </Link>
          ) : (
            <div />
          )}

          {next ? (
            <Link
              href={`/docs/${next.slug}`}
              className="group flex items-center gap-2 text-[14px] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              <span>{next.title}</span>
              <ArrowRight size={16} weight="bold" />
            </Link>
          ) : (
            <div />
          )}
        </nav>
      )}
    </footer>
  );
}
