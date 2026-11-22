"use client";

import React from "react";
import { Info } from "@phosphor-icons/react";

type CalloutVariant = "note" | "warning" | "tip" | "important";

interface DocsCalloutProps {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
}

export default function DocsCallout({
  variant = "note",
  title,
  children,
}: DocsCalloutProps) {
  return (
    <aside
      className="my-6 p-4 rounded-[10px] bg-[var(--card)] border border-[var(--border)] text-[15px] leading-relaxed text-[var(--body)] flex items-start gap-3"
      role="note"
    >
      <div className="text-[var(--muted)] mt-0.5 flex-shrink-0">
        <Info size={18} weight="fill" />
      </div>
      <div className="flex-1">
        {title && (
          <div className="text-[14px] font-medium text-[var(--text)] mb-1">
            {title}
          </div>
        )}
        <div className="text-[14.5px] text-[var(--body)] leading-relaxed">
          {children}
        </div>
      </div>
    </aside>
  );
}
