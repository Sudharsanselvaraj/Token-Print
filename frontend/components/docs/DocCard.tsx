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
      className="group flex flex-col h-[420px] rounded-[12px] border border-[var(--border)] bg-[var(--card)] overflow-hidden transition-colors duration-150 hover:border-[var(--border-strong)]"
    >
      {/* Top 55% Image Area */}
      <div className="relative h-[55%] w-full bg-[#0a0a0c] overflow-hidden">
        {/* Glyph in top-left corner */}
        {iconName && (
          <div className="absolute top-4 left-4 z-10 w-8 h-8 rounded-md bg-[#18181b]/90 border border-[var(--border)] flex items-center justify-center text-[var(--muted)] group-hover:text-[var(--text)] transition-colors">
            <LinearIcon name={iconName} size={18} weight="fill" />
          </div>
        )}

        {tag && (
          <div className="absolute top-4 right-4 z-10 px-2 py-0.5 rounded text-[11px] font-mono uppercase bg-[#18181b]/90 border border-[var(--border)] text-[var(--muted)]">
            {tag}
          </div>
        )}

        {imageSrc ? (
          <div className="w-full h-full relative [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]">
            <Image
              src={imageSrc}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              className="object-cover object-top opacity-85 group-hover:opacity-100 transition-opacity duration-200"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#141418] to-[#0a0a0c]">
            <div className="w-12 h-12 rounded-lg border border-[var(--border)] bg-[#111113] flex items-center justify-center text-[var(--faint)]">
              <LinearIcon name={iconName || "FileText"} size={24} weight="fill" />
            </div>
          </div>
        )}
      </div>

      {/* 1px divider */}
      <div className="w-full h-px bg-[var(--border)]" />

      {/* Bottom 45% Content Area */}
      <div className="h-[45%] p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-[18px] font-medium text-[var(--text)] tracking-tight mb-2 line-clamp-1 group-hover:text-white transition-colors">
            {title}
          </h3>
          <p className="text-[14px] leading-relaxed text-[var(--muted)] line-clamp-3">
            {description}
          </p>
        </div>

        <span className="text-[12.5px] font-medium text-[var(--muted)] group-hover:text-[var(--text)] transition-colors flex items-center gap-1">
          Explore documentation &rarr;
        </span>
      </div>
    </Link>
  );
}
