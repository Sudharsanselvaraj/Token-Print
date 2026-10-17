import type { CapabilityStatus, EffectiveCapabilities, GraphViewMode } from "./types";

/**
 * View-to-capability requirement mapping for TokenPrint architecture views.
 */
export const VIEW_CAPABILITY_REQUIREMENTS: Partial<Record<GraphViewMode, keyof EffectiveCapabilities>> = {
  attention_flow: "supports_attention",
  residual_stream: "supports_hidden_states",
  logit_lens: "supports_logit_lens",
  activations: "supports_hidden_states",
};

/**
 * Debugger tool-to-capability requirement mapping.
 */
export const DEBUGGER_TOOL_CAPABILITY_REQUIREMENTS: Record<string, keyof EffectiveCapabilities> = {
  attention_analysis: "supports_attention",
  activation_analysis: "supports_hidden_states",
  residual_contributions: "supports_hidden_states",
  induction_heads: "supports_attention",
  logit_lens: "supports_logit_lens",
  activation_patching: "supports_activation_patch",
  head_ablation: "supports_head_ablation",
  layer_ablation: "supports_layer_ablation",
};

/**
 * Default fallback reasons when a capability status object lacks an explanatory reason.
 */
export const DEFAULT_CAPABILITY_REASONS: Record<string, string> = {
  supports_attention: "Attention weights extraction is not supported by this model architecture.",
  supports_hidden_states: "Hidden state representations are not accessible for this model.",
  supports_logit_lens: "Logit lens projection is not available for this model architecture.",
  supports_head_ablation: "Attention head ablation is not supported for this model.",
  supports_layer_ablation: "Layer ablation is not supported for this model.",
  supports_activation_patch: "Activation patching hooks are not supported for this model.",
};

export interface ViewCapabilityCheckResult {
  supported: boolean;
  reason?: string;
  capabilityKey?: string;
  confidence?: "high" | "medium" | "low" | "approximate";
}

/**
 * Evaluates whether a specific capability value (boolean or CapabilityStatus) is supported.
 * Returns true if the capability is undefined/null (permissive default for uninstrumented traces).
 */
export function isCapabilitySupported(
  capabilityValue: CapabilityStatus | boolean | unknown
): boolean {
  if (capabilityValue === null || capabilityValue === undefined) {
    return true;
  }
  if (typeof capabilityValue === "boolean") {
    return capabilityValue;
  }
  if (
    typeof capabilityValue === "object" &&
    capabilityValue !== null &&
    "supported" in capabilityValue
  ) {
    return Boolean((capabilityValue as { supported?: boolean }).supported);
  }
  return true;
}

/**
 * Resolves the capability status for a specific graph view mode based on the current model's capabilities.
 */
export function getViewCapability(
  viewMode: GraphViewMode,
  capabilities?: EffectiveCapabilities | Record<string, any> | null
): ViewCapabilityCheckResult {
  const reqKey = VIEW_CAPABILITY_REQUIREMENTS[viewMode];
  if (!reqKey || !capabilities) {
    return { supported: true };
  }

  const rawCap = (capabilities as Record<string, any>)[reqKey];
  if (rawCap === undefined || rawCap === null) {
    return { supported: true, capabilityKey: reqKey };
  }

  const supported = isCapabilitySupported(rawCap);
  if (supported) {
    return {
      supported: true,
      capabilityKey: reqKey,
      confidence: typeof rawCap === "object" ? rawCap?.confidence : undefined,
    };
  }

  const reason =
    (typeof rawCap === "object" && rawCap?.reason) ||
    DEFAULT_CAPABILITY_REASONS[reqKey] ||
    "Not supported by this model architecture";

  return {
    supported: false,
    reason,
    capabilityKey: reqKey,
    confidence: typeof rawCap === "object" ? rawCap?.confidence : undefined,
  };
}

/**
 * Resolves the capability status for a specific debugger tool based on the current model's capabilities.
 */
export function getDebuggerToolCapability(
  toolId: string,
  capabilities?: EffectiveCapabilities | Record<string, any> | null
): ViewCapabilityCheckResult {
  const reqKey = DEBUGGER_TOOL_CAPABILITY_REQUIREMENTS[toolId];
  if (!reqKey || !capabilities) {
    return { supported: true };
  }

  const rawCap = (capabilities as Record<string, any>)[reqKey];
  if (rawCap === undefined || rawCap === null) {
    return { supported: true, capabilityKey: reqKey };
  }

  const supported = isCapabilitySupported(rawCap);
  if (supported) {
    return {
      supported: true,
      capabilityKey: reqKey,
      confidence: typeof rawCap === "object" ? rawCap?.confidence : undefined,
    };
  }

  const reason =
    (typeof rawCap === "object" && rawCap?.reason) ||
    DEFAULT_CAPABILITY_REASONS[reqKey] ||
    "Not supported by this model architecture";

  return {
    supported: false,
    reason,
    capabilityKey: reqKey,
    confidence: typeof rawCap === "object" ? rawCap?.confidence : undefined,
  };
}

/**
 * Safely extracts effective capabilities from either trace data or architecture state.
 */
export function extractModelCapabilities(
  data?: { capabilities?: EffectiveCapabilities | Record<string, any> | null } | null,
  arch?: Record<string, any> | null
): EffectiveCapabilities | Record<string, any> | null {
  if (data?.capabilities) return data.capabilities;
  if (!arch) return null;
  const a = arch as Record<string, any>;
  return a.capabilities || a.metadata?.capabilities || null;
}
