"use client";

/**
 * ComponentInspectorPanel.tsx
 *
 * Scientific Component Inspector — right-side panel.
 * Information hierarchy:
 *   1. Header band — layer context + parameter count
 *   2. Component title
 *   3. Purpose (1-line)
 *   4. Primary equation
 *   5. 3D Preview canvas (isolated)
 *   6. Data transformation flow
 *   7. Key dimensions grid
 *   8. How it works
 *   9. Why it matters
 *  10. Follow the data breadcrumb
 *  11. Model / tensor data
 */

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";
import {
  getComponentDefinition,
  type InspectableComponent,
} from "../scenes/inspect/componentDefinitions";
import {
  Panel,
  Section,
  SectionHeader,
  MetricGrid,
  Metric,
  Card,
  IconButton,
  TOKENS,
} from "./primitives";

// Lazy-load WebGL preview — keeps three-stdlib out of server chunk
const Inspector3DPreview = dynamic(
  () =>
    import("../scenes/inspect/Inspector3DPreview").then((m) => ({
      default: m.Inspector3DPreview,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "260px",
          background: TOKENS.surfaceFlat,
          borderRadius: TOKENS.radiusMd,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: TOKENS.textMuted,
          fontSize: "10px",
          fontFamily: TOKENS.fontMono,
        }}
      >
        Loading preview…
      </div>
    ),
  }
);

// ─── Semantic accent color per formula type (Model Visualization ONLY) ───────
function semanticAccentColor(comp: InspectableComponent): string {
  const t = comp.formulaType;
  const id = comp.id;
  if (id.includes("attn_q") || t === "q_proj") return "var(--semantic-q, #10b981)";
  if (id.includes("attn_k") || t === "k_proj") return "var(--semantic-k, #3b82f6)";
  if (id.includes("attn_v") || t === "v_proj") return "var(--semantic-v, #f97316)";
  if (t === "rope")                              return "var(--semantic-attention, #a855f7)";
  if (t === "softmax" || t === "scores" || t === "weighted_v") return "var(--semantic-attention, #a855f7)";
  if (t === "o_proj")                            return "var(--semantic-attention, #a855f7)";
  if (t?.startsWith("mlp") || t === "swiglu")   return "var(--semantic-mlp, #ea580c)";
  if (t === "rmsnorm" || t === "layernorm")      return "var(--semantic-residual, #f5f5f5)";
  if (t === "res_add_attn" || t === "res_add_mlp") return "var(--semantic-residual, #f5f5f5)";
  if (t === "embed" || t === "lm_head")          return "var(--semantic-data, #06b6d4)";
  return TOKENS.textPrimary;
}

// ─── Equation renderer (White/Gray defaults, semantic variable highlight) ────
interface Token { text: string; color?: string; style?: "bold" | "italic" | "normal" }

