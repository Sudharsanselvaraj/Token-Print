"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FocusFrameBorderProps = {
  children: ReactNode;
  className?: string;
  duration?: number;
  color?: string;
};

const corners = [
  {
    position: "top-0 left-0",
    edges: "border-t-1 border-l-1 rounded-tl-xl",
    delay: 0,
  },
  {
    position: "top-0 right-0",
    edges: "border-t-1 border-r-1 rounded-tr-xl",
    delay: 0.3,
  },
  {
    position: "bottom-0 left-0",
    edges: "border-b-1 border-l-1 rounded-bl-xl",
    delay: 0.6,
  },
  {
    position: "bottom-0 right-0",
    edges: "border-b-1 border-r-1 rounded-br-xl",
    delay: 0.9,
  },
];

const FocusFrameBorder = ({
  children,
  className,
  duration = 2.4,
  color = "rgba(255, 255, 255, 0.4)",
}: FocusFrameBorderProps) => {
  return (
    <>
      <style>{`
        @keyframes focus-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .animate-focus-pulse {
          animation: focus-pulse var(--duration, 2.4s) ease-in-out infinite;
        }
        .border-t-1 { border-top-width: 2px; }
        .border-b-1 { border-bottom-width: 2px; }
        .border-l-1 { border-left-width: 2px; }
        .border-r-1 { border-right-width: 2px; }
      `}</style>
      <div className={cn("relative rounded-2xl", className)}>
        {/* Pulsing corner brackets */}
        {corners.map((corner) => (
          <div
            key={corner.position}
            className={cn(
              "absolute z-20 size-10 pointer-events-none animate-focus-pulse",
              corner.position,
              corner.edges,
            )}
            style={
              {
                borderColor: color,
                filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})`,
                animationDelay: `${corner.delay}s`,
                "--duration": `${duration}s`,
              } as React.CSSProperties
            }
          />
        ))}

        {/* Content Layer */}
        <div className="relative z-10 rounded-xl bg-[#0C0D10] border border-white/10 overflow-hidden h-full">
          {children}
        </div>
      </div>
    </>
  );
};

export default FocusFrameBorder;
