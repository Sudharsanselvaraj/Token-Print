"use client";

import { useEffect, useRef, useState, useId } from "react";
import { Copy, Check, ZoomIn, ZoomOut, RotateCcw, AlertTriangle } from "lucide-react";

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
            background: "#080b11",
            primaryColor: "#1e293b",
            primaryTextColor: "#f1f5f9",
            primaryBorderColor: "#334155",
            lineColor: "#64748b",
            secondaryColor: "#0f172a",
            tertiaryColor: "#111827",
            edgeLabelBackground: "#0b0f19",
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
          console.error("Mermaid rendering failed:", err);
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, diagramId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(chart.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 2.5));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const handleResetZoom = () => setScale(1);

  return (
    <div className={`my-6 rounded-xl border border-slate-800 bg-[#090d16] overflow-hidden shadow-2xl ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-[#0d121f]">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
          <span className="text-xs font-mono font-medium text-slate-300">
            {title || "Architectural Flow Diagram"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            title="Reset zoom"
            aria-label="Reset zoom"
          >
            <RotateCcw size={14} />
          </button>
          <div className="h-3 w-px bg-slate-800 mx-1" />
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            title="Copy diagram source"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? "Copied" : "Source"}</span>
          </button>
        </div>
      </div>

      {/* Diagram Canvas */}
      <div className="relative p-6 overflow-auto max-h-[500px] flex items-center justify-center bg-radial from-[#0e1626]/50 to-[#070a12]">
        {error ? (
          <div className="w-full p-4 rounded-lg border border-amber-900/40 bg-amber-950/20 text-xs font-mono text-amber-300">
            <div className="flex items-center gap-2 mb-2 font-semibold">
              <AlertTriangle size={15} />
              <span>Diagram Rendering Notice</span>
            </div>
            <p className="text-amber-400/80 mb-3">{error}</p>
            <pre className="p-3 rounded bg-slate-950/80 border border-slate-900 overflow-x-auto text-[11px] text-slate-300">
              {chart}
            </pre>
          </div>
        ) : svgContent ? (
          <div
            ref={containerRef}
            style={{ transform: `scale(${scale})`, transformOrigin: "center center", transition: "transform 0.15s ease-out" }}
            className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="flex items-center gap-2 py-8 text-xs font-mono text-slate-500">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Compiling diagram vector...</span>
          </div>
        )}
      </div>
    </div>
  );
}
