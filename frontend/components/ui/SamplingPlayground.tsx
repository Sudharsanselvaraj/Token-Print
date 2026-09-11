"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";

export default function SamplingPlayground() {
  const genFrames = useStore((s) => s.genFrames);
  const [temperature, setTemperature] = useState(1.0);
  const [topP, setTopP] = useState(1.0);
  const [topK, setTopK] = useState(10);

  const [dist, setDist] = useState<{ text: string; orig: number; scaled: number }[]>([]);

  useEffect(() => {
    const frame = genFrames[genFrames.length - 1];
    if (!frame?.topk) return;
    const topk = frame.topk;
    const logits = topk.map((c) => Math.log(Math.max(c.prob, 1e-10)));
    const temp = Math.max(0.01, temperature);
    const scaled = logits.map((l) => Math.exp(l / temp));
    const sum = scaled.reduce((a, b) => a + b, 0);
    const probs = scaled.map((s) => s / sum);

    // Top-p filtering
    const indexed = probs.map((p, i) => ({ p, orig: topk[i].prob, text: topk[i].text, idx: i }));
    indexed.sort((a, b) => b.p - a.p);
    let cum = 0;
    const filtered: typeof indexed = [];
    for (const item of indexed) {
      if (cum >= topP) break;
      filtered.push(item);
      cum += item.p;
    }
    filtered.sort((a, b) => a.idx - b.idx);

    setDist(
      filtered.map((f) => ({
        text: f.text,
        orig: f.orig,
        scaled: f.p,
      }))
    );
  }, [genFrames, temperature, topP]);

  const lastFrame = genFrames[genFrames.length - 1];

  return (
    <div className="sampling-playground">
      <div className="sp-title">Sampling Playground</div>
      <div className="sp-desc">
        Adjust temperature and top-p to see how the distribution changes.
      </div>

      <div className="sp-controls">
        <div className="sp-control">
          <label>Temperature: {temperature.toFixed(2)}</label>
          <input
            type="range"
            min={0.1}
            max={2.0}
            step={0.05}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
          />
        </div>
        <div className="sp-control">
          <label>Top-p: {topP.toFixed(2)}</label>
          <input
            type="range"
            min={0.05}
            max={1.0}
            step={0.05}
            value={topP}
            onChange={(e) => setTopP(Number(e.target.value))}
          />
        </div>
        <div className="sp-control">
          <label>Top-K: {topK}</label>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
          />
        </div>
      </div>

      {dist.length > 0 ? (
        <div className="sp-dist">
          <div className="sp-dist-title">
            Distribution for last token{lastFrame ? `: "${lastFrame.chosen.text.replace(/\n/g, "⏎")}"` : ""}
          </div>
          {dist.slice(0, 15).map((d, i) => {
            const origW = Math.max(d.orig * 100, 0.5);
            const scaledW = Math.max(d.scaled * 100, 0.5);
            const isChosen = lastFrame && d.text === lastFrame.chosen.text;
            return (
              <div key={i} className={"sp-row" + (isChosen ? " chosen" : "")}>
                <span className="sp-token">{d.text.replace(/\n/g, "⏎") || "␣"}</span>
                <div className="sp-bars">
                  <div className="sp-bar-row">
                    <div className="sp-bar sp-bar-orig" style={{ width: `${origW}%` }} />
                    <span className="sp-pct">{(d.orig * 100).toFixed(1)}%</span>
                  </div>
                  <div className="sp-bar-row">
                    <div className="sp-bar sp-bar-scaled" style={{ width: `${scaledW}%` }} />
                    <span className="sp-pct">{(d.scaled * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="sp-empty">Run a generation first to see distribution effects.</div>
      )}
    </div>
  );
}
