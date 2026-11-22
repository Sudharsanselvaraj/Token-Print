"use client";

import React from "react";
import Image from "next/image";

interface ImagePanelProps {
  src: string; // path to webp or png in /docs/
  alt: string;
  caption?: string;
  annotation?: string; // Optional callout annotation on side
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function ImagePanel({
  src,
  alt,
  caption,
  annotation,
  width = 1600,
  height = 900,
  priority = false,
}: ImagePanelProps) {
  return (
    <figure className="my-10 select-none">
      <div className="relative w-full rounded-[20px] lg:rounded-[24px] bg-[#101012] border border-[var(--border)] overflow-hidden shadow-2xl p-4 sm:p-6 lg:p-8">
        {/* Optional bracket annotation */}
        {annotation && (
          <div className="absolute top-6 left-6 z-10 max-w-xs flex items-start gap-2.5">
            <div className="w-1.5 h-6 border-l-2 border-t-2 border-[var(--border-strong)] mt-0.5" />
            <p className="text-[13.5px] leading-relaxed text-[var(--muted)] font-normal">
              {annotation}
            </p>
          </div>
        )}

        {/* Scaled UI screenshot with offset and edge gradient fade */}
        <div className="relative w-full aspect-[16/9] overflow-hidden rounded-[14px] bg-[#09090b] border border-[var(--border)]">
          <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)] [mask-image:linear-gradient(to_right,black_90%,transparent_100%)]">
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              priority={priority}
              loading={priority ? undefined : "lazy"}
              className="w-full h-full object-cover object-left-top"
            />
          </div>
        </div>
      </div>

      {caption && (
        <figcaption className="mt-3 text-center text-[13.5px] text-[var(--muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