function equationTokens(comp: InspectableComponent): Token[] {
  const Q = "var(--semantic-q, #10b981)";
  const K = "var(--semantic-k, #3b82f6)";
  const V = "var(--semantic-v, #f97316)";
  const P = "var(--semantic-attention, #a855f7)";
  const M = "var(--semantic-mlp, #ea580c)";
  const W = TOKENS.textSecondary;
  const A = TOKENS.textPrimary;
  const t = comp.formulaType;

  switch (t) {
    case "embed":       return [{ text:"E", color:A, style:"bold" }, { text:" = Token_ID → " }, { text:"W_emb", color:W }];
    case "rmsnorm":     return [{ text:"x̂", color:A }, { text:" = " }, { text:"x", color:W }, { text:" / rms(" }, { text:"x", color:W }, { text:") · " }, { text:"γ", color:A }];
    case "layernorm":   return [{ text:"x̂", color:A }, { text:" = (x − μ) / σ · " }, { text:"γ", color:A }, { text:" + " }, { text:"β", color:W }];
    case "q_proj":      return [{ text:"Q", color:Q, style:"bold" }, { text:" = " }, { text:"X", color:A }, { text:" · " }, { text:"Wq", color:Q }];
    case "k_proj":      return [{ text:"K", color:K, style:"bold" }, { text:" = " }, { text:"X", color:A }, { text:" · " }, { text:"Wk", color:K }];
    case "v_proj":      return [{ text:"V", color:V, style:"bold" }, { text:" = " }, { text:"X", color:A }, { text:" · " }, { text:"Wv", color:V }];
    case "rope":        return [{ text:"Q′", color:Q }, { text:", " }, { text:"K′", color:K }, { text:" = Rotate(" }, { text:"Q", color:Q }, { text:", " }, { text:"K", color:K }, { text:", θ)" }];
    case "scores":      return [{ text:"S", color:P }, { text:" = " }, { text:"Q", color:Q }, { text:" · " }, { text:"K", color:K }, { text:"ᵀ" }];
    case "softmax":     return [{ text:"A", color:P }, { text:" = softmax( " }, { text:"S", color:P }, { text:" / √" }, { text:"d_k", color:W }, { text:" + M )" }];
    case "weighted_v":  return [{ text:"C", color:P }, { text:" = " }, { text:"A", color:P }, { text:" · " }, { text:"V", color:V }];
    case "o_proj":      return [{ text:"O", color:P }, { text:" = " }, { text:"C", color:P }, { text:" · " }, { text:"Wo", color:P }];
    case "res_add_attn":return [{ text:"x", color:A }, { text:" = " }, { text:"x", color:W }, { text:" + " }, { text:"Attn", color:Q }];
    case "res_add_mlp": return [{ text:"x", color:A }, { text:" = " }, { text:"x", color:W }, { text:" + " }, { text:"MLP", color:M }];
    case "mlp_gate":    return [{ text:"G", color:M }, { text:" = " }, { text:"X", color:A }, { text:" · " }, { text:"Wg", color:M }];
    case "mlp_up":      return [{ text:"U", color:M }, { text:" = " }, { text:"X", color:A }, { text:" · " }, { text:"Wu", color:M }];
    case "swiglu":      return [{ text:"H", color:M }, { text:" = SiLU(" }, { text:"G", color:M }, { text:") ⊙ " }, { text:"U", color:M }];
    case "mlp_down":    return [{ text:"Y", color:A }, { text:" = " }, { text:"H", color:M }, { text:" · " }, { text:"Wd", color:M }];
    case "lm_head":     return [{ text:"L", color:A }, { text:" = " }, { text:"X", color:W }, { text:" · " }, { text:"W_lm", color:A }];
    default:            return [{ text:"f(x)", color:A }];
  }
}

function EquationRow({ comp }: { comp: InspectableComponent }) {
  const tokens = equationTokens(comp);
  return (
    <Card style={{ padding: "14px 16px" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          gap: "0px",
          fontSize: "20px",
          fontFamily: TOKENS.fontMono,
          letterSpacing: "-0.01em",
          lineHeight: 1.3,
        }}
      >
        {tokens.map((tk, i) => (
          <span
            key={i}
            style={{
              color: tk.color ?? TOKENS.textPrimary,
              fontWeight: tk.style === "bold" ? 700 : 400,
              fontStyle: tk.style === "italic" ? "italic" : "normal",
            }}
          >
            {tk.text}
          </span>
        ))}
      </div>
    </Card>
  );
}

