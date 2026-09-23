"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function ReplayGuide({
  guided,
  loading,
  error,
  onRetry,
}: {
  guided: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const source = useStore((s) => s.traceSource);
  const meta = useStore((s) => s.genMeta);
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    setStep(0);
    setDismissed(false);
  }, [meta]);

  // Keep keyboard focus visible and on the active action when steps advance or route changes
  useEffect(() => {
    if (guided && !dismissed && !loading && !error) {
      primaryButtonRef.current?.focus();
    }
  }, [step, guided, dismissed, loading, error]);

  // Escape key dismisses the guide overlay without stopping or resetting replay playback
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && guided && !dismissed) {
        e.stopPropagation();
        setDismissed(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [guided, dismissed]);

  if (!loading && !error && source !== "file") return null;

  const steps = [
    {
      title: "1. Follow a token",
      text: "This is a recorded forward pass. Pause or use Token → to see how predictions change.",
    },
    {
      title: "2. Inspect a layer",
      text: "Focus on the active layer. The inspector shows the recorded probabilities and operation details.",
    },
    {
      title: "3. Explore the evidence",
      text: "Open attention analysis to inspect captured heads. Return to Generation to continue replaying.",
    },
  ];

  function advance() {
    if (step === 0) {
      useStore.setState({ opPlaying: false, isPlaying: false });
      useStore.getState().setNavMode("LAYER_FOCUS");
    }
    if (step === 1) {
      useStore.getState().setDebuggerTool("attention_analysis");
      router.push("/app?mode=debugger&tour=1");
    }
    if (step === 2) setDismissed(true);
    else setStep(step + 1);
  }

  return (
    <aside className="replay-guide" aria-label="Recorded demo guide" role="region">
      <div className="replay-guide-heading">
        <strong className="replay-badge">RECORDED REPLAY</strong>
        <span>{meta?.model}</span>
      </div>
      {loading ? (
        <p role="status">
          Loading the recorded example… No model download needed.
        </p>
      ) : error ? (
        <p role="alert">
          {error}{" "}
          <button ref={primaryButtonRef} onClick={onRetry} type="button">
            Retry demo
          </button>
        </p>
      ) : guided && !dismissed ? (
        <div aria-live="polite">
          <strong>{steps[step].title}</strong>
          <p>{steps[step].text}</p>
          <div>
            <button
              ref={primaryButtonRef}
              onClick={advance}
              type="button"
              aria-label={step === 2 ? "Finish tour" : `Next step: step ${step + 2} of 3`}
            >
              {step === 2 ? "Finish tour" : "Next step"}
            </button>
            <button
              onClick={() => setDismissed(true)}
              type="button"
              aria-label="Skip tour (Press Escape to dismiss)"
            >
              Skip tour
            </button>
            <span aria-label={`Step ${step + 1} of 3`}>{step + 1} / 3</span>
          </div>
        </div>
      ) : (
        <span>Captured model data · no live inference</span>
      )}
    </aside>
  );
}

