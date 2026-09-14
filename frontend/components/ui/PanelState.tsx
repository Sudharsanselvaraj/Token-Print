"use client";

import React from "react";

export type PanelStateKind = "loading" | "empty" | "unsupported";

interface PanelStateProps {
  kind: PanelStateKind;
  title: string;
  message: string;
}

export default function PanelState({ kind, title, message }: PanelStateProps) {
  return (
    <div className={`panel-state panel-state-${kind}`} role="status">
      <div className="panel-state-title">{title}</div>
      <div className="panel-state-message">{message}</div>
    </div>
  );
}