// ─── Data Transformation Flow (Monochrome Cards) ──────────────────────────────
function DataTransformation({ comp }: { comp: InspectableComponent }) {
  const t = comp.formulaType;
  type Step = { label: string; sub?: string; highlight?: boolean };
  let steps: Step[] = [];

  const inp = comp.inputShape.join(" × ");
  const out = comp.outputShape.join(" × ");

  if (t === "q_proj") {
    steps = [
      { label: inp, sub: "Hidden State" },
      { label: `Wq  [${comp.parameterShape?.join(" × ")}]`, sub: "Weight Matrix", highlight: true },
      { label: out, sub: `${comp.headsFormatted}` },
    ];
  } else if (t === "k_proj" || t === "v_proj") {
    steps = [
      { label: inp, sub: "Hidden State" },
      { label: `W  [${comp.parameterShape?.join(" × ")}]`, sub: "GQA Weight Matrix", highlight: true },
      { label: out, sub: comp.headsFormatted ?? "KV Groups" },
    ];
  } else if (t === "o_proj") {
    steps = [
      { label: inp, sub: "Concat Heads" },
      { label: "Wo", sub: "Output Matrix", highlight: true },
      { label: out, sub: "Residual Stream" },
    ];
  } else if (t === "rmsnorm" || t === "layernorm") {
    steps = [
      { label: inp, sub: "Input Vector" },
      { label: "÷ rms(x) · γ", sub: "Scale", highlight: true },
      { label: out, sub: "Normalized" },
    ];
  } else if (t === "softmax") {
    steps = [
      { label: inp, sub: "Raw Scores" },
      { label: "÷ √d_k + Mask", sub: "Scale + Causal Mask", highlight: true },
      { label: "Softmax", sub: "Normalize", highlight: true },
      { label: out, sub: "Probabilities" },
    ];
  } else if (t === "swiglu") {
    steps = [
      { label: inp, sub: "Gate + Up" },
      { label: "SiLU(G) ⊙ U", sub: "Gated Activation", highlight: true },
      { label: out, sub: "Activated" },
    ];
  } else if (t === "rope") {
    steps = [
      { label: inp, sub: "Q, K Heads" },
      { label: "2D Rotation R_θ", sub: "Position Encoding", highlight: true },
      { label: out, sub: "Rotated Q, K" },
    ];
  } else {
    steps = [
      { label: inp, sub: comp.inputDesc.slice(0, 28) },
      ...(comp.parameterShape ? [{ label: "W", sub: "Weight", highlight: true } as Step] : []),
      { label: out, sub: comp.outputDesc.slice(0, 28) },
    ];
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div
            style={{
              padding: "8px 12px",
              background: s.highlight ? TOKENS.surfaceHover : TOKENS.surfaceFlat,
              border: `1px solid ${s.highlight ? TOKENS.borderStrong : TOKENS.border}`,
              borderRadius: TOKENS.radiusMd,
              display: "flex",
              flexDirection: "column",
              gap: "1px",
            }}
          >
            <span
              style={{
                fontFamily: TOKENS.fontMono,
                fontSize: "12px",
                color: TOKENS.textPrimary,
                fontWeight: s.highlight ? 600 : 400,
              }}
            >
              {s.label}
            </span>
            {s.sub && (
              <span style={{ fontSize: "10px", color: TOKENS.textMuted }}>
                {s.sub}
              </span>
            )}
          </div>
          {i < steps.length - 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                color: TOKENS.textMuted,
                fontSize: "12px",
                lineHeight: "18px",
              }}
            >
              ↓
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Key Dimensions Grid ──────────────────────────────────────────────────────
function DimGrid({ comp }: { comp: InspectableComponent }) {
  const cells: { label: string; value: string }[] = [
    { label: "INPUT",  value: comp.inputShape.join(" × ") },
    { label: "OUTPUT", value: comp.outputShape.join(" × ") },
  ];
  if (comp.headsFormatted && comp.headsFormatted !== "N/A") {
    cells.push({ label: "HEADS", value: comp.headsFormatted });
  }
  if (comp.parameterCountExact > 0) {
    cells.push({
      label: "PARAMETERS",
      value: comp.parameterCountExact.toLocaleString(),
    });
  }

  return (
    <MetricGrid columns={2}>
      {cells.map((c) => (
        <Metric key={c.label} label={c.label} value={c.value} />
      ))}
    </MetricGrid>
  );
}

// ─── Follow the Data Breadcrumb (Monochrome Links) ────────────────────────────
function DataFlowBreadcrumb({
  comp,
  onSelect,
}: {
  comp: InspectableComponent;
  onSelect: (id: string) => void;
}) {
  const nodes = comp.dataFlowSequence;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "4px",
        fontSize: "11px",
        fontFamily: TOKENS.fontMono,
      }}
    >
      {nodes.map((n, i) => {
        const isActive = n.id === comp.id;
        return (
          <React.Fragment key={n.id}>
            <button
              onClick={() => onSelect(n.id)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: isActive ? `1px solid ${TOKENS.textPrimary}` : "1px solid transparent",
                padding: "2px 4px",
                color: isActive ? TOKENS.textPrimary : TOKENS.textMuted,
                fontFamily: TOKENS.fontMono,
                fontSize: "11px",
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              {n.label}
            </button>
            {i < nodes.length - 1 && (
              <span style={{ color: TOKENS.textMuted, userSelect: "none" }}>→</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────
export default function ComponentInspectorPanel() {
  const inspectingComponentId = useStore((s) => s.inspectingComponentId);
  const arch3dOpId = useStore((s) => s.arch3dOpId);
  const arch3dLayer = useStore((s) => s.arch3dLayer);
  const exitInspectMode = useStore((s) => s.exitInspectMode);
  const navigateInspectComponent = useStore((s) => s.navigateInspectComponent);
  const selectArch3dOp = useStore((s) => s.selectArch3dOp);
  const arch = useStore((s) => s.arch);
  const data = useStore((s) => s.data);

  const activeId = inspectingComponentId ?? arch3dOpId ?? "op_embed";

  const m = arch?.metadata;
  const meta = useMemo(
    () => ({
      hiddenSize: m?.hidden_size || data?.hidden_size || 896,
      numHeads:   m?.num_heads   || data?.num_heads   || 14,
      kvHeads:    m?.num_kv_heads || 2,
      headDim:    Math.floor((m?.hidden_size || 896) / (m?.num_heads || 14)),
      ffnSize:    m?.ffn_size    || 4864,
      vocabSize:  m?.vocab_size  || 151936,
      totalLayers: m?.num_layers || data?.num_layers || 24,
    }),
    [m, data]
  );

  const comp = useMemo(
    () => getComponentDefinition(activeId, arch3dLayer, meta),
    [activeId, arch3dLayer, meta]
  );

  const archName = m?.name ?? arch?.metadata?.name ?? "Qwen2.5-0.5B";
  const layerStr = comp.layer != null ? `LAYER ${comp.layer}` : "GLOBAL";
  const categoryStr = comp.category.toUpperCase();

  return (
    <Panel style={{ overflowY: "auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px 8px",
          borderBottom: `1px solid ${TOKENS.border}`,
          flexShrink: 0,
          background: TOKENS.bg,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <IconButton icon="‹" onClick={() => navigateInspectComponent(-1)} title="Previous component" />
          <IconButton icon="›" onClick={() => navigateInspectComponent(1)} title="Next component" />
          <span style={{ fontSize: "10px", color: TOKENS.textMuted, letterSpacing: "0.06em" }}>
            {layerStr} · {categoryStr}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {comp.parameterCountExact > 0 && (
            <span style={{ fontSize: "10px", fontFamily: TOKENS.fontMono, color: TOKENS.textMuted }}>
              {comp.parameterCountFormatted} params
            </span>
          )}
          <IconButton icon="✕" onClick={exitInspectMode} title="Close inspector" />
        </div>
      </div>

      {/* Component Title & Subtitle */}
      <Section>
        <h2
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 700,
            color: TOKENS.textPrimary,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          {comp.title}
        </h2>
        <div style={{ fontSize: "12px", color: TOKENS.textSecondary, marginTop: "4px" }}>
          {comp.subtitle}
        </div>
      </Section>

      {/* Purpose */}
      <Section>
        <SectionHeader title="Purpose" />
        <p style={{ margin: 0, fontSize: "12px", color: TOKENS.textSecondary, lineHeight: 1.55 }}>
          {comp.role}
        </p>
      </Section>

      {/* Primary Equation */}
      <Section>
        <SectionHeader title="Equation" />
        <EquationRow comp={comp} />
      </Section>

      {/* 3D Component Preview */}
      <Section>
        <SectionHeader title="Component Preview" />
        <Inspector3DPreview componentId={activeId} />
      </Section>

      {/* Data Transformation */}
      <Section>
        <SectionHeader title="Data Transformation" />
        <DataTransformation comp={comp} />
      </Section>

      {/* Key Dimensions */}
      <Section>
        <SectionHeader title="Key Dimensions" />
        <DimGrid comp={comp} />
      </Section>

      {/* How it works */}
      <Section>
        <SectionHeader title="How It Works" />
        <p style={{ margin: 0, fontSize: "12px", color: TOKENS.textSecondary, lineHeight: 1.6 }}>
          {comp.explanation.technical}
        </p>
      </Section>

      {/* Why it matters */}
      <Section>
        <SectionHeader title="Why It Matters" />
        <p style={{ margin: 0, fontSize: "12px", color: TOKENS.textSecondary, lineHeight: 1.6 }}>
          {comp.explanation.whyItMatters}
        </p>
      </Section>

      {/* Follow the Data */}
      <Section>
        <SectionHeader title="Follow the Data" />
        <DataFlowBreadcrumb
          comp={comp}
          onSelect={(id) => selectArch3dOp(id)}
        />
      </Section>

      {/* Model Data */}
      <Section noBorder>
        <SectionHeader title="Model Data" />
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[
            { k: "Model",     v: archName,                                  mono: false },
            { k: "Layer",     v: comp.layer != null ? `${comp.layer}` : "Global", mono: false },
            { k: "Operation", v: comp.title,                                mono: false },
            comp.tensorPath ? { k: "Tensor", v: comp.tensorPath, mono: true } : null,
            { k: "Shape",     v: comp.inputShape.join(" × ") + " → " + comp.outputShape.join(" × "), mono: true },
            comp.parameterCountExact > 0
              ? { k: "Parameters", v: comp.parameterCountExact.toLocaleString(), mono: true }
              : null,
          ]
            .filter(Boolean)
            .map((row) => (
              <div
                key={row!.k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                  fontSize: "11px",
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: TOKENS.textMuted, flexShrink: 0 }}>{row!.k}</span>
                <span
                  style={{
                    color: TOKENS.textSecondary,
                    fontFamily: row!.mono ? TOKENS.fontMono : TOKENS.fontSans,
                    fontSize: row!.mono ? "10px" : "11px",
                    textAlign: "right",
                    wordBreak: "break-all",
                  }}
                >
                  {row!.v}
                </span>
              </div>
            ))}
        </div>
      </Section>
    </Panel>
  );
}
