"use client";

import type { CSSProperties, ReactNode } from "react";
import { useStore } from "@/lib/store";
import { getDebuggerTool } from "@/lib/debuggerTools";
import { fmtShape } from "@/lib/format";
import { roleLabel } from "@/lib/tensorName";
import { phaseInfo } from "@/lib/playback";
import { AttentionMatrixWidget } from "./AttentionMatrixWidget";
import { LogitLensWidget } from "./LogitLensWidget";
import { TOKENS } from "./primitives";

function SpecRows({ rows }: { rows: { label: string; value: string | number }[] }) {
  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    padding: "4px 0",
    fontFamily: TOKENS.fontMono,
    fontSize: "10.5px",
    borderBottom: `1px solid ${TOKENS.border}`,
  };
  const keyStyle = { color: TOKENS.textMuted, fontSize: "9px", letterSpacing: "0.08em" };
  const valStyle: CSSProperties = {
    color: TOKENS.textPrimary,
    textAlign: "right",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "150px",
  };
  return (
    <div>
      {rows.map((r) => (
        <div key={r.label} style={rowStyle}>
          <span style={keyStyle}>{r.label}</span>
          <span style={valStyle}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        marginTop: "8px",
        fontSize: "10.5px",
        lineHeight: 1.5,
        color: TOKENS.textSecondary,
      }}
    >
      {children}
    </div>
  );
}

function Overview() {
  const arch = useStore((s) => s.arch);
  const data = useStore((s) => s.data);
  const archLoading = useStore((s) => s.archLoading);
  const archError = useStore((s) => s.archError);
  const genStatus = useStore((s) => s.genStatus);
  const genFrames = useStore((s) => s.genFrames);
  const playIndex = useStore((s) => s.playIndex);
  const opIndex = useStore((s) => s.opIndex);
  const debuggerTool = useStore((s) => s.debuggerTool);

  const m = arch?.metadata;
  const modelName = m?.name || data?.model || "—";
  const numLayers: string | number = m?.num_layers ?? data?.num_layers ?? "—";
  const backend = data?.provenance?.backend || "hf_local";
  const frame = genFrames[playIndex >= 0 ? playIndex : genFrames.length - 1];
  const phase = phaseInfo(frame, data?.tokens?.length ?? 0, false);

  return (
    <div className="rp-section">
      <div className="rp-section-header">
        <span className="rp-section-title">MODEL STATE</span>
      </div>
      <SpecRows
        rows={[
          { label: "MODEL", value: modelName },
          { label: "ARCH", value: archLoading ? "loading…" : archError ? "failed" : arch ? "loaded" : "idle" },
          { label: "LAYERS", value: numLayers },
          { label: "TENSORS", value: arch?.tensors?.length ?? "—" },
          { label: "BACKEND", value: backend },
          { label: "GEN STATUS", value: genStatus },
          { label: "TRACE STEPS", value: genFrames.length },
          { label: "ACTIVE OP", value: opIndex + 1 },
          { label: "PHASE", value: phase?.label ?? "—" },
        ]}
      />
      <Note>
        Debugger tools are docked in the workspace dashboard. Pick a tool in the sidebar
        to focus this inspector on it. Active tool:{" "}
        <b style={{ color: TOKENS.textPrimary }}>{getDebuggerTool(debuggerTool).label}</b>.
      </Note>
    </div>
  );
}

function TensorInspectorView() {
  const arch = useStore((s) => s.arch);
  const data = useStore((s) => s.data);
  const selName = useStore((s) => s.selectedTensor);
  const hovName = useStore((s) => s.hoveredTensor);
  const arch3dOpId = useStore((s) => s.arch3dOpId);

  const targetName = selName || hovName;
  const t = targetName ? arch?.tensors.find((x) => x.name === targetName) : null;
  const backend = data?.provenance?.backend || "hf_local";
  const quantized = t && !/^(F32|F16|BF16|float)/i.test(t.dtype);

  if (!t) {
    return (
      <div className="rp-section">
        <div className="rp-section-header"><span className="rp-section-title">TENSOR INSPECTOR</span></div>
        <div className="rp-empty">
          Select any tensor or 3D operation node in the scene to inspect its properties.
        </div>
      </div>
    );
  }

  const opRow = (
    <SpecRows
      rows={[
        { label: "TENSOR", value: t.name },
        { label: "SHAPE", value: fmtShape(t.shape) },
        { label: "DTYPE", value: t.dtype },
        { label: "LAYER", value: t.layer ?? "Global" },
        { label: "ROLE", value: roleLabel(t.role) },
        { label: "BACKEND", value: backend },
      ]}
    />
  );
  return (
    <div className="rp-section op-context-box">
      <div className="op-ctx-header">
        <span className="op-ctx-title">{t.name}</span>
        <span className="op-ctx-formula">{roleLabel(t.role)}</span>
      </div>
      {opRow}
      <Note>
        {quantized
          ? `Quantized (${t.dtype}) — values require dequantization before inspection.`
          : "Float tensor — real values inspectable."}
        {arch3dOpId ? ` Also operating from 3D node ${arch3dOpId}.` : ""}
      </Note>
    </div>
  );
}

