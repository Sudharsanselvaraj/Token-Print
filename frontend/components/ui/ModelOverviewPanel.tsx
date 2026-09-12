"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { GraphViewMode } from "@/lib/types";
import { getCitationsForModel } from "@/lib/citations";

export function ModelOverviewPanel() {
  const data = useStore((s) => s.data);
  const arch = useStore((s) => s.arch);
  const graphViewMode = useStore((s) => s.graphViewMode);
  const setGraphViewMode = useStore((s) => s.setGraphViewMode);
  const selectedTokenIndex = useStore((s) => s.selectedTokenIndex);
  const setSelectedTokenIndex = useStore((s) => s.setSelectedTokenIndex);

  const m = arch?.metadata;
  const modelName = m?.name || data?.model || "Qwen2.5-0.5B-Instruct";
  const architecture = m?.architecture || "Qwen2ForCausalLM";
  const paramsFormatted = m?.total_params ? `${(m.total_params / 1e6).toFixed(2)}M` : "494.03M";
  const numLayers = m?.num_layers || data?.num_layers || 24;
  const numHeads = m?.num_heads || data?.num_heads || 14;
  const kvHeads = m?.num_kv_heads || 2;
  const contextLen = m?.context_length || 32768;
  const hiddenSize = m?.hidden_size || data?.hidden_size || 896;
  const vocabSize = m?.vocab_size || 151936;
  const dtype = m?.torch_dtype || m?.quantization || "float32";
  const backend = data?.provenance?.backend || "hf_local";

  const citations = getCitationsForModel(architecture, m);

  const tokens = data?.tokens || [
    { index: 0, text: "Name", piece: "Name", id: 2437, is_special: false },
    { index: 1, text: "one", piece: "one", id: 284, is_special: false },
    { index: 2, text: "primary", piece: "primary", id: 4331, is_special: false },
    { index: 3, text: "color", piece: "color", id: 16326, is_special: false },
    { index: 4, text: ".", piece: ".", id: 2456, is_special: false },
  ];

  const viewModes: { id: GraphViewMode; label: string }[] = [
    { id: "full", label: "Full Model" },
    { id: "single_layer", label: "Single Layer" },
    { id: "attention_flow", label: "Attention Flow" },
    { id: "residual_stream", label: "Residual Stream" },
    { id: "logit_lens", label: "Logit Lens" },
    { id: "activations", label: "Activations" },
    { id: "token_flow", label: "Token Flow" },
  ];

  return (
    <div className="mo-container">
      {/* 1. MODEL IDENTIFIER & SPECS */}
      <div className="mo-section">
        <div className="mo-title">{modelName}</div>
        <div className="mo-sub">{architecture}</div>

        <div className="mo-spec-list">
          <div className="mo-spec-row">
            <span className="mo-spec-label">Parameters</span>
            <span className="mo-spec-val">{paramsFormatted}</span>
          </div>
          <div className="mo-spec-row">
            <span className="mo-spec-label">Layers</span>
            <span className="mo-spec-val">{numLayers}</span>
          </div>
          <div className="mo-spec-row">
            <span className="mo-spec-label">Heads</span>
            <span className="mo-spec-val">{numHeads} ({kvHeads} KV)</span>
          </div>
          <div className="mo-spec-row">
            <span className="mo-spec-label">Context</span>
            <span className="mo-spec-val">{contextLen.toLocaleString()}</span>
          </div>
          <div className="mo-spec-row">
            <span className="mo-spec-label">Hidden Size</span>
            <span className="mo-spec-val">{hiddenSize}</span>
          </div>
          <div className="mo-spec-row">
            <span className="mo-spec-label">Vocab Size</span>
            <span className="mo-spec-val">{vocabSize.toLocaleString()}</span>
          </div>
          <div className="mo-spec-row">
            <span className="mo-spec-label">Dtype</span>
            <span className="mo-spec-val accent">{dtype}</span>
          </div>
          <div className="mo-spec-row">
            <span className="mo-spec-label">Backend</span>
            <span className="mo-spec-val">{backend}</span>
          </div>
        </div>
      </div>

      {/* 2. VIEWS NAV */}
      <div className="mo-section">
        <div className="rp-section-title" style={{ marginBottom: "6px" }}>VIEWS</div>
        <div className="mo-nav-list">
          {viewModes.map((v) => {
            const isActive = graphViewMode === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setGraphViewMode(v.id)}
                className={`mo-nav-item ${isActive ? "active" : ""}`}
              >
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. SEQUENCE TOKENS */}
      <div className="mo-section">
        <div className="rp-section-title" style={{ marginBottom: "6px" }}>SEQUENCE TOKENS</div>
        <div className="mo-nav-list">
          {tokens.map((tok, idx) => {
            const isSelected = selectedTokenIndex === idx;
            return (
              <button
                key={tok.index}
                onClick={() => setSelectedTokenIndex(idx)}
                className={`mo-nav-item ${isSelected ? "active" : ""}`}
              >
                <span>
                  <span style={{ color: "#64748b", marginRight: "6px" }}>{idx + 1}</span>
                  {tok.text}
                </span>
                <span style={{ color: "#64748b", fontSize: "10px" }}>#{tok.id}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
