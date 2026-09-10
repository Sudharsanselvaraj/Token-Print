"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

const DEFAULT_PROMPT = "Name one primary color. Answer in one word.";
const DEFAULT_NEEDLE = "The secret color is mauve.";

export default function GenerationControls() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [mode, setMode] = useState<"greedy" | "sliding_window" | "speculative">("greedy");
  const [windowSize, setWindowSize] = useState(512);
  const [draftGamma, setDraftGamma] = useState(4);
  const [needle, setNeedle] = useState(DEFAULT_NEEDLE);
  const start = useStore((s) => s.startGeneration);
  const status = useStore((s) => s.genStatus);

  const streaming = status === "streaming";

  return (
    <div className="panel selector">
      <form
        className="sentence-form"
        style={{ marginTop: 0, flexDirection: "column", alignItems: "stretch" }}
        onSubmit={(e) => {
          e.preventDefault();
          const p = prompt.trim();
          if (p && !streaming)
            start(p, {
              decodingMode: mode,
              windowSize,
              draftGamma,
              needle: mode === "greedy" ? undefined : needle.trim() || undefined,
            });
        }}
      >
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Prompt for the model to generate from…"
          spellCheck={false}
          style={{ minWidth: 0 }}
        />
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <label className="footer-note" style={{ display: "flex", gap: 4, alignItems: "center" }}>
            Mode:
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              disabled={streaming}
            >
              <option value="greedy">Greedy</option>
              <option value="sliding_window">Sliding window</option>
              <option value="speculative">Speculative</option>
            </select>
          </label>
          {mode === "sliding_window" && (
            <label className="footer-note" style={{ display: "flex", gap: 4, alignItems: "center" }}>
              Window:
              <input
                type="number"
                min={16}
                max={4096}
                step={16}
                value={windowSize}
                onChange={(e) => setWindowSize(Number(e.target.value) || 512)}
                disabled={streaming}
                style={{ width: 72 }}
              />
            </label>
          )}
          {mode === "speculative" && (
            <label className="footer-note" style={{ display: "flex", gap: 4, alignItems: "center" }}>
              Drafts:
              <input
                type="number"
                min={1}
                max={8}
                value={draftGamma}
                onChange={(e) => setDraftGamma(Number(e.target.value) || 4)}
                disabled={streaming}
                style={{ width: 56 }}
              />
            </label>
          )}
          {mode !== "greedy" && (
            <label className="footer-note" style={{ display: "flex", gap: 4, alignItems: "center" }}>
              Needle:
              <input
                value={needle}
                onChange={(e) => setNeedle(e.target.value)}
                disabled={streaming}
                placeholder="Needle sentence for the long-context test"
                style={{ minWidth: 180 }}
              />
            </label>
          )}
        </div>
        <button
          className="primary"
          type="submit"
          disabled={streaming}
          style={{ width: "100%" }}
        >
          {streaming ? "Generating…" : "Generate"}
        </button>
      </form>
      <div className="footer-note" style={{ marginTop: 8 }}>
        Streams a real decode over WebSocket — one message per token, each
        carrying the top-k probabilities and per-layer activation stats.
        {mode === "sliding_window" && " Sliding-window mode trims the KV cache to the last N positions."}
        {mode === "speculative" && " Speculative mode drafts candidates in one batched verify pass and accepts the matching prefix."}
        {mode !== "greedy" && " The needle is injected as a MEMORY line and recall is reported on the done frame."}
      </div>
    </div>
  );
}