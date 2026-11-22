"use client";

import React from "react";
import Image from "next/image";

interface ImagePanelProps {
  src: string; // path to webp or png in /docs/
  alt: string;
  caption?: string;
  annotation?: string; // Optional callout annotation
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
    <figure className="my-7 select-none">
      <div className="relative w-full rounded-lg bg-[var(--docs-surface)] border border-[var(--docs-border)] overflow-hidden p-2 sm:p-3">
        {/* Monospace bracket annotation */}
        {annotation && (
          <div className="px-1.5 py-0.5 mb-1.5 flex items-center gap-2">
            <span className="font-mono text-[10.5px] text-[var(--docs-text-muted)] tracking-wider">
              {annotation}
            </span>
          </div>
        )}

        {/* Clean technical image container with object-fit: contain */}
        <div className="relative w-full aspect-[16/9] overflow-hidden rounded bg-[#09090b] border border-[var(--docs-border)] flex items-center justify-center">
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {caption && (
        <figcaption className="mt-2 text-center text-[11px] text-[var(--docs-text-muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
