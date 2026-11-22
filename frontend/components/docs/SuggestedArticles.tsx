"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ALL_DOC_PAGES, getPrevNext, getPageBySlug, DocPage } from "@/lib/docsNav";
import LinearIcon from "./LinearIcon";

export default function SuggestedArticles() {
  const pathname = usePathname();
  const cleanSlug = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
  const { prev, next } = getPrevNext(cleanSlug);
  const nextMeta = next ? getPageBySlug(next.slug) : undefined;

  // Pick 3 related suggestions that are not the current page
  const otherPages = ALL_DOC_PAGES.filter(
    (p) => p.slug !== cleanSlug && !p.slug.startsWith("http")
  );
  // Deterministic shuffle based on slug length
  const offset = (cleanSlug.length * 7) % Math.max(1, otherPages.length - 3);
  const suggestions: DocPage[] = otherPages.slice(offset, offset + 3);

  return (
    <footer className="mt-14 pt-8 border-t border-[var(--docs-border)] select-none">
      {/* Prominent Next Article Card (Linear / Lori Docs Style) */}
      {next && (
        <Link
          href={`/docs/${next.slug}`}
          className="block p-4 mb-10 rounded-xl border border-[var(--docs-border)] bg-[var(--docs-surface)] hover:border-[var(--docs-border-strong)] hover:bg-[var(--docs-surface-hover)] transition-all no-underline group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--docs-text-muted)] mb-1">
                Next article
              </div>
              <div className="text-[15px] font-semibold text-white tracking-tight group-hover:text-white transition-colors">
                {next.title}
              </div>
              {nextMeta?.description && (
                <div className="text-[12.5px] text-zinc-400 mt-0.5 line-clamp-1">
                  {nextMeta.description}
                </div>
              )}
            </div>
            <ArrowRight size={16} strokeWidth={1.5} className="text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" />
          </div>
        </Link>
      )}

      {/* Suggested articles section */}
      <div className="mb-10">
        <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--docs-text-muted)] mb-3">
          Suggested articles
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {suggestions.map((p) => (
            <Link
              key={p.slug}
              href={`/docs/${p.slug}`}
              className="group p-3.5 rounded-lg border border-[var(--docs-border)] bg-[var(--docs-surface)] hover:border-[var(--docs-border-strong)] hover:bg-[var(--docs-surface-hover)] transition-all no-underline flex flex-col justify-between"
            >
              <div>
                <div className="w-6 h-6 rounded bg-[var(--docs-surface-elevated)] border border-[var(--docs-border)] flex items-center justify-center text-[var(--docs-text-muted)] group-hover:text-[var(--docs-heading)] transition-colors mb-2.5">
                  <LinearIcon name={p.icon} size={13} strokeWidth={1.5} />
                </div>
                <h4 className="text-[13.5px] font-semibold text-[var(--docs-heading)] mb-1 group-hover:text-white transition-colors line-clamp-1">
                  {p.title}
                </h4>
                <p className="text-[12px] leading-relaxed text-[var(--docs-text-secondary)] line-clamp-2">
                  {p.description || "Learn how to use this feature in TokenPrint."}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Prev / Next split links */}
      {(prev || next) && (
        <nav
          aria-label="Previous and next documentation pages"
          className="flex items-center justify-between pt-5 border-t border-[var(--docs-border)]"
        >
          {prev ? (
            <Link
              href={`/docs/${prev.slug}`}
              className="flex items-center gap-2 text-[12.5px] font-medium text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] transition-colors no-underline group"
            >
              <ArrowLeft size={13} strokeWidth={1.5} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>{prev.title}</span>
            </Link>
          ) : (
            <div />
          )}

          {next ? (
            <Link
              href={`/docs/${next.slug}`}
              className="flex items-center gap-2 text-[12.5px] font-medium text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] transition-colors no-underline group"
            >
              <span>{next.title}</span>
              <ArrowRight size={13} strokeWidth={1.5} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <div />
          )}
        </nav>
      )}
    </footer>
  );
}
