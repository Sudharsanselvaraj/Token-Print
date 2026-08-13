"use client";

import { useStore } from "@/lib/store";
import { useMemo, useState, useCallback } from "react";
import type { Trace, TokenFrame } from "@/lib/types";

interface DiffField {
  key: string;
  label: string;
  a: unknown;
  b: unknown;
  changed: boolean;
}

interface FrameDiff {
  step: number;
  tokenA: string;
  tokenB: string;
  diverges: boolean;
  probA: number;
  probB: number;
}

export default function ConfigDiff() {
  const arch = useStore((s) => s.arch);
  const compare = useStore((s) => s.compareArch);
  const genFrames = useStore((s) => s.genFrames);
  const genMeta = useStore((s) => s.genMeta);

  // --- Architecture metadata diff --- //
  const diffs = useMemo(() => {
    if (!arch?.metadata || !compare?.metadata) return null;
    const a = arch.metadata;
    const b = compare.metadata;
    const fields: DiffField[] = [
      { key: "architecture", label: "Architecture", a: a.architecture, b: b.architecture, changed: false },
      { key: "num_layers", label: "Layers", a: a.num_layers, b: b.num_layers, changed: false },
      { key: "hidden_size", label: "Hidden", a: a.hidden_size, b: b.hidden_size, changed: false },
      { key: "num_heads", label: "Heads", a: a.num_heads, b: b.num_heads, changed: false },
      { key: "num_kv_heads", label: "KV Heads", a: a.num_kv_heads, b: b.num_kv_heads, changed: false },
      { key: "head_dim", label: "Head Dim", a: a.head_dim, b: b.head_dim, changed: false },
      { key: "ffn_size", label: "FFN", a: a.ffn_size, b: b.ffn_size, changed: false },
      { key: "vocab_size", label: "Vocab", a: a.vocab_size, b: b.vocab_size, changed: false },
      { key: "context_length", label: "Context", a: a.context_length, b: b.context_length, changed: false },
      { key: "rope_theta", label: "RoPE θ", a: a.rope_theta, b: b.rope_theta, changed: false },
      { key: "tie_word_embeddings", label: "Tie Emb", a: a.tie_word_embeddings, b: b.tie_word_embeddings, changed: false },
      { key: "quantization", label: "Quant", a: a.quantization, b: b.quantization, changed: false },
      { key: "total_params", label: "Params", a: a.total_params, b: b.total_params, changed: false },
      { key: "expert_count", label: "Experts", a: a.expert_count, b: b.expert_count, changed: false },
    ];
    for (const f of fields) {
      f.changed = String(f.a) !== String(f.b);
    }
    return fields;
  }, [arch, compare]);

  // --- Trace comparison --- //
  const [traceB, setTraceB] = useState<TokenFrame[] | null>(null);
  const [traceBName, setTraceBName] = useState<string>("");
  const [traceBMeta, setTraceBMeta] = useState<string>("");

  const loadTraceB = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const trace: Trace = JSON.parse(text);
      setTraceB(trace.frames ?? []);
      setTraceBName(file.name);
      setTraceBMeta(`${trace.meta.num_layers}L · ${trace.frames?.length ?? 0} tokens`);
    } catch (e) {
      setTraceB(null);
      setTraceBName("parse error");
      setTraceBMeta("");
    }
  }, []);

  const traceDiffs: FrameDiff[] | null = useMemo(() => {
    if (!traceB || genFrames.length === 0) return null;
    const maxLen = Math.max(genFrames.length, traceB.length);
    const diffs: FrameDiff[] = [];

    for (let i = 0; i < maxLen; i++) {
      const fA = genFrames[i];
      const fB = traceB[i];
      const tokenA = fA?.chosen.text ?? "—";
      const tokenB = fB?.chosen.text ?? "—";
      const probA = fA?.chosen.logprob ? Math.exp(fA.chosen.logprob) : 0;
      const probB = fB?.chosen.logprob ? Math.exp(fB.chosen.logprob) : 0;
      const diverges = tokenA !== tokenB;

      diffs.push({ step: i, tokenA, tokenB, diverges, probA, probB });
    }
    return diffs;
  }, [genFrames, traceB]);

  const hasMeta = !!diffs;
  const hasTrace = !!traceDiffs;
  const changedMeta = diffs?.filter((d) => d.changed) ?? [];

  return (
    <div className="config-diff">
      {/* --- Architecture diff --- */}
      {hasMeta && (
        <>
          <div className="cd-title">Config Diff</div>
          <div className="cd-files">
            <span className="cd-file-a">{arch?.metadata.name}</span>
            <span className="cd-vs">vs</span>
            <span className="cd-file-b">{compare?.metadata.name}</span>
          </div>
          {changedMeta.length === 0 ? (
            <div className="cd-identical">Configs are identical</div>
          ) : (
            <div className="cd-diffs">
              {changedMeta.map((f) => (
                <div key={f.key} className="cd-row">
                  <span className="cd-label">{f.label}</span>
                  <span className="cd-val-a">{String(f.a)}</span>
                  <span className="cd-arrow">→</span>
                  <span className="cd-val-b">{String(f.b)}</span>
                </div>
              ))}
            </div>
          )}
          <details className="cd-all">
            <summary>All fields</summary>
            <div className="cd-all-table">
              {diffs!.map((f) => (
                <div key={f.key} className={`cd-all-row${f.changed ? " changed" : ""}`}>
                  <span className="cd-all-label">{f.label}</span>
                  <span className="cd-all-val">{String(f.a)}</span>
                </div>
              ))}
            </div>
          </details>
        </>
      )}

      {/* --- Trace diff --- */}
      <div className="cd-section">
        <div className="cd-title">Trace Diff</div>
        {!hasTrace && (
          <div className="cd-trace-upload">
            <label className="cd-upload-btn">
              Load second trace to compare
              <input
                type="file"
                accept=".json"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadTraceB(file);
                }}
              />
            </label>
            {genFrames.length > 0 && (
              <span className="cd-trace-info">
                Current: {genFrames.length} tokens · {genMeta?.num_layers}L
              </span>
            )}
          </div>
        )}

        {hasTrace && traceDiffs && (
          <>
            <div className="cd-trace-meta">
              <span className="cd-trace-file">{traceBName}</span>
              <span className="cd-trace-file">{traceBMeta}</span>
              <span className="cd-trace-divergences">
                {traceDiffs.filter((d) => d.diverges).length} divergence(s)
              </span>
            </div>

            <div className="cd-trace-table">
              {traceDiffs.map((d) => (
                <div
                  key={d.step}
                  className={"cd-trace-row" + (d.diverges ? " diverges" : "")}
                >
                  <span className="cd-trace-step">{d.step}</span>
                  <span className="cd-trace-token">{d.tokenA.replace(/\n/g, "⏎")}</span>
                  <span className="cd-trace-vs">{d.diverges ? "≠" : "="}</span>
                  <span className="cd-trace-token">{d.tokenB.replace(/\n/g, "⏎")}</span>
                </div>
              ))}
            </div>

            <button
              className="cd-clear-trace"
              onClick={() => { setTraceB(null); setTraceBName(""); setTraceBMeta(""); }}
            >
              Clear comparison
            </button>
          </>
        )}
      </div>
    </div>
  );
}
