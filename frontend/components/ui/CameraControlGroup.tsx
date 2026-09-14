"use client";

import React from "react";
import { useStore } from "@/lib/store";
import type { NavMode } from "@/lib/store/types";
import { TOKENS } from "./primitives";

export function CameraControlGroup({
  variant = "bar",
  style,
}: {
  variant?: "bar" | "compact";
  style?: React.CSSProperties;
}) {
  const navMode = useStore((s) => s.navMode);
  const setNavMode = useStore((s) => s.setNavMode);
  const view2D = useStore((s) => s.view2D);
  const toggleView2D = useStore((s) => s.toggleView2D);
  const traceSource = useStore((s) => s.traceSource);
  const downloadTrace = useStore((s) => s.downloadTrace);
  const setTraceGalleryOpen = useStore((s) => s.setTraceGalleryOpen);
  const mode = useStore((s) => s.mode);

  const navButtons: { id: NavMode; label: string; title: string }[] = [
    { id: "OVERVIEW", label: "OVERVIEW", title: "Reset camera to full model view (Overview)" },
    { id: "LAYER_FOCUS", label: "LAYER", title: "Focus camera on current active layer" },
    { id: "OP_FOCUS", label: "OP", title: "Focus camera on active operation" },
    { id: "FOLLOW", label: "FOLLOW", title: "Toggle live camera follow mode during execution" },
  ];

  const handleTraceClick = () => {
    if (traceSource === "live") {
      downloadTrace();
    } else {
      setTraceGalleryOpen(true);
    }
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "1px",
        background: "rgba(9, 9, 9, 0.95)",
        padding: "2px",
        borderRadius: TOKENS.radiusSm,
        border: "1px solid #252525",
        backdropFilter: "blur(18px)",
        userSelect: "none",
        fontFamily: TOKENS.fontSans,
        ...style,
      }}
      role="toolbar"
      aria-label="3D & Workspace Controls"
    >
      {navButtons.map(({ id, label, title }) => {
        const isActive = navMode === id;
        return (
          <button
            key={id}
            onClick={() => {
              if (id === "FOLLOW" && isActive) {
                setNavMode("MANUAL");
              } else {
                setNavMode(id);
              }
            }}
            title={title}
            style={{
              height: variant === "compact" ? "20px" : "22px",
              padding: "0 7px",
              fontSize: "10px",
              fontWeight: isActive ? 600 : 500,
              fontFamily: TOKENS.fontSans,
              letterSpacing: "0.02em",
              borderRadius: "3px",
              border: "none",
              cursor: "pointer",
              transition: "all 0.12s ease",
              background: isActive ? "#ffffff" : "transparent",
              color: isActive ? "#000000" : "#a3a3a3",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        );
      })}

      <div style={{ width: 1, height: "14px", background: "#252525", margin: "0 2px" }} />

      {/* 3D / 2D Visualization Mode Toggle */}
      <button
        onClick={toggleView2D}
        title={view2D ? "Switch to 3D spatial stack visualization" : "Switch to 2D flat schematic overview"}
        style={{
          height: variant === "compact" ? "20px" : "22px",
          padding: "0 7px",
          fontSize: "10px",
          fontWeight: !view2D ? 600 : 500,
          fontFamily: TOKENS.fontSans,
          letterSpacing: "0.02em",
          borderRadius: "3px",
          border: "none",
          cursor: "pointer",
          transition: "all 0.12s ease",
          background: !view2D ? "#ffffff" : "transparent",
          color: !view2D ? "#000000" : "#a3a3a3",
          whiteSpace: "nowrap",
        }}
      >
        {view2D ? "2D" : "3D"}
      </button>

      {/* Trace Info Action */}
      <button
        onClick={handleTraceClick}
        title="Inspect or download execution trace (.tokenprint.json)"
        style={{
          height: variant === "compact" ? "20px" : "22px",
          padding: "0 7px",
          fontSize: "10px",
          fontWeight: 500,
          fontFamily: TOKENS.fontSans,
          letterSpacing: "0.02em",
          borderRadius: "3px",
          border: "none",
          cursor: "pointer",
          transition: "all 0.12s ease",
          background: "transparent",
          color: "#a3a3a3",
          whiteSpace: "nowrap",
        }}
      >
        TRACE
      </button>
    </div>
  );
}
