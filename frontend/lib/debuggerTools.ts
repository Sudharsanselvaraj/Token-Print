// Debugger tool registry. Tools are grouped in the debugger sidebar and their
// selected id drives both the center workspace and the right-hand inspector.

export interface DebuggerTool {
  id: string;
  label: string;
  purpose: string;
}

export interface DebuggerToolGroup {
  label: string;
  tools: DebuggerTool[];
}

export const DEBUGGER_OVERVIEW: DebuggerTool = {
  id: "overview",
  label: "Overview",
  purpose:
    "Full debugger dashboard — every live analysis, intervention, trace and model tool arranged in the workspace, with model state shown in this inspector.",
};

export const DEBUGGER_TOOL_GROUPS: DebuggerToolGroup[] = [
  {
    label: "ANALYSIS",
    tools: [
      { id: "tensor_inspector", label: "Tensor Inspector", purpose: "Inspect tensor names, shapes, dtypes and parameter counts for the loaded model." },
      { id: "attention_analysis", label: "Attention Analysis", purpose: "Real softmax attention matrices per layer and head, with layer stepping." },
      { id: "activation_analysis", label: "Activation Analysis", purpose: "Activation value distributions and layer-level statistics from the live trace." },
      { id: "residual_contributions", label: "Residual Contributions", purpose: "How much each layer changes the residual stream per token." },
      { id: "induction_heads", label: "Induction Heads", purpose: "Detect and inspect induction / copying circuits in early attention layers." },
      { id: "logit_lens", label: "Logit Lens", purpose: "Read the model's developing prediction at every layer for each position." },
    ],
  },
  {
    label: "INTERVENTIONS",
    tools: [
      { id: "activation_patching", label: "Activation Patching", purpose: "Patch activations between source and target positions, then re-run to measure causal effect." },
      { id: "head_ablation", label: "Head Ablation", purpose: "Zero specific attention heads and diff the resulting logit lens against the clean run." },
      { id: "layer_ablation", label: "Layer Ablation", purpose: "Ablate whole layers and measure the change in downstream predictions." },
      { id: "sampling_playground", label: "Sampling Playground", purpose: "Re-weight temperature / top-k / top-p on the real final-token distribution." },
    ],
  },
  {
    label: "TRACE",
    tools: [
      { id: "trace_frames", label: "Trace Frames", purpose: "Step frame-by-frame through the recorded token trace (tokens, positions, cache)." },
      { id: "operation_timeline", label: "Operation Timeline", purpose: "Flame-graph and per-layer op breakdown across the whole forward pass." },
      { id: "token_state", label: "Token State", purpose: "Current token, token id and running generated sequence for the active trace." },
      { id: "kv_cache", label: "KV Cache", purpose: "Key-value cache growth across prefill and decode steps." },
    ],
  },
  {
    label: "MODEL",
    tools: [
      { id: "local_checkpoint", label: "Local Checkpoint", purpose: "Load a local checkpoint / GGUF file and inspect its architecture directly." },
      { id: "gguf_loading", label: "GGUF Load", purpose: "Quantized GGUF backend selection and file loading for generation." },
      { id: "quantization_compare", label: "Quantization Compare", purpose: "Compare quantization schemes and error against the active model." },
    ],
  },
];

export const ALL_DEBUGGER_TOOLS: DebuggerTool[] = [
  DEBUGGER_OVERVIEW,
  ...DEBUGGER_TOOL_GROUPS.flatMap((g) => g.tools),
];

export function getDebuggerTool(id: string): DebuggerTool {
  return ALL_DEBUGGER_TOOLS.find((t) => t.id === id) ?? DEBUGGER_OVERVIEW;
}