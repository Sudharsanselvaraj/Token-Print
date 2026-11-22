"use client";

import React, { useState } from "react";
import { Copy, Check } from "@phosphor-icons/react";

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
    <div className="relative my-6 rounded-[12px] bg-[var(--card)] border border-[var(--border)] overflow-hidden group">
      {filename && (
        <div className="h-9 px-4 border-b border-[var(--border)] flex items-center justify-between text-[12px] font-mono text-[var(--muted)]">
          <span>{filename}</span>
        </div>
      )}

      {/* Copy icon button top right */}
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-md bg-[#18181b]/80 border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-colors duration-150"
        aria-label="Copy code to clipboard"
        title={copied ? "Copied" : "Copy code"}
      >
        {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="fill" />}
      </button>

      <pre className="p-5 font-mono text-[13.5px] leading-relaxed text-[var(--text)] overflow-x-auto scrollbar-none">
        <code>{code}</code>
      </pre>
    </div>
  );
}
