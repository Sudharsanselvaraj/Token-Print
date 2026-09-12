"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { DotTensorField } from "./DotTensorField";

type ZoomLevel = "full_model" | "single_layer" | "single_component" | "tensor_details";

export function ComputationGraph() {
  const data = useStore((s) => s.data);
  const arch = useStore((s) => s.arch);
  const selectedTokenIndex = useStore((s) => s.selectedTokenIndex);
  const setSelectedTokenIndex = useStore((s) => s.setSelectedTokenIndex);
  const selectedLayer = useStore((s) => s.selectedLayer);
  const setLayer = useStore((s) => s.setLayer);
  const selectedHead = useStore((s) => s.selectedHead);
  const setSelectedTensor = useStore((s) => s.setSelectedTensor);
  const selectedTensor = useStore((s) => s.selectedTensor);
  const graphViewMode = useStore((s) => s.graphViewMode);

  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("full_model");
  const [zoomScale, setZoomScale] = useState<number>(1.0);

  const m = arch?.metadata;
  const tokens = data?.tokens || [
    { index: 0, text: "Name", piece: "Name", id: 2437, is_special: false },
    { index: 1, text: "one", piece: "one", id: 284, is_special: false },
    { index: 2, text: "primary", piece: "primary", id: 4331, is_special: false },
    { index: 3, text: "color", piece: "color", id: 16326, is_special: false },
    { index: 4, text: ".", piece: ".", id: 2456, is_special: false },
  ];

  const numLayers = m?.num_layers || data?.num_layers || 24;
  const numHeads = m?.num_heads || data?.num_heads || 14;
  const hiddenSize = m?.hidden_size || data?.hidden_size || 896;
  const ffnSize = m?.ffn_size || 4864;
  const vocabSize = m?.vocab_size || 151936;
  const kvHeads = m?.num_kv_heads || 2;
  const modelName = m?.name || data?.model || "Qwen2.5-0.5B-Instruct";
  const headDim = Math.floor(hiddenSize / numHeads);

  // Real softmax attention matrix for layer L & head H
  const currentAttn = data?.attention?.[selectedLayer]?.[selectedHead] || null;

  return (
    <div className="cg-root">
      {/* 1. TOP TOOLBAR */}
      <div className="cg-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="cg-heading">Spatial Computational Architecture</div>
          <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--mono)" }}>
            {modelName}
          </span>
        </div>

        {/* Zoom Level Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px", fontFamily: "var(--mono)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#040406", padding: "2px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              onClick={() => setZoomLevel("full_model")}
              style={{
                padding: "3px 8px",
                borderRadius: "3px",
                background: zoomLevel === "full_model" ? "#1e1b4b" : "transparent",
                color: zoomLevel === "full_model" ? "#a78bfa" : "#64748b",
                border: "none",
                cursor: "pointer",
              }}
            >
              Full Model
            </button>
            <button
              onClick={() => setZoomLevel("single_layer")}
              style={{
                padding: "3px 8px",
                borderRadius: "3px",
                background: zoomLevel === "single_layer" ? "#1e1b4b" : "transparent",
                color: zoomLevel === "single_layer" ? "#a78bfa" : "#64748b",
                border: "none",
                cursor: "pointer",
              }}
            >
              Single Layer
            </button>
            <button
              onClick={() => setZoomLevel("single_component")}
              style={{
                padding: "3px 8px",
                borderRadius: "3px",
                background: zoomLevel === "single_component" ? "#1e1b4b" : "transparent",
                color: zoomLevel === "single_component" ? "#a78bfa" : "#64748b",
                border: "none",
                cursor: "pointer",
              }}
            >
              Single Component
            </button>
          </div>

          {/* Layer Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#64748b" }}>Layer:</span>
            <button
              onClick={() => setLayer(Math.max(0, selectedLayer - 1))}
              style={{ background: "#0e0e13", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", padding: "1px 5px", borderRadius: "3px", cursor: "pointer" }}
            >
              &lt;
            </button>
            <span style={{ color: "#f8fafc", fontWeight: 600 }}>{selectedLayer} / {numLayers - 1}</span>
            <button
              onClick={() => setLayer(Math.min(numLayers - 1, selectedLayer + 1))}
              style={{ background: "#0e0e13", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", padding: "1px 5px", borderRadius: "3px", cursor: "pointer" }}
            >
              &gt;
            </button>
          </div>

          {/* Scale Adjust */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "#64748b" }}>Scale:</span>
            <button onClick={() => setZoomScale((z) => Math.max(0.7, z - 0.1))} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>-</button>
            <span style={{ color: "#e2e8f0" }}>{Math.round(zoomScale * 100)}%</span>
            <button onClick={() => setZoomScale((z) => Math.min(1.3, z + 0.1))} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>+</button>
          </div>
        </div>
      </div>

      {/* 2. SPATIAL ARCHITECTURE VIEWPORT */}
      <div className="cg-viewport">
        <div
          className="cg-flow-container"
          style={{ transform: `scale(${zoomScale})`, transformOrigin: "top center", transition: "transform 0.15s ease-out" }}
        >
          {/* SECTION 1: INPUT SEQUENCE */}
          <div
            className={`cg-node-block ${selectedTensor === "input_ids" ? "selected" : ""}`}
            onClick={() => setSelectedTensor("input_ids")}
          >
            <div className="cg-node-header">
              <div className="cg-node-title">INPUT TOKENS & SEQUENCE</div>
              <div className="cg-node-dim">[{tokens.length} tokens]</div>
            </div>

            <div style={{ display: "flex", gap: "6px", overflowX: "auto", padding: "4px 0" }}>
              {tokens.map((tok, idx) => {
                const isSelected = selectedTokenIndex === idx;
                return (
                  <button
                    key={tok.index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTokenIndex(idx);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "4px",
                      background: isSelected ? "rgba(255, 255, 255, 0.12)" : "#040406",
                      border: `1px solid ${isSelected ? "#a78bfa" : "rgba(255, 255, 255, 0.08)"}`,
                      color: isSelected ? "#ffffff" : "#94a3b8",
                      fontFamily: "var(--mono)",
                      fontSize: "11px",
                      cursor: "pointer",
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: isSelected ? 600 : 400 }}>{tok.text}</span>
                    <span style={{ fontSize: "9px", color: "#64748b" }}>#{tok.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cg-connector-line"><div className="cg-line" /></div>

          {/* SECTION 2: TOKEN EMBEDDING MATRIX PLANE */}
          <div
            className={`cg-node-block ${selectedTensor === "embed_tokens" ? "selected" : ""}`}
            onClick={() => setSelectedTensor("embed_tokens")}
          >
            <div className="cg-node-header">
              <div className="cg-node-title">TOKEN & POSITION EMBEDDINGS</div>
              <div className="cg-node-dim">[{tokens.length} × {hiddenSize}]</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--mono)" }}>
                Table: {vocabSize.toLocaleString()} × {hiddenSize} · Positional: Rotary Embeddings (RoPE)
              </div>

              <DotTensorField
                rows={tokens.length}
                cols={32}
                label="Embedding Tensor Field"
                accentColor="167, 139, 250"
              />
            </div>
          </div>

          <div className="cg-connector-line"><div className="cg-line" /></div>

          {/* SECTION 3: SPATIAL TRANSFORMER LAYER */}
          <div className="cg-node-block" style={{ background: "#0b0b0e", borderColor: "rgba(167, 139, 250, 0.4)" }}>
            <div className="cg-node-header">
              <div className="cg-node-title" style={{ color: "#a78bfa" }}>
                TRANSFORMER LAYER {selectedLayer} (OF {numLayers})
              </div>
              <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--mono)" }}>
                {numHeads} Q Heads · {kvHeads} KV Heads · Dim {headDim}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
              {/* 3A: LayerNorm 1 */}
              <div style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "var(--mono)" }}>
                <span style={{ color: "#94a3b8" }}>01 RMSNORM 1</span>
                <span style={{ color: "#64748b" }}>RMSNorm(x, eps=1e-6) [{tokens.length} × {hiddenSize}]</span>
              </div>

              {/* 3B: Q, K, V Spatial Projection Matrices */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px", background: "#040406", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px" }}>
                <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#a78bfa", fontWeight: 700, fontFamily: "var(--mono)" }}>
                  02 Q, K, V WEIGHT PROJECTIONS
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  <div
                    onClick={() => setSelectedTensor(`model.layers.${selectedLayer}.self_attn.q_proj.weight`)}
                    style={{ padding: "8px", background: "#09090c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", cursor: "pointer" }}
                  >
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#e2e8f0", fontFamily: "var(--mono)" }}>Q WEIGHTS</div>
                    <div style={{ fontSize: "9px", color: "#64748b", fontFamily: "var(--mono)", marginBottom: "4px" }}>[{hiddenSize} → {numHeads * headDim}]</div>
                    <DotTensorField rows={tokens.length} cols={8} accentColor="167, 139, 250" />
                  </div>

                  <div
                    onClick={() => setSelectedTensor(`model.layers.${selectedLayer}.self_attn.k_proj.weight`)}
                    style={{ padding: "8px", background: "#09090c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", cursor: "pointer" }}
                  >
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#e2e8f0", fontFamily: "var(--mono)" }}>K WEIGHTS</div>
                    <div style={{ fontSize: "9px", color: "#64748b", fontFamily: "var(--mono)", marginBottom: "4px" }}>[{hiddenSize} → {kvHeads * headDim}]</div>
                    <DotTensorField rows={tokens.length} cols={8} accentColor="167, 139, 250" />
                  </div>

                  <div
                    onClick={() => setSelectedTensor(`model.layers.${selectedLayer}.self_attn.v_proj.weight`)}
                    style={{ padding: "8px", background: "#09090c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", cursor: "pointer" }}
                  >
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#e2e8f0", fontFamily: "var(--mono)" }}>V WEIGHTS</div>
                    <div style={{ fontSize: "9px", color: "#64748b", fontFamily: "var(--mono)", marginBottom: "4px" }}>[{hiddenSize} → {kvHeads * headDim}]</div>
                    <DotTensorField rows={tokens.length} cols={8} accentColor="167, 139, 250" />
                  </div>
                </div>

                {/* Attention Matrix Field */}
                <div style={{ marginTop: "6px" }}>
                  <DotTensorField
                    rows={tokens.length}
                    cols={tokens.length}
                    data={currentAttn || undefined}
                    label={`SOFTMAX ATTENTION MATRIX (5×5) · Head ${selectedHead}`}
                    accentColor="167, 139, 250"
                  />
                </div>
              </div>

              {/* 3C: O Projection & Residual Stream */}
              <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "var(--mono)" }}>
                <span style={{ color: "#94a3b8" }}>03 O PROJECTION & RESIDUAL STREAM</span>
                <span style={{ color: "#64748b" }}>x = x + Attn_Out [{tokens.length} × {hiddenSize}]</span>
              </div>

              {/* 3D: LayerNorm 2 */}
              <div style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "var(--mono)" }}>
                <span style={{ color: "#94a3b8" }}>04 RMSNORM 2</span>
                <span style={{ color: "#64748b" }}>RMSNorm(x, eps=1e-6) [{tokens.length} × {hiddenSize}]</span>
              </div>

              {/* 3E: MLP (SwiGLU) Weights */}
              <div
                onClick={() => setSelectedTensor(`model.layers.${selectedLayer}.mlp.gate_proj.weight`)}
                style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px", background: "#040406", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", textTransform: "uppercase", color: "#e2e8f0", fontWeight: 700, fontFamily: "var(--mono)" }}>
                    05 MLP BLOCK (GATE, UP, DOWN PROJECTIONS)
                  </span>
                  <span style={{ fontSize: "9px", color: "#64748b", fontFamily: "var(--mono)" }}>
                    [{hiddenSize} → {ffnSize} → {hiddenSize}]
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  <div style={{ padding: "6px", background: "#09090c", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px" }}>
                    <div style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "var(--mono)" }}>GATE PROJ</div>
                    <DotTensorField rows={2} cols={8} accentColor="226, 232, 240" />
                  </div>
                  <div style={{ padding: "6px", background: "#09090c", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px" }}>
                    <div style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "var(--mono)" }}>UP PROJ</div>
                    <DotTensorField rows={2} cols={8} accentColor="226, 232, 240" />
                  </div>
                  <div style={{ padding: "6px", background: "#09090c", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px" }}>
                    <div style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "var(--mono)" }}>DOWN PROJ</div>
                    <DotTensorField rows={2} cols={8} accentColor="226, 232, 240" />
                  </div>
                </div>
              </div>

              {/* 3F: Residual Stream 2 */}
              <div style={{ padding: "6px 0", display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "var(--mono)" }}>
                <span style={{ color: "#94a3b8" }}>06 RESIDUAL STREAM</span>
                <span style={{ color: "#64748b" }}>x = x + MLP_Out [{tokens.length} × {hiddenSize}]</span>
              </div>
            </div>
          </div>

          <div className="cg-connector-line"><div className="cg-line" /></div>

          {/* SECTION 4: COLLAPSED LAYER STACK */}
          <div className="cg-node-block">
            <div className="cg-node-header">
              <div className="cg-node-title">STACKED TRANSFORMER LAYERS (1 .. {numLayers - 1})</div>
              <div className="cg-node-dim">{numLayers - 1} layers</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "4px", marginTop: "4px" }}>
              {Array.from({ length: Math.min(numLayers - 1, 24) }, (_, i) => {
                const lIdx = i + 1;
                const isSelected = selectedLayer === lIdx;
                return (
                  <button
                    key={lIdx}
                    onClick={() => setLayer(lIdx)}
                    style={{
                      padding: "6px 2px",
                      borderRadius: "4px",
                      background: isSelected ? "rgba(167, 139, 250, 0.2)" : "#040406",
                      border: `1px solid ${isSelected ? "#a78bfa" : "rgba(255,255,255,0.08)"}`,
                      color: isSelected ? "#a78bfa" : "#64748b",
                      fontSize: "10px",
                      fontFamily: "var(--mono)",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    L{lIdx}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cg-connector-line"><div className="cg-line" /></div>

          {/* SECTION 5: FINAL NORM & LM HEAD */}
          <div
            className={`cg-node-block ${selectedTensor === "lm_head.weight" ? "selected" : ""}`}
            onClick={() => setSelectedTensor("lm_head.weight")}
          >
            <div className="cg-node-header">
              <div className="cg-node-title">FINAL NORM & LM HEAD UNEMBEDDING</div>
              <div className="cg-node-dim">[{tokens.length} × {vocabSize.toLocaleString()}]</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", fontFamily: "var(--mono)", color: "#64748b" }}>
                Final RMSNorm → Linear Projection [{hiddenSize} → {vocabSize.toLocaleString()} Logits]
              </div>

              <DotTensorField
                rows={1}
                cols={32}
                label={`Top Logits Vector for Target: "${tokens[selectedTokenIndex]?.text || "Next Token"}"`}
                accentColor="167, 139, 250"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
