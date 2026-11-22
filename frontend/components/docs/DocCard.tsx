"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import LinearIcon from "./LinearIcon";

interface DocCardProps {
  href: string;
  title: string;
  description: string;
  imageSrc?: string;
  iconName?: string;
  tag?: string;
}

export default function DocCard({
  href,
  title,
  description,
  imageSrc,
  iconName,
  tag,
}: DocCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-[10px] border border-[var(--docs-border)] bg-[var(--docs-surface)] overflow-hidden transition-all duration-150 hover:border-[var(--docs-border-strong)] hover:bg-[var(--docs-surface-hover)] no-underline"
    >
      {/* 16:9 Thumbnail Image Area */}
      <div className="relative aspect-[16/9] w-full max-h-[140px] bg-[#09090b] overflow-hidden flex-shrink-0">
        {/* Category icon tag in top-left */}
        {iconName && (
          <div className="absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded bg-[var(--docs-surface-elevated)]/90 border border-[var(--docs-border)] flex items-center justify-center text-[var(--docs-text-muted)] group-hover:text-[var(--docs-heading)] transition-colors">
            <LinearIcon name={iconName} size={13} strokeWidth={1.5} />
          </div>
        )}

        {/* Optional tag badge in top-right */}
        {tag && (
          <div className="absolute top-2.5 right-2.5 z-10 px-1.5 py-0.5 rounded text-[9.5px] font-mono uppercase bg-[var(--docs-surface-elevated)]/90 border border-[var(--docs-border)] text-[var(--docs-text-muted)]">
            {tag}
          </div>
        )}

        {imageSrc ? (
          <div className="w-full h-full relative">
            <Image
              src={imageSrc}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              className="object-cover object-top opacity-85 group-hover:opacity-100 transition-opacity duration-200"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--docs-surface)]">
            <div className="w-8 h-8 rounded border border-[var(--docs-border)] bg-[var(--docs-surface-elevated)] flex items-center justify-center text-[var(--docs-text-muted)]">
              <LinearIcon name={iconName || "FileText"} size={14} strokeWidth={1.5} />
            </div>
          </div>
        )}
      </div>

      {/* 1px separator */}
      <div className="w-full h-px bg-[var(--docs-border)]" />

      {/* Content Area */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--docs-heading)] tracking-tight mb-1 line-clamp-1 group-hover:text-white transition-colors no-underline">
            {title}
          </h3>
          <p className="text-[12px] leading-relaxed text-[var(--docs-text-secondary)] line-clamp-2">
            {description}
          </p>
        </div>

        <div className="pt-2.5 mt-auto flex items-center gap-1 text-[11px] font-medium text-[var(--docs-text-muted)] group-hover:text-[var(--docs-accent)] transition-colors">
          <span>Explore</span>
          <span>&rarr;</span>
        </div>
      </div>
    </Link>
  );
}