function AttentionView() {
  const data = useStore((s) => s.data);
  const arch = useStore((s) => s.arch);
  const selectedLayer = useStore((s) => s.selectedLayer);
  const selectedHead = useStore((s) => s.selectedHead);
  const selectedTokenIndex = useStore((s) => s.selectedTokenIndex);

  const m = arch?.metadata;
  const numHeads = m?.num_heads || data?.num_heads || 14;
  const headDim = m?.head_dim || (m?.hidden_size ? Math.floor((m?.hidden_size ?? 896) / numHeads) : 64);
  const tokens = data?.tokens || [];
  const token = tokens[selectedTokenIndex];

  return (
    <div className="rp-section op-context-box">
      <div className="op-ctx-header">
        <span className="op-ctx-title">Attention Analysis</span>
        <span className="op-ctx-formula">QKᵀ</span>
      </div>
      <SpecRows
        rows={[
          { label: "HEADS", value: numHeads },
          { label: "HEAD DIM", value: headDim },
          { label: "SELECTED LAYER", value: `L${selectedLayer}` },
          { label: "SELECTED HEAD", value: selectedHead },
          { label: "SELECTED TOKEN", value: token ? `“${token.text}” (#${token.id})` : "—" },
        ]}
      />
      <div style={{ marginTop: "10px" }}>
        <AttentionMatrixWidget />
      </div>
      <Note>
        Scans real softmax attention matrices for the selected layer and head in the 3D
        scene. Step layers in the sidebar or click a layer in the model.
      </Note>
    </div>
  );
}

function ActivationView() {
  const arch = useStore((s) => s.arch);
  const data = useStore((s) => s.data);
  const selectedLayer = useStore((s) => s.selectedLayer);
  const frame = useStore((s) => s.playIndex >= 0 ? s.genFrames[s.playIndex] : null);

  const m = arch?.metadata;
  const layers = m?.num_layers ?? data?.num_layers ?? 24;
  const stats = frame?.layer_stats?.length ? frame.layer_stats : null;
  const mean = stats?.[selectedLayer];

  return (
    <div className="rp-section op-context-box">
      <div className="op-ctx-header">
        <span className="op-ctx-title">Activation Analysis</span>
        <span className="op-ctx-formula">|a|</span>
      </div>
      <SpecRows
        rows={[
          { label: "LAYERS", value: layers },
          { label: "SELECTED LAYER", value: `L${selectedLayer}` },
          {
            label: "MEAN |ACTIVATION|",
            value: stats ? (mean !== undefined ? mean.toFixed(4) : "—") : "—",
          },
          {
            label: "STATS SOURCE",
            value: stats ? "live forward hooks" : "idle",
          },
        ]}
      />
      <Note>
        Per-layer activation statistics stream in from real forward-pass hooks during
        generation. Concentrate the camera on a layer in the scene to inspect its
        activation profile.
      </Note>
    </div>
  );
}

function ResidualView() {
  return (
    <ToolShell title="Residual Contributions" formula="Σ Δ">
      <SpecRows
        rows={[
          { label: "SOURCE", value: "residual stream (input)" },
          { label: "TARGET", value: "post-layer residual add" },
          { label: "FIELD", value: "per-layer Δ per token" },
        ]}
      />
      <Note>
        Measures how much each layer changes the residual stream per token. Run a
        generation or replay a trace, then select a token and layer in the scene.
      </Note>
    </ToolShell>
  );
}

function InductionView() {
  return (
    <ToolShell title="Induction Heads" formula="copy">
      <Note>
        Detects induction / copying circuits in early attention layers — heads that
        attend back to the token that follows a previously-seen token. Select a layer in
        the scene to scan its heads.
      </Note>
    </ToolShell>
  );
}

