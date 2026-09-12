"use client";

import React from "react";

interface DotTensorFieldProps {
  rows?: number;
  cols?: number;
  data?: number[][];
  label?: string;
  onDotClick?: (r: number, c: number, val: number) => void;
  accentColor?: string;
}

export function DotTensorField({
  rows = 5,
  cols = 32,
  data,
  label,
  onDotClick,
  accentColor = "167, 139, 250", // Cool steel violet
}: DotTensorFieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontFamily: "var(--mono)", color: "#64748b" }}>
          <span>{label}</span>
          <span>[{rows} × {cols}]</span>
        </div>
      )}

      <div
        className="dot-tensor-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
        }}
      >
        {Array.from({ length: rows }, (_, rIdx) =>
          Array.from({ length: cols }, (_, cIdx) => {
            const rawVal = data?.[rIdx]?.[cIdx];
            const val =
              rawVal !== undefined
                ? rawVal
                : Math.abs(Math.sin((rIdx + 1) * (cIdx + 1) * 0.4));
            const normVal = Math.min(1.0, Math.max(0.1, val));
            const opacity = 0.15 + normVal * 0.85;

            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className="tensor-dot"
                onClick={() => onDotClick?.(rIdx, cIdx, val)}
                title={`[${rIdx}, ${cIdx}]: ${val.toFixed(4)}`}
                style={{
                  backgroundColor: `rgba(${accentColor}, ${opacity})`,
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
