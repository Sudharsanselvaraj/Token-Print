"use client";

import { useState, useCallback } from "react";
import { useStore } from "@/lib/store";

interface GameStep {
  step: number;
  prompt: string;
  candidates: { id: number; text: string; prob: number }[];
  correctId: number;
  correctText: string;
  userChoice: number | null;
  score: number;
  revealed: boolean;
}

interface Props {
  docked?: boolean;
}

export default function PredictionGame({ docked }: Props) {
  const genFrames = useStore((s) => s.genFrames);
  const genText = useStore((s) => s.genText);
  const genStatus = useStore((s) => s.genStatus);
  const genMeta = useStore((s) => s.genMeta);

  const [steps, setSteps] = useState<GameStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const startGame = useCallback(() => {
    if (genFrames.length === 0) return;
    const gameSteps: GameStep[] = genFrames.map((f, i) => ({
      step: f.step,
      prompt: i === 0
        ? (genMeta?.prompt_tokens ?? []).map(decodeTokenPiece).join("")
        : genFrames.slice(0, i).map((ff) => ff.chosen.text).join(""),
      candidates: f.topk.slice(0, 10).map((c) => ({
        id: c.id,
        text: c.text,
        prob: c.prob,
      })),
      correctId: f.chosen.id,
      correctText: f.chosen.text,
      userChoice: null,
      score: 0,
      revealed: false,
    }));
    setSteps(gameSteps);
    setCurrentStep(0);
    setGameStarted(true);
    setGameOver(false);
  }, [genFrames, genMeta]);

  const guess = useCallback(
    (tokenId: number) => {
      setSteps((prev) => {
        const next = [...prev];
        const s = next[currentStep];
        if (!s || s.revealed) return prev;
        const isCorrect = tokenId === s.correctId;
        const rank = s.candidates.findIndex((c) => c.id === tokenId);
        const score = isCorrect ? 100 : rank >= 0 ? Math.max(0, 100 - rank * 15) : 0;
        next[currentStep] = { ...s, userChoice: tokenId, score, revealed: true };
        return next;
      });
    },
    [currentStep],
  );

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((p) => p + 1);
    } else {
      setGameOver(true);
    }
  }, [currentStep, steps.length]);

  const wrap = docked ? "game-docked" : "game-panel";

  if (genStatus === "idle" || genFrames.length === 0) {
    return (
      <div className={wrap}>
        <div className="game-title">Prediction Game</div>
        <div className="game-empty">
          Run a generation first, then test your prediction skills.
        </div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className={wrap}>
        <div className="game-title">Prediction Game</div>
        <div className="game-desc">
          For each generated token, guess what the model picked from its top-10
          candidates. Score points for correct and close guesses.
        </div>
        <button className="game-btn-start" onClick={startGame}>
          Start Game ({genFrames.length} rounds · {genFrames.length * 100} pts max)
        </button>
      </div>
    );
  }

  if (gameOver) {
    const total = steps.reduce((sum, s) => sum + s.score, 0);
    const maxPossible = steps.length * 100;
    return (
      <div className={wrap}>
        <div className="game-title">Game Over</div>
        <div className="game-score-big">
          {total} / {maxPossible}
        </div>
        <div className="game-score-pct">
          {((total / maxPossible) * 100).toFixed(0)}% accuracy
        </div>
        <button className="game-btn-start" onClick={startGame}>
          Play Again
        </button>
      </div>
    );
  }

  const s = steps[currentStep];
  if (!s) return null;

  return (
    <div className={wrap}>
      <div className="game-title">
        Step {currentStep + 1} / {steps.length}
      </div>
      <div className="game-prompt">
        <span className="game-prompt-label">Context:</span>
        <span className="game-prompt-text">
          {dispToken(s.prompt.length > 120 ? s.prompt.slice(-120) : s.prompt)}
        </span>
      </div>
      <div className="game-question">Which token did the model pick next?</div>
      <div className="game-choices">
        {s.candidates.map((c) => {
          const isCorrect = s.revealed && c.id === s.correctId;
          const isChoice = s.revealed && c.id === s.userChoice;
          let cls = "game-choice";
          if (s.revealed && isCorrect) cls += " correct";
          if (s.revealed && isChoice && !isCorrect) cls += " wrong";
          return (
            <button
              key={c.id}
              className={cls}
              onClick={() => guess(c.id)}
              disabled={s.revealed}
              style={{
                opacity: s.revealed && !isCorrect && !isChoice ? 0.35 : 1,
              }}
            >
              <span className="game-choice-text">
                {dispToken(c.text)}
              </span>
              <span className="game-choice-prob">
                {(c.prob * 100).toFixed(1)}%
              </span>
            </button>
          );
        })}
      </div>
      {s.revealed && (
        <div className="game-result">
          <div className="game-result-text">
            {s.userChoice === s.correctId
                ? "✓ Correct!"
                : `✗ The model picked "${dispToken(s.correctText)}"`}
          </div>
          <div className="game-result-score">+{s.score} pts</div>
          <button className="game-btn-next" onClick={next}>
            {currentStep < steps.length - 1 ? "Next →" : "See Results →"}
          </button>
        </div>
      )}
    </div>
  );
}

function decodeTokenPiece(piece: string): string {
  try {
    return JSON.parse(`"${piece}"`);
  } catch {
    return piece;
  }
}

function dispToken(t: string): string {
  return t.replace(/\n/g, "⏎").replace(/\r/g, "␍").replace(/\t/g, "→") || "␣";
}
