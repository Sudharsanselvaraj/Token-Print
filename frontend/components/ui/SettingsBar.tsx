"use client";

import { useStore } from "@/lib/store";

export default function SettingsBar() {
  const quality = useStore((s) => s.quality);
  const toggleQuality = useStore((s) => s.toggleQuality);
  const muted = useStore((s) => s.muted);
  const toggleMuted = useStore((s) => s.toggleMuted);
  const sonificationEnabled = useStore((s) => s.sonificationEnabled);
  const toggleSonification = useStore((s) => s.toggleSonification);
  const classroomMode = useStore((s) => s.classroomMode);
  const toggleClassroomMode = useStore((s) => s.toggleClassroomMode);

  return (
    <div className="panel settings">
      <button
        className={"chip-btn" + (quality === "cinematic" ? " on" : "")}
        onClick={toggleQuality}
        title="Toggle bloom / cinematic post-processing"
      >
        {quality === "cinematic" ? "Cinematic" : "Performance"}
      </button>
      <button
        className={"chip-btn" + (sonificationEnabled ? " on" : "")}
        onClick={toggleSonification}
        title="Toggle activation sonification"
      >
        {sonificationEnabled ? "Sonify ON" : "Sonify"}
      </button>
      <button
        className={"chip-btn" + (classroomMode ? " on" : "")}
        onClick={toggleClassroomMode}
        title="Toggle classroom presentation mode"
      >
        {classroomMode ? "Classroom ON" : "Classroom"}
      </button>
      <button
        className={"chip-btn" + (!muted ? " on" : "")}
        onClick={toggleMuted}
        title="Toggle sound cues"
      >
        {muted ? "Muted" : "Sound"}
      </button>
    </div>
  );
}
