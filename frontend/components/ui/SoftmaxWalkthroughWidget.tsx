"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

function dispToken(t: string): string {
  const s = t.replace(/\n/g, "⏎").replace(/\r/g, "␍").replace(/\t/g, "→");
  return s.trim() || "␣";
}

export default function SoftmaxWalkthroughWidget() {
  const data = useStore((s) => s.data);
  const [userChoice, setUserChoice] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  if (!data) return null;

  const lastLayer = data.logit_lens ? data.logit_lens.length - 1 : -1;
  const lastPos = (data.tokens?.length ?? 1) - 1;
  const candidates = lastLayer >= 0 ? data.logit_lens[lastLayer]?.[lastPos] ?? [] : [];

  if (candidates.length === 0) {
    return (
      <div
        style={{
          marginTop: 12,
          padding: "10px 12px",
          background: "#111214",
          borderRadius: 8,
          border: "1px solid #2a2a2a",
          fontSize: 12,
          color: "#a3a3a3",
        }}
      >
        Logit lens prediction data unavailable for this model.
      </div>
    );
  }

  const top1 = candidates[0];

  const handleGuess = (id: number) => {
    setUserChoice(id);
    setRevealed(true);
  };

  const handleReset = () => {
    setUserChoice(null);
    setRevealed(false);
  };

  return (
    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Real Argmax Banner */}
      <div
        style={{
          padding: "10px 12px",
          background:
            "linear-gradient(135deg, rgba(52, 211, 153, 0.12) 0%, rgba(16, 185, 129, 0.04) 100%)",
          border: "1px solid rgba(52, 211, 153, 0.3)",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#34d399",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          Model's Greedy Prediction
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#ffffff",
              fontFamily: "var(--font-geist-mono, monospace)",
            }}
          >
            “{dispToken(top1.text)}”
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#34d399" }}>
            {(top1.prob * 100).toFixed(1)}% prob
          </span>
        </div>
        <div style={{ fontSize: 10, color: "#94a3b8" }}>
          Context: “{data.sentence}” · Token ID: #{top1.token_id}
        </div>
      </div>

      {/* Interactive Prediction Game Card */}
      <div className="game-panel" style={{ margin: 0, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="game-title" style={{ margin: 0 }}>
            Prediction Challenge
          </div>
          {revealed && (
            <button
              className="chip-btn"
              onClick={handleReset}
              style={{ fontSize: 10, padding: "2px 8px" }}
            >
              Reset
            </button>
          )}
        </div>

        <div className="game-question" style={{ marginTop: 6, marginBottom: 8, fontSize: 11 }}>
          Which token will the model predict next after “{data.sentence}”?
        </div>

        <div className="game-choices" style={{ gap: 5 }}>
          {candidates.slice(0, 5).map((c) => {
            const isTop1 = c.token_id === top1.token_id;
            const isUserChoice = c.token_id === userChoice;
            let cls = "game-choice";
            if (revealed && isTop1) cls += " correct";
            if (revealed && isUserChoice && !isTop1) cls += " wrong";

            return (
              <button
                key={c.token_id}
                className={cls}
                onClick={() => handleGuess(c.token_id)}
                disabled={revealed}
                style={{
                  padding: "6px 10px",
                  fontSize: 11,
                  opacity: revealed && !isTop1 && !isUserChoice ? 0.4 : 1,
                }}
              >
                <span
                  className="game-choice-text"
                  style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
                >
                  “{dispToken(c.text)}”
                </span>
                <span className="game-choice-prob">
                  {revealed ? `${(c.prob * 100).toFixed(1)}%` : "??%"}
                </span>
              </button>
            );
          })}
        </div>

        {!revealed ? (
          <button
            className="game-btn-start"
            onClick={() => setRevealed(true)}
            style={{ marginTop: 8, width: "100%", padding: "6px", fontSize: 11 }}
          >
            Reveal Full Distribution
          </button>
        ) : (
          <div className="game-result" style={{ marginTop: 8, padding: 8 }}>
            <div className="game-result-text" style={{ fontSize: 11 }}>
              {userChoice === top1.token_id
                ? "✓ Correct! You matched the model's top prediction."
                : userChoice != null
                ? `✗ You picked “${dispToken(
                    candidates.find((c) => c.token_id === userChoice)?.text ?? "",
                  )}”. The top pick was “${dispToken(top1.text)}”.`
                : `Revealed: Top prediction is “${dispToken(top1.text)}”.`}
            </div>
          </div>
        )}
      </div>

      {/* Full Top-K Probability Skyline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#a3a3a3",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Top Softmax Probabilities (Skyline)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {candidates.slice(0, 5).map((c, i) => {
            const isTop1 = i === 0;
            const pct = Math.min(100, Math.max(4, c.prob * 100));

            return (
              <div
                key={c.token_id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  padding: "4px 8px",
                  background: isTop1 ? "rgba(52, 211, 153, 0.06)" : "#111214",
                  borderRadius: 6,
                  border: isTop1
                    ? "1px solid rgba(52, 211, 153, 0.25)"
                    : "1px solid #222326",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span
                    style={{
                      fontWeight: isTop1 ? 700 : 400,
                      color: isTop1 ? "#ffffff" : "#cbd5e1",
                      fontFamily: "var(--font-geist-mono, monospace)",
                    }}
                  >
                    #{i + 1} “{dispToken(c.text)}”
                  </span>
                  <span style={{ fontWeight: 600, color: isTop1 ? "#34d399" : "#94a3b8" }}>
                    {(c.prob * 100).toFixed(1)}%
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: "#1a1b1e",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: isTop1
                        ? "linear-gradient(90deg, #10b981 0%, #34d399 100%)"
                        : "linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
