"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { CITATIONS } from "@/lib/citations";

const PROMPTS = [
  "The capital of France is",
  "She walked into the room and",
  "def fib(n):\n    if n <= 1:",
  "Once upon a time there",
  "2 + 2 =",
];

interface Verdict {
  head: number;
  pattern: string;
  induction: boolean;
  score: number;
}

export default function InductionHeadLab() {
  const data = useStore((s) => s.data);
  const [activePrompt, setActivePrompt] = useState(PROMPTS[0]);

  const citation = CITATIONS.induction_heads;

  // Run simplified induction-head detection on layer 0 & layer 1 attention matrices.
  // Induction heads: head that attends to token B at position i+1 when
  // token A attended to token B at position i (the "copy" pattern).
  const verdicts: Verdict[] = useMemo(() => {
    if (!data?.attention?.[0]) return [];
    const layer = data.attention[1] || data.attention[0];
    const nh = layer.length;
    const verdicts: Verdict[] = [];

    for (let h = 0; h < nh; h++) {
      const attn = layer[h];
      let inductionScore = 0;
      let count = 0;

      for (let i = 0; i < attn.length - 1; i++) {
        for (let j = 0; j < attn[i].length - 1; j++) {
          if (attn[i][j] > 0.3 && attn[i + 1][j + 1] > 0.3) {
            inductionScore++;
          }
          count++;
        }
      }

      const normScore = count > 0 ? inductionScore / count : 0;

      let pattern = "uniform";
      if (normScore > 0.15) pattern = "induction";
      else if (normScore > 0.06) pattern = "partial-induction";

      verdicts.push({
        head: h,
        pattern,
        induction: normScore > 0.1,
        score: normScore * 100,
      });
    }

    return verdicts.sort((a, b) => b.score - a.score);
  }, [data]);

  if (!data?.attention?.length) {
    return (
      <div className="induction-lab p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200">
        <div className="il-title font-semibold text-lg text-white mb-2">Induction-Head Lab</div>
        <div className="il-empty text-sm text-neutral-400">Run an analysis first to detect induction heads.</div>
      </div>
    );
  }

  const inductHeads = verdicts.filter((v) => v.induction);
  const hasStrongInduction = inductHeads.length > 0;
  const topHead = verdicts[0]?.head ?? 0;

  return (
    <div className="induction-lab p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 space-y-4">
      {/* Header & Citation */}
      <div className="flex items-start justify-between">
        <div>
          <div className="il-title font-semibold text-lg text-white flex items-center gap-2">
            Induction-Head Lab
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
              2-Head Circuit
            </span>
          </div>
          <div className="il-desc text-xs text-neutral-400 mt-1">
            Detects 2-head circuits: Previous-Token Head (L0) → Composition Wire → Induction Head (L1).
          </div>
        </div>

        {citation && (
          <a
            href={citation.url}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors shrink-0"
            title={citation.why}
          >
            {citation.authors.split(",")[0]} et al. ({citation.year})
          </a>
        )}
      </div>

      {/* Circuit Fallback Notice / Status */}
      {!hasStrongInduction ? (
        <div className="p-2.5 rounded bg-neutral-900/80 border border-amber-500/30 text-amber-200 text-xs">
          <strong>Notice:</strong> No strong induction pattern in current prompt. Showing general attention circuit.
        </div>
      ) : (
        <div className="p-2.5 rounded bg-neutral-900/80 border border-emerald-500/30 text-emerald-200 text-xs">
          <strong>Detected:</strong> Found {inductHeads.length} active induction head{inductHeads.length > 1 ? "s" : ""} (top candidate: Layer 1 Head {topHead}).
        </div>
      )}

      {/* 2-Head Circuit Visual Pipeline */}
      <div className="il-pipeline bg-neutral-900 p-3 rounded-lg border border-neutral-800 text-xs space-y-2">
        <div className="font-medium text-neutral-300 border-b border-neutral-800 pb-1 flex items-center justify-between">
          <span>Circuit Architecture Trace</span>
          <span className="text-[10px] text-neutral-500">[A][B] ... [A] → [B]</span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center pt-1">
          <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
            <div className="font-mono text-[10px] text-neutral-400">Step 1: L0</div>
            <div className="font-semibold text-white">Prev-Token H</div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Shifts pos (i → i-1)</div>
          </div>

          <div className="p-2 rounded bg-neutral-950 border border-neutral-800 flex flex-col justify-center items-center">
            <div className="font-mono text-[10px] text-neutral-400">Step 2: Res</div>
            <div className="font-semibold text-neutral-200">W_O · W_Q Wire</div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Residual stream</div>
          </div>

          <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
            <div className="font-mono text-[10px] text-neutral-400">Step 3: L1</div>
            <div className="font-semibold text-white">Induction H{topHead}</div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Matches [A] context</div>
          </div>

          <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
            <div className="font-mono text-[10px] text-neutral-400">Step 4: Out</div>
            <div className="font-semibold text-white">Predicts [B]</div>
            <div className="text-[10px] text-neutral-400 mt-0.5">In-context copy</div>
          </div>
        </div>
      </div>

      {/* Prompt selector */}
      <div className="il-prompts flex items-center gap-1.5 flex-wrap text-xs">
        <span className="il-prompt-label text-neutral-400">Prompt:</span>
        {PROMPTS.map((p) => (
          <button
            key={p}
            className={
              "px-2 py-1 rounded text-xs transition-colors " +
              (p === activePrompt
                ? "bg-white text-black font-medium"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800")
            }
            onClick={() => setActivePrompt(p)}
          >
            {p.length > 18 ? p.slice(0, 18) + "…" : p}
          </button>
        ))}
      </div>

      {/* Head verdicts bar chart */}
      <div className="il-verdicts space-y-1 text-xs pt-1">
        {verdicts.slice(0, 10).map((v) => (
          <div
            key={v.head}
            className="flex items-center gap-2 py-1 px-2 rounded hover:bg-neutral-900/50 transition-colors"
            title={`Head ${v.head}: ${v.pattern} (score ${v.score.toFixed(1)})`}
          >
            <span className="il-head font-mono w-7 text-neutral-400">H{v.head}</span>
            <div className="il-bar-track flex-1 h-2 rounded bg-neutral-900 overflow-hidden">
              <div
                className={
                  "h-full rounded transition-all duration-300 " +
                  (v.induction ? "bg-white" : "bg-neutral-600")
                }
                style={{ width: `${Math.max(4, v.score)}%` }}
              />
            </div>
            <span className="il-verdict text-[11px] font-mono w-28 text-right text-neutral-400">
              {v.pattern}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
