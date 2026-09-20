"use client";

import { useStore } from "@/lib/store";
import {
  DEBUGGER_TOOL_GROUPS,
  DEBUGGER_OVERVIEW,
  DebuggerTool,
} from "@/lib/debuggerTools";
import ModelSummaryCard from "./ModelSummaryCard";
import { Panel, Section, SectionHeader, TOKENS } from "./primitives";

function ToolRow({
  tool,
  active,
}: {
  tool: DebuggerTool;
  active: boolean;
}) {
  return (
    <button
      onClick={() => {
        useStore.getState().setDebuggerTool(tool.id);

      }}
      title={tool.purpose}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "6px",
        padding: "6px 10px",
        borderRadius: TOKENS.radiusSm,
        border: `1px solid ${active ? TOKENS.borderStrong : TOKENS.border}`,
        background: active ? TOKENS.surfaceHover : "transparent",
        color: active ? TOKENS.textPrimary : TOKENS.textSecondary,
        fontFamily: TOKENS.fontSans,
        fontSize: "12px",
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        transition: "all 0.15s",
        textAlign: "left",
        width: "100%",
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {tool.label}
      </span>
      <span style={{ fontSize: "9px", fontFamily: TOKENS.fontMono, color: TOKENS.textMuted, flexShrink: 0 }}>
        {tool.id}
      </span>
    </button>
  );
}

export default function DebuggerSidebar({
  onToggleCollapse,
}: {
  onToggleCollapse?: () => void;
}) {
  const debuggerTool = useStore((s) => s.debuggerTool);

  return (
    <Panel className="left-sidebar">
      <ModelSummaryCard onToggleCollapse={onToggleCollapse} />

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* 1. DEBUGGER */}
        <Section>
          <SectionHeader title="DEBUGGER" />
          <ToolRow tool={DEBUGGER_OVERVIEW} active={debuggerTool === "overview"} />
        </Section>

        {/* 2. TOOL GROUPS */}
        {DEBUGGER_TOOL_GROUPS.map((group) => (
          <Section key={group.label}>
            <SectionHeader title={group.label} />
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {group.tools.map((tool) => (
                <ToolRow key={tool.id} tool={tool} active={debuggerTool === tool.id} />
              ))}
            </div>
          </Section>
        ))}
      </div>
    </Panel>
  );
}