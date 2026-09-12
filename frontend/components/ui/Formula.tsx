"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export default function Formula({ latex }: { latex: string }) {
  const html = useMemo(() => {
    if (!latex) return "";
    try {
      const renderFn =
        typeof katex?.renderToString === "function"
          ? katex.renderToString
          : typeof (katex as any)?.default?.renderToString === "function"
          ? (katex as any).default.renderToString
          : typeof katex === "function"
          ? (katex as any)
          : null;
      if (typeof renderFn === "function") {
        return renderFn(latex, { displayMode: true, throwOnError: false });
      }
    } catch (e) {
      console.warn("[Formula] KaTeX render failed:", e);
    }
    return `<span class="katex-fallback">${latex}</span>`;
  }, [latex]);

  return <div className="formula" dangerouslySetInnerHTML={{ __html: html }} />;
}

