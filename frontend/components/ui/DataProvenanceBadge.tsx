"use client";

import React from "react";

export type DataOrigin = "real" | "derived" | "conceptual" | "simulation";

interface DataProvenanceBadgeProps {
  origin?: DataOrigin;
  label?: string;
  style?: React.CSSProperties;
}

export default function DataProvenanceBadge(_props: DataProvenanceBadgeProps) {
  return null;
}
