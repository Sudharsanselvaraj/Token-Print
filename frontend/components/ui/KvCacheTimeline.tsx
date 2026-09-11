"use client";

import { useGenerationFrames } from "@/lib/store";
import { useMemo } from "react";

export default function KvCacheTimeline() {
  const genFrames = useGenerationFrames();

  const cacheData = useMemo(() => {
    if (!genFrames?.length) return null;
    const hasCache = genFrames.some((f) => f.cache_len !== undefined);
    if (!hasCache) return null;
    const steps = genFrames.map((f, i) => ({
      step: i,
      cacheLen: f.cache_len ?? 0,
      newTokens: f.n_positions ?? 1,
      phase: f.phase ?? "decode",
    }));
    const maxCache = Math.max(...steps.map((s) => s.cacheLen), 1);
    return { steps, maxCache };
  }, [genFrames]);

  if (!cacheData) return null;
  const { steps, maxCache } = cacheData;

  return (
    <div className="kvcache-panel">
      <div className="kvc-title">KV-Cache Growth</div>
      <div className="kvc-steps">
        {steps.map((s) => (
          <div key={s.step} className="kvc-step">
            <div className="kvc-step-label">
              {s.step === 0 ? "prefill" : s.step}
            </div>
            <div className="kvc-bar-track">
              <div
                className={`kvc-bar${s.phase === "prefill" ? " prefill" : ""}`}
                style={{ width: `${(s.cacheLen / maxCache) * 100}%` }}
              />
              <div
                className="kvc-bar-new"
                style={{
                  width: `${(s.newTokens / maxCache) * 100}%`,
                  marginLeft: `${((s.cacheLen - s.newTokens) / maxCache) * 100}%`,
                }}
              />
            </div>
            <span className="kvc-count">{s.cacheLen}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
