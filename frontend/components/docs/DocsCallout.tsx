"use client";

import React from "react";
import { Info, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";

type CalloutVariant = "note" | "tip" | "warning" | "danger" | "important";

interface DocsCalloutProps {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
}

const VARIANT_CONFIG: Record<
  CalloutVariant,
  {
    icon: React.ElementType;
    borderClass: string;
    iconClass: string;
    titleColor: string;
  }
> = {
  note: {
    icon: Info,
    borderClass: "border-[var(--docs-border)]",
    iconClass: "text-[var(--docs-accent)]",
    titleColor: "text-[var(--docs-heading)]",
  },
  tip: {
    icon: CheckCircle2,
    borderClass: "border-[var(--docs-semantic-success)]/40",
    iconClass: "text-[var(--docs-semantic-success)]",
    titleColor: "text-[var(--docs-semantic-success)]",
  },
  warning: {
    icon: AlertTriangle,
    borderClass: "border-[var(--docs-semantic-warning)]/40",
    iconClass: "text-[var(--docs-semantic-warning)]",
    titleColor: "text-[var(--docs-semantic-warning)]",
  },
  danger: {
    icon: AlertOctagon,
    borderClass: "border-[var(--docs-semantic-danger)]/40",
    iconClass: "text-[var(--docs-semantic-danger)]",
    titleColor: "text-[var(--docs-semantic-danger)]",
  },
  important: {
    icon: AlertTriangle,
    borderClass: "border-[var(--docs-semantic-warning)]/40",
    iconClass: "text-[var(--docs-semantic-warning)]",
    titleColor: "text-[var(--docs-semantic-warning)]",
  },
};

export default function DocsCallout({
  variant = "note",
  title,
  children,
}: DocsCalloutProps) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.note;
  const IconComponent = config.icon;

  return (
    <aside
      className={`my-5 p-3.5 rounded-lg bg-[var(--docs-surface)] border ${config.borderClass} text-[14px] leading-relaxed text-[var(--docs-text)] flex items-start gap-3`}
      role="note"
    >
      <div className={`${config.iconClass} mt-0.5 flex-shrink-0`}>
        <IconComponent size={16} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <div className={`text-[13px] font-semibold ${config.titleColor} mb-1`}>
            {title}
          </div>
        )}
        <div className="text-[13.5px] text-[var(--docs-text)] leading-relaxed [&>p]:mb-1 [&>p:last-child]:mb-0">
          {children}
        </div>
      </div>
    </aside>
  );
}
