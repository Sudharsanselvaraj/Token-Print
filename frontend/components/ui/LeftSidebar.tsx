"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { GraphViewMode, Token } from "@/lib/types";
import ModelLoader from "./ModelLoader";
import GgufControls from "./GgufControls";
import { HFModelPicker } from "./HFModelPicker";
import ExplorerControls from "./ExplorerControls";
import TensorList from "./TensorList";
import ModelSummaryCard from "./ModelSummaryCard";
import {
  Panel,
  Section,
  SectionHeader,
  Badge,
  Button,
  IconButton,
  TOKENS,
} from "./primitives";

interface LeftSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function LeftSidebar({ collapsed, onToggleCollapse }: LeftSidebarProps) {
  const data = useStore((s) => s.data);
  const arch = useStore((s) => s.arch);
  const graphViewMode = useStore((s) => s.graphViewMode);
  const setGraphViewMode = useStore((s) => s.setGraphViewMode);
  const selectedTokenIndex = useStore((s) => s.selectedTokenIndex);
  const setSelectedTokenIndex = useStore((s) => s.setSelectedTokenIndex);
  const selectedLayer = useStore((s) => s.selectedLayer);

  // Active Source tab: live, trace, gguf, hf
  const [sourceTab, setSourceTab] = useState<"live" | "trace" | "gguf" | "hf">("live");

  const m = arch?.metadata;
  const modelName = m?.name || data?.model || "Qwen2.5-0.5B-Instruct";
  const numLayers = m?.num_layers || data?.num_layers || 24;

  const tokens: Token[] = data?.tokens || [
    { index: 0, text: "Name", piece: "Name", id: 2437, is_special: false },
    { index: 1, text: "one", piece: "one", id: 284, is_special: false },
    { index: 2, text: "primary", piece: "primary", id: 4331, is_special: false },
    { index: 3, text: "color", piece: "color", id: 16326, is_special: false },
    { index: 4, text: ".", piece: ".", id: 2456, is_special: false },
  ];

  const viewModes: { id: GraphViewMode; label: string; key: string }[] = [
    { id: "full", label: "Architecture", key: "1" },
    { id: "single_layer", label: "Single Layer", key: "2" },
    { id: "attention_flow", label: "Attention Flow", key: "3" },
    { id: "residual_stream", label: "Residual Stream", key: "4" },
    { id: "logit_lens", label: "Logit Lens", key: "5" },
    { id: "activations", label: "Activations", key: "6" },
    { id: "token_flow", label: "Token Flow", key: "7" },
  ];

  if (collapsed) {
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
      >
        <IconButton
          icon="›"
          onClick={onToggleCollapse}
          title="Expand Left Sidebar (Ctrl+[)"
        />
      </div>
    );
  }

  return (
    <Panel className="left-sidebar">
      {/* 1. MODEL HEADER */}
      <ModelSummaryCard onToggleCollapse={onToggleCollapse} />

      {/* Scrollable middle container */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* 2. VIEWS */}
        <Section>
          <SectionHeader title="VIEWS" />
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {viewModes.map((v) => {
              const isActive = graphViewMode === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setGraphViewMode(v.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 10px",
                    borderRadius: TOKENS.radiusSm,
                    border: `1px solid ${isActive ? TOKENS.borderStrong : TOKENS.border}`,
                    background: isActive ? TOKENS.surfaceHover : "transparent",
                    color: isActive ? TOKENS.textPrimary : TOKENS.textSecondary,
                    fontFamily: TOKENS.fontSans,
                    fontSize: "12px",
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    textAlign: "left",
                  }}
                >
                  <span>{v.label}</span>
                  <span style={{ fontSize: "10px", fontFamily: TOKENS.fontMono, color: TOKENS.textMuted }}>
                    {v.key}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* 3. LAYERS */}
        <Section>
          <SectionHeader title="LAYERS" action={<Badge>{numLayers}</Badge>} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: "4px",
            }}
          >
            {Array.from({ length: numLayers }, (_, l) => {
              const isSelected = selectedLayer === l;
              return (
                <button
                  key={l}
                  onClick={() => {
                    useStore.getState().setLayer(l);
                    useStore.getState().setUserOrbiting(false);
                    useStore.getState().setCameraMode("layer");
                  }}
                  style={{
                    padding: "5px 0",
                    fontSize: "11px",
                    fontFamily: TOKENS.fontMono,
                    fontWeight: isSelected ? 700 : 400,
                    borderRadius: TOKENS.radiusSm,
                    border: `1px solid ${isSelected ? "#ffffff" : TOKENS.border}`,
                    background: isSelected ? "#ffffff" : TOKENS.surfaceRaised,
                    color: isSelected ? "#000000" : TOKENS.textSecondary,
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.12s",
                  }}
                >
                  L{l}
                </button>
              );
            })}
          </div>
        </Section>

        {/* 4. TOKENS */}
        <Section>
          <SectionHeader title="TOKENS" action={<Badge>{tokens.length}</Badge>} />
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {tokens.map((tok, idx) => {
              const isSelected = selectedTokenIndex === idx;
              return (
                <button
                  key={tok.index}
                  onClick={() => {
                    setSelectedTokenIndex(idx);
                    useStore.setState({ followMode: true });
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    borderRadius: TOKENS.radiusSm,
                    border: `1px solid ${isSelected ? TOKENS.borderStrong : TOKENS.border}`,
                    background: isSelected ? TOKENS.surfaceHover : "transparent",
                    color: isSelected ? TOKENS.textPrimary : TOKENS.textSecondary,
                    fontSize: "12px",
                    fontFamily: TOKENS.fontSans,
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "10px", fontFamily: TOKENS.fontMono, color: TOKENS.textMuted }}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span style={{ fontWeight: isSelected ? 600 : 400 }}>{tok.text}</span>
                  </div>
                  <span style={{ fontSize: "10px", fontFamily: TOKENS.fontMono, color: TOKENS.textMuted }}>
                    #{tok.id}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* 5. MODEL SOURCE */}
        <Section>
          <SectionHeader title="MODEL SOURCE" />
          <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
            {(["live", "trace", "gguf", "hf"] as const).map((tab) => (
              <Button
                key={tab}
                variant={sourceTab === tab ? "primary" : "secondary"}
                onClick={() => setSourceTab(tab)}
                style={{ flex: 1, textTransform: "uppercase", fontSize: "10px" }}
              >
                {tab}
              </Button>
            ))}
          </div>

          <div style={{ borderRadius: TOKENS.radiusSm, overflow: "hidden" }}>
            {sourceTab === "live" && <ModelLoader />}
            {sourceTab === "trace" && <ModelLoader />}
            {sourceTab === "gguf" && <GgufControls />}
            {sourceTab === "hf" && (
              <HFModelPicker
                onSelectModel={(modelId) => {
                  useStore.getState().loadArchitecture(modelId);
                }}
              />
            )}
          </div>
        </Section>

        {/* 6. VISUALIZATION CONTROLS */}
        <Section>
          <SectionHeader title="VISUALIZATION CONTROLS" />
          <ExplorerControls />
        </Section>

        {/* 7. TENSOR CATALOG */}
        <Section noBorder>
          <SectionHeader
            title="TENSOR CATALOG"
            action={<Badge>{arch?.tensors?.length || 290}</Badge>}
          />
          <TensorList />
        </Section>
      </div>
    </Panel>
  );
}