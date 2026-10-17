"use client";

import { useStore } from "@/lib/store";
import {
  DEBUGGER_TOOL_GROUPS,
  DEBUGGER_OVERVIEW,
  DebuggerTool,
} from "@/lib/debuggerTools";
import ModelSummaryCard from "./ModelSummaryCard";
import { Panel, Section, SectionHeader, TOKENS } from "./primitives";
import { getDebuggerToolCapability, extractModelCapabilities } from "@/lib/capabilities";

const TILE_FOR_TOOL: Record<string, string> = {
  overview: "dashboard", tensor_inspector: "tensor_inspector", attention_analysis: "attention_analysis",
  activation_analysis: "activation_analysis", residual_contributions: "residual_contributions",
  induction_heads: "induction_heads", logit_lens: "logit_lens", activation_patching: "activation_patching",
  head_ablation: "head_ablation", layer_ablation: "head_ablation", sampling_playground: "sampling_playground",
  experiments: "experiments", trace_frames: "trace_frames", operation_timeline: "operation_timeline",
  token_state: "token_state", kv_cache: "kv_cache", local_checkpoint: "local_checkpoint",
  gguf_loading: "local_checkpoint", quantization_compare: "quantization_compare",
};

function focusTile(tool: DebuggerTool) {
  const target = TILE_FOR_TOOL[tool.id] ?? "dashboard";
  const element = target === "dashboard"
    ? document.querySelector(".dbg-dashboard")
    : document.querySelector(`[data-dbg-tool="${target}"]`);
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  const node = element as HTMLElement;
  node.classList.remove("dbg-flash");
  void node.offsetWidth;
  node.classList.add("dbg-flash");
}

function ToolRow({
  tool,
  active,
  capabilities,
}: {
  tool: DebuggerTool;
  active: boolean;
  capabilities?: any;
}) {
  const cap = getDebuggerToolCapability(tool.id, capabilities);
  const isUnsupported = !cap.supported;

  return (
    <button
      onClick={() => {
        if (!isUnsupported) {
          useStore.getState().setDebuggerTool(tool.id);
          focusTile(tool);
        }
      }}
      disabled={isUnsupported}
      aria-disabled={isUnsupported}
      title={isUnsupported ? (cap.reason || "Not supported by this model architecture") : tool.purpose}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "6px",
        padding: "6px 10px",
        borderRadius: TOKENS.radiusSm,
        border: `1px solid ${
          isUnsupported
            ? "rgba(255, 255, 255, 0.05)"
            : active
            ? TOKENS.borderStrong
            : TOKENS.border
        }`,
        background: isUnsupported
          ? "transparent"
          : active
          ? TOKENS.surfaceHover
          : "transparent",
        color: isUnsupported
          ? TOKENS.textMuted
          : active
          ? TOKENS.textPrimary
          : TOKENS.textSecondary,
        fontFamily: TOKENS.fontSans,
        fontSize: "12px",
        fontWeight: active ? 600 : 400,
        cursor: isUnsupported ? "not-allowed" : "pointer",
        opacity: isUnsupported ? 0.45 : 1,
        transition: "all 0.15s",
        textAlign: "left",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tool.label}
        </span>
        {isUnsupported && (
          <span
            style={{
              fontSize: "9px",
              fontFamily: TOKENS.fontMono,
              fontWeight: 600,
              padding: "1px 5px",
              borderRadius: "3px",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              letterSpacing: "0.4px",
              lineHeight: 1.2,
              flexShrink: 0,
            }}
          >
            N/A
          </span>
        )}
      </div>
      <span style={{ fontSize: "9px", fontFamily: TOKENS.fontMono, color: isUnsupported ? "rgba(255, 255, 255, 0.2)" : TOKENS.textMuted, flexShrink: 0 }}>
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
  const data = useStore((s) => s.data);
  const arch = useStore((s) => s.arch);
  const capabilities = extractModelCapabilities(data, arch);

  return (
    <Panel className="left-sidebar">
      <ModelSummaryCard onToggleCollapse={onToggleCollapse} />

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* 1. DEBUGGER */}
        <Section>
          <SectionHeader title="DEBUGGER" />
          <ToolRow tool={DEBUGGER_OVERVIEW} active={debuggerTool === "overview"} capabilities={capabilities} />
        </Section>

        {/* 2. TOOL GROUPS */}
        {DEBUGGER_TOOL_GROUPS.map((group) => (
          <Section key={group.label}>
            <SectionHeader title={group.label} />
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {group.tools.map((tool) => (
                <ToolRow key={tool.id} tool={tool} active={debuggerTool === tool.id} capabilities={capabilities} />
              ))}
            </div>
          </Section>
        ))}
      </div>
    </Panel>
  );
}