function LogitLensView() {
  const data = useStore((s) => s.data);
  const selectedLayer = useStore((s) => s.selectedLayer);
  const selectedTokenIndex = useStore((s) => s.selectedTokenIndex);
  const tokens = data?.tokens || [];
  const token = tokens[selectedTokenIndex];

  return (
    <div className="rp-section op-context-box">
      <div className="op-ctx-header">
        <span className="op-ctx-title">Logit Lens</span>
        <span className="op-ctx-formula">logits(L)</span>
      </div>
      <SpecRows
        rows={[
          { label: "LAYER", value: `L${selectedLayer}` },
          { label: "TOKEN", value: token ? `“${token.text}” (#${token.id})` : "—" },
          { label: "TOKEN ID", value: token?.id ?? "—" },
        ]}
      />
      <div style={{ marginTop: "10px" }}>
        <LogitLensWidget />
      </div>
      <Note>
        Reads the model's developing prediction at every layer via the unembed head.
        Prediction layer is L{selectedLayer} — change it in the 3D scene or the sidebar.
      </Note>
    </div>
  );
}

function PatchingView() {
  const data = useStore((s) => s.data);
  const arch = useStore((s) => s.arch);
  const selectedLayer = useStore((s) => s.selectedLayer);
  const selectedTokenIndex = useStore((s) => s.selectedTokenIndex);
  const m = arch?.metadata;
  const hidden = m?.hidden_size || data?.hidden_size || 896;
  const seq = data?.tokens?.length ?? 5;
  const tokens = data?.tokens || [];
  const token = tokens[selectedTokenIndex];

  return (
    <div className="rp-section op-context-box">
      <div className="op-ctx-header">
        <span className="op-ctx-title">Activation Patching</span>
        <span className="op-ctx-formula">patch(a→b)</span>
      </div>
      <SpecRows
        rows={[
          { label: "SOURCE", value: `residual @ ${selectedTokenIndex} → L${selectedLayer}` },
          { label: "TARGET TOKEN", value: token ? `“${token.text}” (#${token.id})` : "—" },
          { label: "TARGET OP", value: `L${selectedLayer} residual add` },
          { label: "TENSOR", value: `[1, ${hidden}, ${seq}]` },
          { label: "RESULT", value: "—" },
        ]}
      />
      <Note>
        Patches activations between source and target positions, then re-runs the model
        to measure the causal effect on the target token. Select source/target tokens as
        any two positions in the scene; the affected 3D path is highlighted.
      </Note>
    </div>
  );
}

function AblationView({ kind }: { kind: "head" | "layer" }) {
  const data = useStore((s) => s.data);
  const selectedLayer = useStore((s) => s.selectedLayer);
  const selectedHead = useStore((s) => s.selectedHead);
  const arch = useStore((s) => s.arch);
  const m = arch?.metadata;
  const numHeads = m?.num_heads || data?.num_heads || 14;

  return (
    <div className="rp-section op-context-box">
      <div className="op-ctx-header">
        <span className="op-ctx-title">{kind === "head" ? "Head Ablation" : "Layer Ablation"}</span>
        <span className="op-ctx-formula">{kind === "head" ? "zero head" : "zero layer"}</span>
      </div>
      <SpecRows
        rows={
          kind === "head"
            ? [
                { label: "HEAD", value: `L${selectedLayer}·H${selectedHead}` },
                { label: "TOTAL HEADS", value: numHeads },
                { label: "STATUS", value: "not applied" },
              ]
            : [
                { label: "LAYER", value: `L${selectedLayer}` },
                { label: "STATUS", value: "not applied" },
              ]
        }
      />
      <Note>
        {kind === "head"
          ? "Zeroes the selected attention head and diffs the resulting logit lens against the clean run. The affected head is highlighted in the scene."
          : "Ablates the whole layer and measures the change in downstream predictions. The affected layer is highlighted in the scene."}
      </Note>
    </div>
  );
}

function SamplingView() {
  return (
    <ToolShell title="Sampling Playground" formula="T · top-k · p">
      <Note>
        Re-weights temperature / top-k / top-p on the real final-token distribution. Run a
        generation, then tune the sampling knobs against the live token distribution.
      </Note>
    </ToolShell>
  );
}

function TraceView() {
  const genStatus = useStore((s) => s.genStatus);
  const genFrames = useStore((s) => s.genFrames);
  const playIndex = useStore((s) => s.playIndex);

  return (
    <ToolShell title="Trace Frames" formula="step">
      <SpecRows
        rows={[
          { label: "STATUS", value: genStatus },
          { label: "FRAMES", value: genFrames.length },
          { label: "PLAYHEAD", value: playIndex + 1 },
        ]}
      />
      <Note>
        Steps frame-by-frame through the recorded token trace (tokens, positions, KV
        cache). Use the bottom-track playback controls; each step advances the 3D scene.
      </Note>
    </ToolShell>
  );
}

