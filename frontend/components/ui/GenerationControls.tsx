"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useStore } from "@/lib/store";
import { Button, TOKENS } from "./primitives";

const DEFAULT_PROMPT = "Name one primary color. Answer in one word.";

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  padding: "5px 0",
} as const;

const sliderStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  margin: 0,
  height: 12,
  accentColor: "#e5e5e5",
  cursor: "pointer",
};

const monoVal = {
  fontFamily: TOKENS.fontMono,
  fontSize: "10.5px",
  color: TOKENS.textPrimary,
  minWidth: "34px",
  textAlign: "right" as const,
};

const labelStyle = {
  fontFamily: TOKENS.fontMono,
  fontSize: "9px",
  letterSpacing: "0.08em",
  color: TOKENS.textMuted,
  minWidth: "74px",
};

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ ...rowStyle, opacity: disabled ? 0.45 : 1 }}>
      <span style={labelStyle}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={sliderStyle}
      />
      <span style={monoVal}>{display}</span>
    </div>
  );
}

export default function GenerationControls() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [mode, setMode] = useState<"greedy" | "sampling">("greedy");
  const [advanced, setAdvanced] = useState<"sliding_window" | "speculative" | null>(null);
  const [temperature, setTemperature] = useState(0.8);
  const [topK, setTopK] = useState(10);
  const [topP, setTopP] = useState(0.95);
  const [maxTokens, setMaxTokens] = useState(40);
  const [windowSize, setWindowSize] = useState(512);
  const [draftGamma, setDraftGamma] = useState(4);
  const [needleEnabled, setNeedleEnabled] = useState(false);
  const [needle, setNeedle] = useState("");

  const start = useStore((s) => s.startGeneration);
  const stop = useStore((s) => s.stopGeneration);
  const status = useStore((s) => s.genStatus);
  const modelMode = useStore((s) => s.modelMode);
  const activeGguf = useStore((s) => s.activeGguf);

  const streaming = status === "streaming";
  const canGenerate = modelMode === "" || modelMode === "causal_lm";
  const sampling = mode === "sampling" && !advanced;
  const isGGUF = !!activeGguf;

  const decodingMode = advanced ?? (mode === "sampling" ? "sampling" : "greedy");

  const run = () => {
    const p = prompt.trim();
    if (!p || streaming) return;
    start(p, {
      decodingMode,
      gguf: isGGUF ? activeGguf : undefined,
      temperature,
      topK,
      topP,
      maxNewTokens: maxTokens,
      windowSize,
      draftGamma,
      needle: needleEnabled && needle.trim() ? needle.trim() : undefined,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run();
        }}
        placeholder="Prompt for the model to generate from…"
        spellCheck={false}
        rows={2}
        style={{
          width: "100%",
          boxSizing: "border-box",
          resize: "vertical",
          background: TOKENS.surfaceFlat,
          border: `1px solid ${TOKENS.border}`,
          borderRadius: TOKENS.radiusSm,
          color: TOKENS.textPrimary,
          fontFamily: TOKENS.fontMono,
          fontSize: "10.5px",
          lineHeight: 1.5,
          padding: "6px 7px",
        }}
      />

      {/* MODE — Greedy / Sampling (the two headline decode strategies). */}
      <div style={{ ...rowStyle, justifyContent: "flex-start", gap: "6px" }}>
        <span style={labelStyle}>MODE</span>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["greedy", "sampling"] as const).map((m) => (
            <Button
              key={m}
              variant={mode === m && !advanced ? "primary" : "ghost"}
              disabled={streaming}
              onClick={() => {
                setAdvanced(null);
                setMode(m);
              }}
              style={{ height: "22px", padding: "0 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              {m}
            </Button>
          ))}
        </div>
      </div>

      {/* Sampling parameters — genuinely shape the draw, backend-real. */}
      <SliderRow
        label="TEMPERATURE"
        value={temperature}
        min={0.1}
        max={2}
        step={0.05}
        display={temperature.toFixed(2)}
        disabled={!sampling}
        onChange={setTemperature}
      />
      <SliderRow
        label="TOP-K"
        value={topK}
        min={1}
        max={20}
        step={1}
        display={String(topK)}
        onChange={setTopK}
      />
      <SliderRow
        label="TOP-P"
        value={topP}
        min={0.5}
        max={1}
        step={0.01}
        display={topP.toFixed(2)}
        disabled={!sampling}
        onChange={setTopP}
      />

      {/* MAX TOKENS */}
      <div style={rowStyle}>
        <span style={labelStyle}>MAX TOKENS</span>
        <input
          type="number"
          min={1}
          max={64}
          value={maxTokens}
          disabled={streaming}
          onChange={(e) => setMaxTokens(Math.max(1, Math.min(64, Number(e.target.value) || 40)))}
          style={{
            ...monoVal,
            background: TOKENS.surfaceFlat,
            border: `1px solid ${TOKENS.border}`,
            borderRadius: TOKENS.radiusSm,
            color: TOKENS.textPrimary,
            padding: "2px 4px",
          }}
        />
      </div>

      {/* PRIMARY ACTION — GENERATE → / STOP ■ */}
      <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
        <Button
          variant="primary"
          disabled={streaming || !canGenerate}
          onClick={run}
          style={{ flex: 1, height: "30px", fontSize: "11px", letterSpacing: "0.08em" }}
        >
          {streaming ? "Generating…" : !canGenerate ? "Generation unavailable" : "GENERATE →"}
        </Button>
        {streaming && (
          <Button
            variant="primary"
            onClick={stop}
            title="Stop streaming generation"
            style={{ height: "30px", fontSize: "11px", background: "#2a1212", borderColor: "#5a2020", color: "#ffd9d9" }}
          >
            ■ STOP
          </Button>
        )}
      </div>

      {!canGenerate && (
        <div style={{ fontFamily: TOKENS.fontMono, fontSize: "9.5px", color: "#ffd9a7", marginTop: 4 }}>
          The loaded {modelMode} model cannot generate text.
        </div>
      )}

      {/* ADVANCED DECODES — preserved, real backend modes (PyTorch only). */}
      <details style={{ marginTop: "2px", color: TOKENS.textMuted }}>
        <summary
          style={{
            fontFamily: TOKENS.fontMono,
            fontSize: "9px",
            letterSpacing: "0.08em",
            cursor: "pointer",
          }}
        >
          {advanced ? `ADVANCED · ${advanced.toUpperCase()}` : "ADVANCED DECODES"}
        </summary>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "4px" }}>
          {(["sliding_window", "speculative"] as const).map((a) => (
            <label
              key={a}
              style={{
                display: "flex",
                gap: "6px",
                alignItems: "center",
                fontFamily: TOKENS.fontMono,
                fontSize: "10px",
                color: TOKENS.textSecondary,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="advanced-mode"
                checked={advanced === a}
                disabled={streaming}
                onChange={() => setAdvanced(a)}
              />
              {a === "sliding_window" ? "Sliding-window" : "Speculative"}
            </label>
          ))}
          {advanced === "sliding_window" && (
            <div style={rowStyle}>
              <span style={labelStyle}>WINDOW</span>
              <input
                type="number"
                min={16}
                max={4096}
                step={16}
                value={windowSize}
                disabled={streaming}
                onChange={(e) => setWindowSize(Number(e.target.value) || 512)}
                style={{
                  ...monoVal,
                  background: TOKENS.surfaceFlat,
                  border: `1px solid ${TOKENS.border}`,
                  borderRadius: TOKENS.radiusSm,
                  color: TOKENS.textPrimary,
                  padding: "2px 4px",
                }}
              />
            </div>
          )}
          {advanced === "speculative" && (
            <div style={rowStyle}>
              <span style={labelStyle}>DRAFTS</span>
              <input
                type="number"
                min={1}
                max={8}
                value={draftGamma}
                disabled={streaming}
                onChange={(e) => setDraftGamma(Number(e.target.value) || 4)}
                style={{
                  ...monoVal,
                  background: TOKENS.surfaceFlat,
                  border: `1px solid ${TOKENS.border}`,
                  borderRadius: TOKENS.radiusSm,
                  color: TOKENS.textPrimary,
                  padding: "2px 4px",
                }}
              />
            </div>
          )}

          {/* Needle-in-haystack: long-context recall probe independent of decode mode. */}
          <label
            style={{
              display: "flex",
              gap: "6px",
              alignItems: "center",
              fontFamily: TOKENS.fontMono,
              fontSize: "10px",
              color: TOKENS.textSecondary,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={needleEnabled}
              disabled={streaming}
              onChange={(e) => setNeedleEnabled(e.target.checked)}
            />
            Needle (long-context recall probe)
          </label>
          {needleEnabled && (
            <input
              type="text"
              value={needle}
              disabled={streaming}
              onChange={(e) => setNeedle(e.target.value)}
              placeholder="Memory fact to test recall of…"
              spellCheck={false}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: TOKENS.surfaceFlat,
                border: `1px solid ${TOKENS.border}`,
                borderRadius: TOKENS.radiusSm,
                color: TOKENS.textPrimary,
                fontFamily: TOKENS.fontMono,
                fontSize: "10px",
                padding: "4px 6px",
              }}
            />
          )}
          <div style={{ fontFamily: TOKENS.fontMono, fontSize: "8.5px", lineHeight: 1.4 }}>
              Sliding-window trims the KV cache to the last N positions each step.
              Speculative drafts candidates in one batched verify pass and accepts
              the matching prefix. The needle prefaces a [MEMORY] fact the model
              must recall across context. PyTorch engine only.
            </div>
        </div>
      </details>

      <div
        style={{
          fontFamily: TOKENS.fontMono,
          fontSize: "8.5px",
          lineHeight: 1.4,
          color: TOKENS.textMuted,
          marginTop: "6px",
        }}
      >
        Streams a real decode over WebSocket — one message per token with real
        top-k probabilities.
        {sampling && " Sampling draws from the true temperature/top-k/top-p distribution."}
        {!sampling && !advanced && " Greedy picks the argmax token each step."}
        {isGGUF && !sampling && " llama.cpp argmax (quantized weights)."}
        {sampling && isGGUF && " llama.cpp sampler on quantized weights."}
      </div>
    </div>
  );
}