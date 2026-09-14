"use client";

import { useUIMode } from "@/lib/store";
import { IconButton, TOKENS } from "./primitives";
import LeftSidebar from "./LeftSidebar";
import GenerationSidebar from "./GenerationSidebar";
import WalkthroughSidebar from "./WalkthroughSidebar";
import DebuggerSidebar from "./DebuggerSidebar";

export function CollapsedSidebarRail({
  onToggleCollapse,
}: {
  onToggleCollapse?: () => void;
}) {
  return (
    <div
      style={{
        width: "36px",
        height: "100%",
        background: TOKENS.bg,
        borderRight: `1px solid ${TOKENS.border}`,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12px",
      }}
      className="left-sidebar"
    >
      <IconButton icon="›" onClick={onToggleCollapse} title="Expand Left Sidebar" />
    </div>
  );
}

export default function ModeSidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const mode = useUIMode();

  if (collapsed) {
    return <CollapsedSidebarRail onToggleCollapse={onToggleCollapse} />;
  }

  switch (mode) {
    case "explorer":
      return <LeftSidebar collapsed={false} onToggleCollapse={onToggleCollapse} />;
    case "generation":
      return <GenerationSidebar onToggleCollapse={onToggleCollapse} />;
    case "walkthrough":
      return <WalkthroughSidebar onToggleCollapse={onToggleCollapse} />;
    case "debugger":
      return <DebuggerSidebar onToggleCollapse={onToggleCollapse} />;
    default:
      return <LeftSidebar collapsed={false} onToggleCollapse={onToggleCollapse} />;
  }
}