function TimelineView() {
  const genMeta = useStore((s) => s.genMeta);
  const opIndex = useStore((s) => s.opIndex);
  const opCount = genMeta?.op_catalog?.length ?? 0;

  return (
    <ToolShell title="Operation Timeline" formula="t(L, op)">
      <SpecRows
        rows={[
          { label: "OP CATALOG", value: opCount },
          { label: "ACTIVE OP", value: opIndex + 1 },
          { label: "SOURCE", value: opCount ? "op trace" : "—" },
        ]}
      />
      <Note>
        Per-layer operation breakdown across the whole forward pass. The active
        operation is highlighted in the 3D scene and steps with playback.
      </Note>
    </ToolShell>
  );
}

function TokenStateView() {
  const genFrames = useStore((s) => s.genFrames);
  const playIndex = useStore((s) => s.playIndex);
  const frame = genFrames[playIndex >= 0 ? playIndex : genFrames.length - 1];

  return (
    <ToolShell title="Token State" formula="tok">
      <SpecRows
        rows={[
          { label: "CURRENT", value: frame?.chosen.text ?? "—" },
          { label: "TOKEN ID", value: frame?.chosen.id ?? "—" },
          { label: "LOGPROB", value: frame?.chosen.logprob?.toFixed(3) ?? "—" },
          { label: "STEP", value: frame?.step ?? "—" },
        ]}
      />
      <Note>
        The current token, token id and log-probability for the active trace position.
      </Note>
    </ToolShell>
  );
}

function KvCacheView() {
  const genFrames = useStore((s) => s.genFrames);
  const playIndex = useStore((s) => s.playIndex);
  const frame = genFrames[playIndex >= 0 ? playIndex : genFrames.length - 1];

  return (
    <ToolShell title="KV Cache" formula="K/V">
      <SpecRows
        rows={[
          { label: "CACHE LEN", value: frame?.cache_len ?? "—" },
          { label: "N POSITIONS", value: frame?.n_positions ?? "—" },
          { label: "PHASE", value: frame?.phase ?? "—" },
        ]}
      />
      <Note>
        Key-value cache growth across prefill and decode. The cache volume is rendered
        in the 3D scene near the model.
      </Note>
    </ToolShell>
  );
}

function CheckpointTool() {
  return (
    <ToolShell title="Local Checkpoint" formula=".safetensors">
      <Note>
        Loads a local checkpoint / GGUF file and inspects its architecture directly in
        the scene. See the MODEL SOURCE section of the explorer sidebar for loading.
      </Note>
    </ToolShell>
  );
}

function GgufTool() {
  return (
    <ToolShell title="GGUF Load" formula="q4_k_m">
      <Note>
        Quantized GGUF backend selection for generation. Once loaded, generation frames
        carry a llama.cpp source label and quant tag.
      </Note>
    </ToolShell>
  );
}

function QuantTool() {
  return (
    <ToolShell title="Quantization Compare" formula="err">
      <Note>
        Compares quantization schemes and their error against the active model. Run a
        GGUF-backed generation first to populate a baseline.
      </Note>
    </ToolShell>
  );
}

function ToolShell({ title, formula, children }: { title: string; formula: string; children: ReactNode }) {
  return (
    <div className="rp-section op-context-box">
      <div className="op-ctx-header">
        <span className="op-ctx-title">{title}</span>
        <span className="op-ctx-formula">{formula}</span>
      </div>
      {children}
    </div>
  );
}

const TOOL_VIEWS: Record<string, () => ReactNode> = {
  tensor_inspector: TensorInspectorView,
  attention_analysis: AttentionView,
  activation_analysis: ActivationView,
  residual_contributions: ResidualView,
  induction_heads: InductionView,
  logit_lens: LogitLensView,
  activation_patching: PatchingView,
  head_ablation: () => <AblationView kind="head" />,
  layer_ablation: () => <AblationView kind="layer" />,
  sampling_playground: SamplingView,
  trace_frames: TraceView,
  operation_timeline: TimelineView,
  token_state: TokenStateView,
  kv_cache: KvCacheView,
  local_checkpoint: CheckpointTool,
  gguf_loading: GgufTool,
  quantization_compare: QuantTool,
};

export default function DebuggerInspector() {
  const debuggerTool = useStore((s) => s.debuggerTool);
  const View = TOOL_VIEWS[debuggerTool] ?? Overview;

  return (
    <aside className="rightpanel rp-inspector">
      <div className="rp-header">
        <span className="rp-header-title">DEBUGGER</span>
        <span style={{ fontFamily: TOKENS.fontMono, fontSize: "10px", color: TOKENS.textMuted }}>
          {debuggerTool}
        </span>
      </div>
      {debuggerTool === "overview" ? <Overview /> : <View />}
    </aside>
  );
}