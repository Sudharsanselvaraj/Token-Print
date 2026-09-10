"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";

type DemoEntry = {
  id: string;
  title: string;
  description: string;
};

const DEMOS: DemoEntry[] = [
  {
    id: "hello-world",
    title: "Hello World",
    description: "Classic coding prompt: \"Hello world! The meaning of life is\"",
  },
];

export default function DemoData() {
  const loadTrace = useStore((s) => s.loadTrace);
  const setTraceGalleryOpen = useStore((s) => s.setTraceGalleryOpen);
  const arch = useStore((s) => s.arch);
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (demo: DemoEntry) => {
      setLoading(demo.id);
      setErr(null);
      try {
        const resp = await fetch(`/demo/${demo.id}.json`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const file = new File([blob], `${demo.id}.json`, {
          type: "application/json",
        });
        await loadTrace(file);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load demo trace");
      } finally {
        setLoading(null);
      }
    },
    [loadTrace],
  );

  if (arch) return null;

  return (
    <div className="side-section">
      <div className="side-title">Demo Traces</div>
      <div className="side-note">
        No model loaded. Explore curated recorded traces instead.
      </div>
      <div className="demo-list">
        {DEMOS.map((d) => (
          <button
            key={d.id}
            className="demo-card"
            onClick={() => load(d)}
            disabled={loading === d.id}
          >
            <div className="demo-card-title">
              {loading === d.id ? <>Loading…</> : <>{d.title} ▶</>}
            </div>
            <div className="demo-card-desc">{d.description}</div>
          </button>
        ))}
        <button 
          className="demo-card" 
          style={{ marginTop: 8, borderColor: "var(--accent)" }}
          onClick={() => setTraceGalleryOpen(true)}
        >
          <strong>View Trace Gallery →</strong>
        </button>
      </div>
      {err && <div className="error">⚠ {err}</div>}
    </div>
  );
}
