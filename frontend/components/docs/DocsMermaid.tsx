"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import { Copy, Check, ZoomIn, ZoomOut, RotateCw, AlertTriangle } from "lucide-react";

interface DocsMermaidProps {
  chart: string;
  title?: string;
  className?: string;
}

export default function DocsMermaid({ chart, title, className = "" }: DocsMermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const rawId = useId();
  const diagramId = `mermaid-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    let isMounted = true;

    async function renderChart() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            darkMode: true,
            background: "#09090b",
            primaryColor: "#101013",
            primaryTextColor: "#f4f4f5",
            primaryBorderColor: "#27272d",
            lineColor: "#34343c",
            secondaryColor: "#151519",
            tertiaryColor: "#101013",
            edgeLabelBackground: "#101013",
            fontSize: "13px",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          },
          securityLevel: "loose",
        });

        const { svg } = await mermaid.render(diagramId, chart.trim());
        if (isMounted) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    renderChart();
    return () => {
      isMounted = false;
    };
  }, [chart, diagramId]);

  const handleCopySource = async () => {
    try {
      await navigator.clipboard.writeText(chart.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.15, 2.0));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.15, 0.5));
  const handleResetZoom = () => setScale(1);

  return (
    <div className={`my-8 rounded-[10px] border border-[var(--docs-border)] bg-[var(--docs-surface)] overflow-hidden ${className}`}>
      {/* Title & Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--docs-border)] bg-[var(--docs-surface-elevated)] text-[13px]">
        <span className="font-mono text-[var(--docs-text-muted)] font-normal">
          {title || "Architecture Diagram"}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomIn}
            className="p-1 rounded text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] transition-colors"
            title="Zoom In"
            aria-label="Zoom in diagram"
          >
            <ZoomIn className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 rounded text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] transition-colors"
            title="Zoom Out"
            aria-label="Zoom out diagram"
          >
            <ZoomOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1 rounded text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] transition-colors"
            title="Reset Zoom"
            aria-label="Reset zoom"
          >
            <RotateCw className="w-4 h-4" strokeWidth={1.5} />
          </button>

          <div className="w-px h-3.5 bg-[var(--docs-border)] mx-1" />

          <button
            onClick={handleCopySource}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[12px] font-mono text-[var(--docs-text-muted)] hover:text-[var(--docs-heading)] transition-colors"
            title="Copy Mermaid Code"
            aria-label="Copy diagram source"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} />
            ) : (
              <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
            <span>{copied ? "Copied" : "Source"}</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        ref={containerRef}
        className="p-6 overflow-x-auto flex items-center justify-center min-h-[180px] bg-[var(--docs-bg)]"
      >
        {error ? (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-red-900/30 bg-red-950/20 text-red-400 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" strokeWidth={1.5} />
            <span>Mermaid Render Error: {error}</span>
          </div>
        ) : svgContent ? (
          <div
            className="transition-transform duration-150 origin-center max-w-full"
            style={{ transform: `scale(${scale})` }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="text-[13px] font-mono text-[var(--docs-text-muted)] animate-pulse">
            Rendering diagram...
          </div>
        )}
      </div>
    </div>
  );
}
