import { test, expect } from "@playwright/test";
import {
  getViewCapability,
  getDebuggerToolCapability,
  extractModelCapabilities,
  isCapabilitySupported,
  VIEW_CAPABILITY_REQUIREMENTS,
  DEBUGGER_TOOL_CAPABILITY_REQUIREMENTS,
} from "../../lib/capabilities";
import type { EffectiveCapabilities } from "../../lib/types";

// Unit tests for capability-aware UI controls (DESIGN-02).
// Run: npx playwright test --project=unit

test.describe("isCapabilitySupported", () => {
  test("returns true for undefined or null (permissive default)", () => {
    expect(isCapabilitySupported(undefined)).toBe(true);
    expect(isCapabilitySupported(null)).toBe(true);
  });

  test("handles boolean values", () => {
    expect(isCapabilitySupported(true)).toBe(true);
    expect(isCapabilitySupported(false)).toBe(false);
  });

  test("handles CapabilityStatus objects with supported flag", () => {
    expect(isCapabilitySupported({ supported: true, reason: "OK", confidence: "high" })).toBe(true);
    expect(isCapabilitySupported({ supported: false, reason: "Hooks unavailable", confidence: "low" })).toBe(false);
  });
});

test.describe("getViewCapability — LeftSidebar views", () => {
  test("views without strict requirements are always supported", () => {
    const caps: Partial<EffectiveCapabilities> = {
      supports_attention: { supported: false, reason: "No attention", confidence: "low" },
    };
    expect(getViewCapability("full", caps as EffectiveCapabilities).supported).toBe(true);
    expect(getViewCapability("single_layer", caps as EffectiveCapabilities).supported).toBe(true);
  });

  test("returns supported=true when capabilities are null or omitted", () => {
    expect(getViewCapability("attention_flow", null).supported).toBe(true);
    expect(getViewCapability("logit_lens", undefined).supported).toBe(true);
  });

  test("marks attention_flow unsupported when model lacks attention", () => {
    const caps = {
      supports_attention: { supported: false, reason: "Attention not exposed" },
    };
    const res = getViewCapability("attention_flow", caps as any);
    expect(res.supported).toBe(false);
    expect(res.reason).toBe("Attention not exposed");
    expect(res.capabilityKey).toBe("supports_attention");
  });

  test("marks logit_lens unsupported when model lacks logit lens", () => {
    const caps = {
      supports_logit_lens: { supported: false, reason: "No hidden projection" },
    };
    const res = getViewCapability("logit_lens", caps as any);
    expect(res.supported).toBe(false);
    expect(res.reason).toBe("No hidden projection");
    expect(res.capabilityKey).toBe("supports_logit_lens");
  });

  test("marks residual_stream & activations unsupported when model lacks hidden states", () => {
    const caps = {
      supports_hidden_states: { supported: false, reason: "Hidden states inaccessible" },
    };
    const resResidual = getViewCapability("residual_stream", caps as any);
    const resActivations = getViewCapability("activations", caps as any);

    expect(resResidual.supported).toBe(false);
    expect(resResidual.reason).toBe("Hidden states inaccessible");
    expect(resActivations.supported).toBe(false);
    expect(resActivations.reason).toBe("Hidden states inaccessible");
  });
});

test.describe("getDebuggerToolCapability — DebuggerSidebar tools", () => {
  test("tools without backend dependency requirements are supported", () => {
    const caps = {
      supports_attention: { supported: false, reason: "None" },
    };
    expect(getDebuggerToolCapability("overview", caps as any).supported).toBe(true);
    expect(getDebuggerToolCapability("experiments", caps as any).supported).toBe(true);
    expect(getDebuggerToolCapability("local_checkpoint", caps as any).supported).toBe(true);
  });

  test("marks attention_analysis unsupported when attention is absent", () => {
    const caps = {
      supports_attention: { supported: false, reason: "Attention layer hooks unmounted" },
    };
    const res = getDebuggerToolCapability("attention_analysis", caps as any);
    expect(res.supported).toBe(false);
    expect(res.reason).toBe("Attention layer hooks unmounted");
  });

  test("marks intervention tools unsupported when corresponding hooks are missing", () => {
    const caps = {
      supports_activation_patch: { supported: false, reason: "Causal-only architecture" },
      supports_head_ablation: { supported: false, reason: "Grouped query attention" },
      supports_layer_ablation: { supported: false, reason: "Layer substitution disabled" },
    };

    expect(getDebuggerToolCapability("activation_patching", caps as any).supported).toBe(false);
    expect(getDebuggerToolCapability("head_ablation", caps as any).supported).toBe(false);
    expect(getDebuggerToolCapability("layer_ablation", caps as any).supported).toBe(false);
  });
});

test.describe("extractModelCapabilities", () => {
  test("extracts from data.capabilities", () => {
    const data = { capabilities: { supports_attention: { supported: true } } };
    expect(extractModelCapabilities(data as any, null)).toEqual(data.capabilities);
  });

  test("falls back to arch.capabilities", () => {
    const arch = { capabilities: { supports_logit_lens: { supported: false } } };
    expect(extractModelCapabilities(null, arch as any)).toEqual(arch.capabilities);
  });

  test("falls back to arch.metadata.capabilities", () => {
    const arch = { metadata: { capabilities: { supports_hidden_states: { supported: true } } } };
    expect(extractModelCapabilities(null, arch as any)).toEqual(arch.metadata.capabilities);
  });

  test("returns null if no capability information is present", () => {
    expect(extractModelCapabilities(null, null)).toBeNull();
  });
});
