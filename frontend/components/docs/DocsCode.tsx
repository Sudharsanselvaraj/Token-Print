"use client";

import { useState } from "react";

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
    <div className="docs-code-block">
      <div className="docs-code-header">
        <span className="docs-code-lang">{filename ?? lang}</span>
        <button
          className="docs-code-copy"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="docs-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}
