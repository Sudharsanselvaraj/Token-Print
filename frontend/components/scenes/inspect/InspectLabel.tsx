"use client";

import React from "react";
import { Html } from "@react-three/drei";
import { InspectableComponent } from "./componentDefinitions";

interface InspectLabelProps {
  component: InspectableComponent;
  position?: [number, number, number];
}

export function InspectLabel({ component, position = [0, 2.2, 0] }: InspectLabelProps) {
  const layerText = component.layer != null ? `Layer ${component.layer}` : "Global";

  const dimText =
    component.inputShape && component.outputShape
      ? `${component.inputShape[component.inputShape.length - 1]} → ${component.outputShape.join(" × ")}`
      : null;

  return (
    <Html
      position={position}
      center
      distanceFactor={18}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div className="flex flex-col items-center bg-black/90 text-white px-3 py-1 border border-zinc-800 rounded-md font-mono text-[11px] tracking-wide whitespace-nowrap backdrop-blur-sm shadow-xl">
        <div className="font-bold text-white text-[12px] uppercase tracking-wider">
          {component.title}
        </div>
        <div className="text-[10px] text-zinc-400 font-normal">
          {layerText} · {component.category}
        </div>
        {dimText && (
          <div className="text-[9px] text-zinc-500 mt-0.5 font-mono">
            {dimText}
          </div>
        )}
      </div>
    </Html>
  );
}
