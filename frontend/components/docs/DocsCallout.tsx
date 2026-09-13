import React from "react";

type CalloutVariant = "note" | "warning" | "tip" | "important";

interface DocsCalloutProps {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
}

const LABELS: Record<CalloutVariant, string> = {
  note: "Note",
  warning: "Warning",
  tip: "Tip",
  important: "Important",
};

export default function DocsCallout({
  variant = "note",
  title,
  children,
}: DocsCalloutProps) {
  return (
    <div className={`docs-callout docs-callout--${variant}`} role="note">
      <span className="docs-callout-label">{title ?? LABELS[variant]}</span>
      <div className="docs-callout-body">{children}</div>
    </div>
  );
}
