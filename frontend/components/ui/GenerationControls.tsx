"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import GgufControls from "./GgufControls";

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
  const modelMode = useStore((s) => s.modelMode);
  const activeGguf = useStore((s) => s.activeGguf);

  const streaming = status === "streaming";
  const canGenerate = modelMode === "" || modelMode === "causal_lm";
  const isGGUF = !!activeGguf;

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
              decodingMode: isGGUF ? "greedy" : mode,
              gguf: isGGUF ? activeGguf : undefined,
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
              value={isGGUF ? "greedy" : mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              disabled={streaming || isGGUF}
            >
              <option value="greedy">Greedy</option>
              <option value="sliding_window" disabled={isGGUF}>
                Sliding window
              </option>
              <option value="speculative" disabled={isGGUF}>
                Speculative
              </option>
            </select>
            {isGGUF && (
              <span style={{ marginLeft: 4, opacity: 0.7 }}>
                (llama.cpp greedy only)
              </span>
            )}
          </label>
          {!isGGUF && mode === "sliding_window" && (
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
          {!isGGUF && mode === "speculative" && (
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
          {!isGGUF && mode !== "greedy" && (
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
          disabled={streaming || !canGenerate}
          style={{ width: "100%" }}
        >
          {streaming ? "Generating…" : !canGenerate ? "Generation unavailable" : "Generate"}
        </button>
      </form>
      {!canGenerate && (
        <div className="footer-note" style={{ marginTop: 6, color: "#ffd9a7" }}>
          The loaded {modelMode} model cannot generate text. Run an embedding
          forward pass in the top bar instead.
        </div>
      )}
      <div className="footer-note" style={{ marginTop: 8 }}>
        Streams a real decode over WebSocket — one message per token, each
        carrying the top-k probabilities.
        {!isGGUF && " Per-layer activation stats arrive from the running model's own forward hooks."}
        {!isGGUF && mode === "sliding_window" && " Sliding-window mode trims the KV cache to the last N positions."}
        {!isGGUF && mode === "speculative" && " Speculative mode drafts candidates in one batched verify pass and accepts the matching prefix."}
        {!isGGUF && mode !== "greedy" && " The needle is injected as a MEMORY line and recall is reported on the done frame."}
        {isGGUF && " Layer-level hooks are unavailable in llama.cpp — those rows stay off to avoid simulation."}
      </div>
      <GgufControls />
    </div>
  );
}