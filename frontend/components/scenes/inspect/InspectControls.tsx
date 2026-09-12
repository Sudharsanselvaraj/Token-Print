"use client";

import React, { useEffect } from "react";
import { useStore } from "@/lib/store";

/**
 * InspectControls
 *
 * Floating control bar shown in the main 3D scene when inspect mode is active.
 * Inline styles only — no Tailwind.
 */
export function InspectControls() {
  const inspectingComponentId   = useStore((s) => s.inspectingComponentId);
  const exitInspectMode         = useStore((s) => s.exitInspectMode);
  const inspectAutoRotate       = useStore((s) => s.inspectAutoRotate);
  const toggleInspectAutoRotate = useStore((s) => s.toggleInspectAutoRotate);
  const navigateInspectComponent = useStore((s) => s.navigateInspectComponent);
  const setUserOrbiting         = useStore((s) => s.setUserOrbiting);

  useEffect(() => {
    if (!inspectingComponentId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape")      { e.preventDefault(); exitInspectMode(); }
      else if (e.key === " ")      { e.preventDefault(); toggleInspectAutoRotate(); }
      else if (e.key.toLowerCase() === "r") { e.preventDefault(); setUserOrbiting(false); }
      else if (e.key === "ArrowLeft")  { e.preventDefault(); navigateInspectComponent(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); navigateInspectComponent(1); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inspectingComponentId, exitInspectMode, toggleInspectAutoRotate, navigateInspectComponent, setUserOrbiting]);

  if (!inspectingComponentId) return null;

  const barStyle: React.CSSProperties = {
    position: "absolute",
    top: "64px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 40,
    background: "rgba(0,0,0,0.85)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    padding: "6px 10px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    color: "#f5f5f5",
    backdropFilter: "blur(6px)",
  };

  const btn: React.CSSProperties = {
    padding: "3px 10px",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "4px",
    color: "#9ca3af",
    fontFamily: "inherit",
    fontSize: "10px",
    cursor: "pointer",
    transition: "color 0.15s, border-color 0.15s",
  };
  const btnActive: React.CSSProperties = { ...btn, color: "#f5f5f5", borderColor: "rgba(255,255,255,0.26)" };
  const divider: React.CSSProperties = { width: "1px", height: "14px", background: "rgba(255,255,255,0.1)" };

  return (
    <div style={barStyle}>
      <button style={inspectAutoRotate ? btnActive : btn} onClick={toggleInspectAutoRotate} title="Toggle rotation (Space)">
        {inspectAutoRotate ? "⏸ Pause" : "▶ Rotate"}
      </button>
      <button style={btn} onClick={() => setUserOrbiting(false)} title="Reset camera (R)">
        ↺ Reset
      </button>
      <div style={divider} />
      <button style={btn} onClick={() => navigateInspectComponent(-1)} title="Previous (←)">‹ Prev</button>
      <button style={btn} onClick={() => navigateInspectComponent(1)} title="Next (→)">Next ›</button>
      <div style={divider} />
      <button
        style={{ ...btn, color: "#6b7280" }}
        onClick={exitInspectMode}
        title="Close (Esc)"
      >
        ✕
      </button>
    </div>
  );
}
