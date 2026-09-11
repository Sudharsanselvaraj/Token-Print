"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

export default function ReplayBranch() {
  const frames = useStore((s) => s.genFrames);
  const meta = useStore((s) => s.genMeta);
  const playIndex = useStore((s) => s.playIndex);
  const [forkPoint, setForkPoint] = useState<number | null>(null);

  if (!frames.length || !meta) return null;

  const forkAt = (idx: number) => {
    setForkPoint(idx);
  };

  const clearFork = () => setForkPoint(null);

  return (
    <div className="replay-branch">
      <div className="rb-title">
        Replay Branching
        {forkPoint != null && (
          <button className="rb-clear" onClick={clearFork}>Clear fork</button>
        )}
      </div>
      <div className="rb-hint">
        Click a token to fork the trace at that point.
      </div>
      <div className="rb-tokens">
        {frames.map((f, i) => {
          const isFork = i === forkPoint;
          const isActive = i === playIndex;
          return (
            <button
              key={i}
              className={
                "rb-token" +
                (isActive ? " active" : "") +
                (isFork ? " fork" : "")
              }
              onClick={() => forkAt(i)}
              title={`Token ${i}: "${f.chosen.text}"`}
            >
              {f.chosen.text.replace(/\n/g, "\u23CE") || "\u2423"}
            </button>
          );
        })}
      </div>
      {forkPoint != null && (
        <div className="rb-diff">
          <div className="rb-diff-title">Fork at token {forkPoint}</div>
          {frames.slice(forkPoint, forkPoint + 3).map((f, j) => {
            const origIdx = forkPoint + j;
            if (origIdx >= frames.length) return null;
            return (
              <div key={j} className="rb-diff-row">
                <span className="rb-diff-step">+{j}</span>
                <span className="rb-diff-text">{f.chosen.text.replace(/\n/g, "\u23CE") || "\u2423"}</span>
                <span className="rb-diff-prob">{(f.chosen.logprob !== undefined ? Math.exp(f.chosen.logprob) * 100 : 0).toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
