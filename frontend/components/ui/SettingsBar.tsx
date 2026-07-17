"use client";

import { useStore } from "@/lib/store";

export default function SettingsBar() {
  const quality = useStore((s) => s.quality);
  const toggleQuality = useStore((s) => s.toggleQuality);
  const muted = useStore((s) => s.muted);
  const toggleMuted = useStore((s) => s.toggleMuted);

  return (
    <div className="panel settings">
      <button
        className={"chip-btn" + (quality === "cinematic" ? " on" : "")}
        onClick={toggleQuality}
        title="Toggle bloom / cinematic post-processing"
      >
        {quality === "cinematic" ? "✦ Cinematic" : "⚡ Performance"}
      </button>
      <button
        className={"chip-btn" + (!muted ? " on" : "")}
        onClick={toggleMuted}
        title="Toggle sound cues"
      >
        {muted ? "🔇 Muted" : "🔊 Sound"}
      </button>
    </div>
  );
}
