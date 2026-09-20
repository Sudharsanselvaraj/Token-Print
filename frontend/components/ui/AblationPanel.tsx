"use client";

import { useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { backendIdentity, captureIntervention } from "@/lib/experiments";
import { fetchDebugSnapshot, type DebugAnalyzeResponse } from "@/lib/api";

export default function AblationPanel() {
  const data = useStore((s) => s.data);
  const sentence = data?.sentence;
  const numLayers = data?.num_layers ?? 0;
  const numHeads = data?.num_heads ?? 0;

  const [heads, setHeads] = useState<Record<string, Set<number>>>({});
  const [layers, setLayers] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [normal, setNormal] = useState<DebugAnalyzeResponse | null>(null);
  const [ablated, setAblated] = useState<DebugAnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleHead = useCallback((l: number, h: number) => {
    setHeads((prev) => {
      const next = { ...prev };
      const s = new Set(next[String(l)] || []);
      if (s.has(h)) s.delete(h);
      else s.add(h);
      next[String(l)] = s;
      return next;
    });
  }, []);

  const toggleLayer = useCallback((l: number) => {
    setLayers((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  }, []);

  const run = useCallback(async () => {
    if (!sentence) return;
    setLoading(true);
    setError(null);
    try {
      const identity = await backendIdentity();
      const normalRes = await fetchDebugSnapshot(sentence);
      const zeroHeads: Record<string, number[]> = {};
      for (const [k, v] of Object.entries(heads)) {
        if (v.size > 0) zeroHeads[k] = [...v];
      }
      const ablatedRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/ablate/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentence,
          zero_heads: zeroHeads,
          zero_layers: [...layers],
        }),
      });
      if (!ablatedRes.ok) throw new Error(`Ablation failed (${ablatedRes.status})`);
      const ablatedData = await ablatedRes.json();
      await captureIntervention("ablation", { prompt: sentence, zero_heads: zeroHeads, zero_layers: [...layers] }, { baseline: normalRes, ablated: ablatedData }, identity);
      setNormal(normalRes);
      setAblated(ablatedData);
    } catch (e: any) {
      setError(e.message ?? "Ablation failed");
    } finally {
      setLoading(false);
    }
  }, [sentence, heads, layers]);

  // Compute logit lens diff
  const diffEntries = (() => {
    if (!normal?.logit_lens || !ablated?.logit_lens) return null;
    const nl = normal.logit_lens as any[][][];
    const al = ablated.logit_lens as any[][][];
    const layers = Math.min(nl.length, al.length);
    const positions = Math.min(nl[0]?.length ?? 1, al[0]?.length ?? 1);
    const entries: { layer: number; pos: number; before: string; after: string; changed: boolean }[] = [];
    for (let l = 0; l < layers; l++) {
      for (let p = 0; p < positions; p++) {
        const b = nl[l]?.[p]?.[0]?.text ?? "?";
        const a = al[l]?.[p]?.[0]?.text ?? "?";
        entries.push({ layer: l, pos: p, before: b, after: a, changed: b !== a });
      }
    }
    return entries;
  })();

  const changedCount = diffEntries?.filter((e) => e.changed).length ?? 0;

  const activeHeads = Object.values(heads).reduce((s, v) => s + v.size, 0);
  const activeLayers = layers.size;

  return (
    <div className="ablation-panel">
      <div className="ab-title">Ablation</div>
      <div className="ab-desc">
        Zero out attention heads or entire layers to see how the model changes.
      </div>

      <div className="ab-controls">
        <div className="ab-section-label">Zero entire layers</div>
        <div className="ab-layer-toggles">
          {Array.from({ length: Math.min(numLayers, 40) }, (_, i) => (
            <button
              key={i}
              className={`ab-layer-btn${layers.has(i) ? " active" : ""}`}
              onClick={() => toggleLayer(i)}
            >
              L{i}
            </button>
          ))}
        </div>

        <div className="ab-section-label">Zero heads (layer:head)</div>
        <div className="ab-head-toggles">
          {Array.from({ length: Math.min(numLayers, 4) }, (_, li) =>
            Array.from({ length: Math.min(numHeads, 8) }, (_, hi) => (
              <button
                key={`${li}-${hi}`}
                className={`ab-head-btn${heads[String(li)]?.has(hi) ? " active" : ""}`}
                onClick={() => toggleHead(li, hi)}
              >
                {li}:{hi}
              </button>
            )),
          )}
        </div>

        <button
          className="ab-run-btn"
          onClick={run}
          disabled={loading || (activeHeads === 0 && activeLayers === 0)}
        >
          {loading ? "Running…" : `Run (${activeHeads}h + ${activeLayers}l)`}
        </button>
      </div>

      {error && <div className="error">⚠ {error}</div>}

      {/* A/B Trace Diff */}
      {diffEntries && (
        <div className="ab-diff">
          <div className="ab-diff-title">
            Logit Lens Diff
            <span className="ab-diff-count">
              {changedCount} / {diffEntries.length} positions changed
            </span>
          </div>
          <div className="ab-diff-grid">
            {diffEntries.slice(0, 200).map((e, i) => (
              <div
                key={i}
                className={`ab-diff-cell${e.changed ? " changed" : ""}`}
                title={`L${e.layer} pos${e.pos}: "${e.before}" → "${e.after}"`}
              >
                <span className="ab-diff-before">{e.before.length > 3 ? e.before.slice(0, 2) + "…" : e.before}</span>
                <span className="ab-diff-arrow">→</span>
                <span className="ab-diff-after">{e.after.length > 3 ? e.after.slice(0, 2) + "…" : e.after}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
