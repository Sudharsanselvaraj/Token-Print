"use client";

import { useCallback, useState } from "react";
import { useStore } from "@/lib/store";

export type TraceMeta = {
  id: string;
  title: string;
  description: string;
  architecture: string;
  tags: string[];
  tokens: number;
};

const TRACES: TraceMeta[] = [
  {
    id: "hello-world",
    title: "Hello World",
    description: "Classic coding prompt: 'Hello world! The meaning of life is'",
    architecture: "Llama-3-8B",
    tags: ["basic", "causal_lm"],
    tokens: 9,
  },
  {
    id: "reasoning-math",
    title: "Math Reasoning",
    description: "Step-by-step math reasoning prompt trace.",
    architecture: "Qwen-2.5-7B",
    tags: ["math", "reasoning"],
    tokens: 24,
  },
  {
    id: "moe-routing",
    title: "Mixture of Experts",
    description: "Demonstration of router gates in an MoE model.",
    architecture: "Mixtral-8x7B",
    tags: ["moe", "routing"],
    tokens: 15,
  },
  {
    id: "vision-attention",
    title: "Vision Transformer",
    description: "Image patch attention on a golden retriever image.",
    architecture: "ViT-B",
    tags: ["vision", "encoder"],
    tokens: 196,
  },
];

export default function TraceGallery() {
  const open = useStore((s) => s.traceGalleryOpen);
  const setOpen = useStore((s) => s.setTraceGalleryOpen);
  const loadTrace = useStore((s) => s.loadTrace);
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (trace: TraceMeta) => {
      setLoading(trace.id);
      setErr(null);
      try {
        const resp = await fetch(`/demo/${trace.id}.json`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const file = new File([blob], `${trace.id}.json`, { type: "application/json" });
        await loadTrace(file);
        setOpen(false); // Close gallery after load
      } catch (e: any) {
        setErr(e.message ?? "Failed to load trace");
      } finally {
        setLoading(null);
      }
    },
    [loadTrace, setOpen]
  );

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div className="modal-content trace-gallery" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Community Trace Gallery</h2>
          <button className="close-btn" onClick={() => setOpen(false)}>✕</button>
        </div>
        
        {err && <div className="error-banner">{err}</div>}

        <div className="gallery-grid">
          {TRACES.map((t) => (
            <div key={t.id} className="gallery-card">
              <h3>{t.title}</h3>
              <p className="desc">{t.description}</p>
              <div className="meta">
                <span className="arch">{t.architecture}</span>
                <span className="tokens">{t.tokens} tokens</span>
              </div>
              <div className="tags">
                {t.tags.map(tag => <span key={tag} className="tag">#{tag}</span>)}
              </div>
              <button 
                className="primary-btn load-btn"
                onClick={() => load(t)}
                disabled={loading !== null}
              >
                {loading === t.id ? "Loading..." : "Load Trace"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
