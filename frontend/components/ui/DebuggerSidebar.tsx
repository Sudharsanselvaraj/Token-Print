"use client";

import { useStore } from "@/lib/store";
import {
  DEBUGGER_TOOL_GROUPS,
  DEBUGGER_OVERVIEW,
  DebuggerTool,
} from "@/lib/debuggerTools";
import ModelSummaryCard from "./ModelSummaryCard";
import { Panel, Section, SectionHeader, TOKENS } from "./primitives";

// Which dashboard tile each tool targets (aliases share a tile).
const TILE_FOR_TOOL: Record<string, string> = {
  overview: "dashboard",
  tensor_inspector: "tensor_inspector",
  attention_analysis: "attention_analysis",
  activation_analysis: "activation_analysis",
  residual_contributions: "residual_contributions",
  induction_heads: "induction_heads",
  logit_lens: "logit_lens",
  activation_patching: "activation_patching",
  head_ablation: "head_ablation",
  layer_ablation: "head_ablation",
  sampling_playground: "sampling_playground",
  trace_frames: "trace_frames",
  operation_timeline: "operation_timeline",
  token_state: "token_state",
  kv_cache: "kv_cache",
  local_checkpoint: "local_checkpoint",
  gguf_loading: "local_checkpoint",
  quantization_compare: "quantization_compare",
};

function focusTile(tool: DebuggerTool) {
  const target = TILE_FOR_TOOL[tool.id] ?? "dashboard";
  let el: Element | null = null;
  if (target === "dashboard") {
    el = document.querySelector(".dbg-dashboard");
  } else {
    el = document.querySelector(`[data-dbg-tool="${target}"]`);
  }
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const node = el as HTMLElement;
  node.classList.remove("dbg-flash");
  void node.offsetWidth;
  node.classList.add("dbg-flash");
}

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
        focusTile(tool);
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