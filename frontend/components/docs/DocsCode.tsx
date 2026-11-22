"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface DocsCodeProps {
  code: string;
  lang?: string;
  filename?: string;
}

export default function DocsCode({ code, lang = "bash", filename }: DocsCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="relative my-5 rounded-lg bg-[var(--docs-surface)] border border-[var(--docs-border)] overflow-hidden group">
      {/* Header with language tag / filename and copy button */}
      <div className="h-8 px-3.5 border-b border-[var(--docs-border)] bg-[var(--docs-surface)] flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase text-[var(--docs-text-muted)] tracking-wider">
          {filename || lang}
        </span>

        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-sans text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] transition-colors"
          aria-label="Copy code to clipboard"
          title={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <>
              <Check size={12} className="text-[var(--docs-semantic-success)]" />
              <span className="text-[var(--docs-semantic-success)]">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} strokeWidth={1.5} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <pre className="p-4 font-mono text-[13px] leading-relaxed text-[var(--docs-text)] overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--docs-border)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
