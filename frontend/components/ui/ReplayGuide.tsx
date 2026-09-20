"use client";
import { useEffect, useState } from "react";
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
  const router = useRouter();
  useEffect(() => {
    setStep(0);
    setDismissed(false);
  }, [meta]);
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
    <aside className="replay-guide" aria-label="Recorded demo guide">
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
          {error} <button onClick={onRetry}>Retry demo</button>
        </p>
      ) : guided && !dismissed ? (
        <>
          <strong>{steps[step].title}</strong>
          <p>{steps[step].text}</p>
          <div>
            <button onClick={advance}>
              {step === 2 ? "Finish tour" : "Next step"}
            </button>
            <button onClick={() => setDismissed(true)}>Skip tour</button>
            <span>{step + 1} / 3</span>
          </div>
        </>
      ) : (
        <span>Captured model data · no live inference</span>
      )}
    </aside>
  );
}
