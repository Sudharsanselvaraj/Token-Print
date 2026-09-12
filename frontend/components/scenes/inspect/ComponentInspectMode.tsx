"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { InspectObjectStage } from "./InspectObjectStage";
import { InspectControls } from "./InspectControls";

export function ComponentInspectMode() {
  const inspectingComponentId = useStore((s) => s.inspectingComponentId);

  if (!inspectingComponentId) return null;

  return (
    <group>
      {/* Hero Inspect Stage Object */}
      <InspectObjectStage />
    </group>
  );
}

export { InspectControls };
