"use client";

import React from "react";
import Link from "next/link";
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
  iconName = "FileText",
  tag,
}: DocCardProps) {
  return (
    <Link
      href={href}
      className="min-h-[185px] p-5 rounded-xl bg-[#141518] border border-white/[0.08] hover:border-white/20 transition-all no-underline flex flex-col justify-between group cursor-pointer"
    >
      {/* Top row: Icon and optional tag badge */}
      <div className="flex items-center justify-between">
        <div className="text-[#8a8f98] group-hover:text-white transition-colors">
          <LinearIcon name={iconName} size={18} strokeWidth={1.5} />
        </div>
        {tag && (
          <span className="text-[9.5px] px-1.5 py-0.5 rounded font-mono uppercase bg-white/[0.06] text-[#8a8f98] border border-white/5">
            {tag}
          </span>
        )}
      </div>

      {/* Bottom area: Title & Full Description */}
      <div className="pt-6">
        <div className="text-[14.5px] font-semibold text-white tracking-tight mb-1 group-hover:text-white transition-colors">
          {title}
        </div>
        <p className="text-[12.5px] text-[#8a8f98] leading-[1.5] group-hover:text-[#a1a1aa] transition-colors m-0">
          {description}
        </p>
      </div>
    </Link>
  );
}
