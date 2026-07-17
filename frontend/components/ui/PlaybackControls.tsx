"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function PlaybackControls() {
  const frames = useStore((s) => s.genFrames);
  const playIndex = useStore((s) => s.playIndex);
  const isPlaying = useStore((s) => s.isPlaying);
  const status = useStore((s) => s.genStatus);
  const stepPlay = useStore((s) => s.stepPlay);
  const togglePlay = useStore((s) => s.togglePlay);
  const replay = useStore((s) => s.replay);
  const setPlayIndex = useStore((s) => s.setPlayIndex);

  // Playback ticker: advance one recorded frame at a time while playing.
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      const s = useStore.getState();
      if (s.playIndex >= s.genFrames.length - 1) {
        useStore.setState({ isPlaying: false });
      } else {
        useStore.setState({ playIndex: s.playIndex + 1 });
      }
    }, 500);
    return () => clearInterval(id);
  }, [isPlaying]);

  const total = frames.length;
  const cur = playIndex >= 0 ? frames[playIndex] : null;
  const disabled = total === 0;

  return (
    <div className="panel selector" style={{ minWidth: 340 }}>
      <div className="status" style={{ marginBottom: 6 }}>
        {status === "streaming"
          ? `streaming… ${total} tokens`
          : status === "error"
            ? "generation error"
            : total > 0
              ? `${total} recorded tokens · step ${Math.max(0, playIndex) + 1}/${total}`
              : "no generation yet"}
      </div>

      <div className="playback-row">
        <button className="pb-btn" disabled={disabled} onClick={() => stepPlay(-1)} title="Step back">
          ⏮
        </button>
        <button className="pb-btn" disabled={disabled} onClick={togglePlay} title="Play / pause">
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button className="pb-btn" disabled={disabled} onClick={() => stepPlay(1)} title="Step forward">
          ⏭
        </button>
        <button className="pb-btn" disabled={disabled} onClick={replay} title="Replay from start">
          ↻
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          step={1}
          value={Math.max(0, playIndex)}
          disabled={disabled}
          onChange={(e) => setPlayIndex(Number(e.target.value))}
          style={{ flex: 1 }}
        />
      </div>

      {cur && (
        <div className="footer-note" style={{ marginTop: 8 }}>
          chosen token: <strong>“{cur.chosen.text}”</strong> · p=
          {(cur.topk[0]?.prob ?? 0).toFixed(3)} · replaying recorded real data,
          not a re-simulation.
        </div>
      )}
    </div>
  );
}
