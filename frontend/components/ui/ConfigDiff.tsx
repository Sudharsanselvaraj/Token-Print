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

/**
 * ConfigDiff (issue #65): one diff engine for (a) architecture/quant metadata
 * between two GGUF checkpoints, (b) dequantized per-tensor error, and (c)
 * cross-model / cross-quant trace comparison — highlighting the first
 * divergence token so a Q4-vs-F16 or model-A-vs-model-B mismatch is obvious.
 */
export default function ConfigDiff() {
  const arch = useStore((s) => s.arch);
  const compare = useStore((s) => s.compareArch);
  const genFrames = useStore((s) => s.genFrames);
  const genMeta = useStore((s) => s.genMeta);
  const hotSpots = useStore((s) => s.hotSpots);

  // --- Architecture / quant metadata diff --- //
  const diffs = useMemo(() => {
    if (!arch?.metadata || !compare?.metadata) return null;
    const a = arch.metadata;
    const b = compare.metadata;
    const fields: DiffField[] = [
      { key: "architecture", label: "Architecture", a: a.architecture, b: b.architecture, changed: false },
      { key: "quantization", label: "Quant", a: a.quantization ?? "f16?" , b: b.quantization ?? "f16?", changed: false },
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
      { key: "total_params", label: "Params", a: a.total_params, b: b.total_params, changed: false },
      { key: "expert_count", label: "Experts", a: a.expert_count, b: b.expert_count, changed: false },
    ];
    for (const f of fields) f.changed = String(f.a) !== String(f.b);
    // Compute an inferred quant tag from the file name when metadata lacks it.
    const inferQuant = (name?: string, q?: string | null) => {
      if (q) return q;
      if (!name) return "?";
      const m = name.match(/-(Q\d+[A-Z_]*|F16|BF16|FP32|IQ\d+[A-Z_]*)/i);
      return m ? m[1].toUpperCase() : "?";
    };
    for (const f of fields) {
      if (f.key === "quantization") {
        f.a = inferQuant(archFileDisplayName(), a.quantization);
        f.b = inferQuant(compareFileDisplayName(), b.quantization);
        f.changed = f.a !== f.b;
      }
    }
    return fields;
  }, [arch, compare, hotSpots]);

  // --- Trace comparison (cross-model / cross-quant) --- //
  const [traceB, setTraceB] = useState<TokenFrame[] | null>(null);
  const [traceBFile, setTraceBFile] = useState<Trace | null>(null);
  const [traceBName, setTraceBName] = useState<string>("");

  const loadTraceB = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const trace: Trace = JSON.parse(text);
      setTraceB(trace.frames ?? []);
      setTraceBFile(trace);
      setTraceBName(file.name);
    } catch (e) {
      setTraceB(null);
      setTraceBFile(null);
      setTraceBName("parse error");
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

  const firstDivergence = useMemo(
    () => traceDiffs?.find((d) => d.diverges) ?? null,
    [traceDiffs],
  );
  const nDivergences = traceDiffs?.filter((d) => d.diverges).length ?? 0;

  const crossModel =
    traceBFile &&
    genMeta?.model &&
    traceBFile.meta?.model &&
    traceBFile.meta.model !== genMeta.model;

  const quantA = arch?.metadata.quantization ?? inferFromName(arch?.model ?? "");
  const quantB = compare?.metadata.quantization ?? inferFromName(compareFileDisplayName());

  const hasMeta = !!diffs;
  const hasTrace = !!traceDiffs;
  const changedMeta = diffs?.filter((d) => d.changed) ?? [];
  const topHotSpot = hotSpots[0];

  function archFileDisplayName(): string {
    return arch?.model ?? "";
  }
  function compareFileDisplayName(): string {
    return compare?.model ?? "";
  }
  function inferFromName(name: string): string {
    const m = name.match(/-(Q\d+[A-Z_]*|F16|BF16|FP32|IQ\d+[A-Z_]*)/i);
    return m ? m[1].toUpperCase() : "?";
  }

  return (
    <div className="config-diff">
      {hasMeta && (
        <>
          <div className="cd-title">Config Diff</div>
          <div className="cd-files">
            <span className="cd-file-a">
              {arch?.metadata.name}
              <em className="cd-quant">{quantA}</em>
            </span>
            <span className="cd-vs">vs</span>
            <span className="cd-file-b">
              {compare?.metadata.name}
              <em className="cd-quant">{quantB}</em>
            </span>
          </div>

          <div className="cd-badge-row">
            {quantA !== quantB && (
              <span className="cd-badge cd-badge-quant">
                ⚖ {quantA} ≠ {quantB} (quantized-vs-float weights)
              </span>
            )}
            {arch?.metadata.architecture !== compare?.metadata.architecture && (
              <span className="cd-badge">
                🧬 {arch?.metadata.architecture} vs {compare?.metadata.architecture}
              </span>
            )}
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

          {topHotSpot && (
            <div className="cd-hotspot">
              Largest weight delta:{" "}
              <b>{topHotSpot.name}</b> (mean abs diff{" "}
              {topHotSpot.score.toFixed(6)})
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
                {genMeta?.model ? ` · ${genMeta.model.split("/").pop()}` : ""}
              </span>
            )}
          </div>
        )}

        {hasTrace && traceDiffs && (
          <>
            <div className="cd-trace-meta">
              <span className="cd-trace-file">
                A: {genMeta?.model?.split("/").pop() ?? "current"}
              </span>
              {crossModel ? (
                <span className="cd-badge">🧬 cross-model</span>
              ) : (
                <span className="cd-badge cd-badge-ok">same model</span>
              )}
              <span className="cd-trace-file">
                B: {traceBFile?.meta?.model?.split("/").pop() ?? traceBName}
              </span>
              <span className={"cd-trace-divergences" + (nDivergences ? " diverges" : "")}>
                {nDivergences} divergence(s)
              </span>
            </div>

            {firstDivergence && (
              <div className="cd-first-divergence">
                First divergence at token <b>{firstDivergence.step}</b>:{" "}
                <i>{firstDivergence.tokenA.replace(/\n/g, "⏎")}</i> →{" "}
                <i>{firstDivergence.tokenB.replace(/\n/g, "⏎")}</i>
              </div>
            )}

            <div className="cd-trace-table">
              {traceDiffs.map((d) => (
                <div
                  key={d.step}
                  className={
                    "cd-trace-row" +
                    (d.diverges ? " diverges" : "") +
                    (firstDivergence && d.step === firstDivergence.step
                      ? " first-divergence"
                      : "")
                  }
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
              onClick={() => {
                setTraceB(null);
                setTraceBFile(null);
                setTraceBName("");
              }}
            >
              Clear comparison
            </button>
          </>
        )}
      </div>
    </div>
  );
}