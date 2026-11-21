"use client";

import { useStore } from "@/lib/store";

export default function SettingsBar() {
  const quality = useStore((s) => s.quality);
  const toggleQuality = useStore((s) => s.toggleQuality);
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
        className={"chip-btn" + (classroomMode ? " on" : "")}
        onClick={toggleClassroomMode}
        title="Toggle classroom presentation mode"
      >
        {classroomMode ? "Classroom ON" : "Classroom"}
      </button>
    </div>
  );
}
