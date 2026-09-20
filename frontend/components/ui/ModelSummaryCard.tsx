"use client";

import { useState } from "react";
import { useStore, useUIMode } from "@/lib/store";
import ContributorDrawer from "./ContributorDrawer";
import { Section, MetricGrid, Metric, IconButton, TOKENS } from "./primitives";

function ModelAction({
  label,
  onClick,
  active = false,
  title,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title || label}
      style={{
        height: "22px",
        padding: "0 8px",
        fontSize: "10px",
        fontFamily: TOKENS.fontSans,
        letterSpacing: "0.02em",
        borderRadius: TOKENS.radiusSm,
        border: `1px solid ${active ? TOKENS.borderStrong : TOKENS.border}`,
        background: active ? TOKENS.surfaceHover : "transparent",
        color: active ? TOKENS.textPrimary : TOKENS.textSecondary,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

export default function ModelSummaryCard({
  onToggleCollapse,
}: {
  onToggleCollapse?: () => void;
}) {
  const data = useStore((s) => s.data);
  const arch = useStore((s) => s.arch);
  const mode = useUIMode();
  const tileView = useStore((s) => s.tileView);
  const setTileView = useStore((s) => s.setTileView);

  const [contribOpen, setContribOpen] = useState(false);

  const meta = useStore(s => s.genMeta);
  const m = arch?.metadata;
  const dims = meta?.model_dimensions;
  const modelName = meta?.model || m?.name || data?.model || "No model loaded";
  const architecture = meta?.architecture || m?.architecture || "—";
  const paramsFormatted = m?.total_params ? `${(m.total_params / 1e6).toFixed(2)}M` : "—";
  const numLayers = meta?.num_layers ?? m?.num_layers ?? data?.num_layers ?? "—";
  const numHeads = dims?.num_heads ?? m?.num_heads ?? data?.num_heads ?? "—";
  const kvHeads = dims?.num_kv_heads ?? m?.num_kv_heads ?? "—";
  const contextLen = dims?.context_length ?? m?.context_length ?? "—";
  const hiddenSize = dims?.hidden_size ?? m?.hidden_size ?? data?.hidden_size ?? "—";
  const vocabSize = dims?.vocab_size ?? m?.vocab_size ?? "—";
  const dtype = meta?.source === "browser" ? "float32 ONNX" : m?.torch_dtype || m?.quantization || "—";

  return (
    <>
      <Section>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 700,
                color: TOKENS.textPrimary,
                lineHeight: 1.25,
                letterSpacing: "-0.01em",
              }}
            >
              {modelName}
            </h1>
            <div style={{ fontSize: "11px", color: TOKENS.textMuted, marginTop: "2px" }}>
              {architecture}
            </div>
          </div>
          <IconButton icon="‹" onClick={onToggleCollapse} title="Collapse Sidebar" />
        </div>

        <MetricGrid columns={3}>
          <Metric label="PARAMS" value={paramsFormatted} />
          <Metric label="LAYERS" value={numLayers} />
          <Metric label="HIDDEN" value={hiddenSize} />
          <Metric label="HEADS" value={numHeads} />
          <Metric label="KV HEADS" value={kvHeads} />
          <Metric label="CONTEXT" value={contextLen.toLocaleString()} />
          <Metric label="VOCAB" value={vocabSize.toLocaleString()} />
          <Metric label="DTYPE" value={dtype} />
          <Metric label="RUNTIME" value={meta?.device || data?.provenance?.backend || "—"} />
        </MetricGrid>

        {/* Model actions */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            marginTop: "10px",
            paddingTop: "10px",
            borderTop: `1px solid ${TOKENS.border}`,
          }}
        >
          <ModelAction label="HF Models" title="Search Hugging Face Hub & inspect model capabilities" onClick={() => useStore.getState().setHfExplorerOpen(true)} />
          <ModelAction label="Contribute" title="Browse open issues & contribute to TokenPrint" onClick={() => setContribOpen(true)} />
          {mode === "explorer" && (
            <ModelAction
              label={tileView ? "3D" : "Grid"}
              active={tileView}
              title="Toggle tile grid view"
              onClick={() => setTileView(!tileView)}
            />
          )}
        </div>
      </Section>

      <ContributorDrawer open={contribOpen} onClose={() => setContribOpen(false)} />
    </>
  );
}