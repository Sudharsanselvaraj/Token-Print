// Client-side Hugging Face Hub discovery + capability inspection.
//
// The TokenPrint frontend is a static export (GitHub Pages) with no resident
// backend, so the HF Model Explorer falls back to talking to the Hub itself
// when the Python backend (/api/hf/*) is unreachable. huggingface.co serves
// its public read endpoints with permissive CORS, which makes this possible.
import type {
  CapabilityStatus,
  CuratedModel,
  HFInspectResponse,
  HFModelMeta,
  VRAMEstimate,
} from "./types";

export const HF_HUB_BASE = "https://huggingface.co";

const JSON_OPTS: RequestInit = {
  headers: { Accept: "application/json" },
};

// --------------------------------------------------------------------------- //
// Curated model list (mirror of backend app/config/curated_models.yaml)
// --------------------------------------------------------------------------- //

export const CURATED_MODELS: CuratedModel[] = [
  {
    id: "Qwen/Qwen2.5-0.5B-Instruct",
    family: "qwen",
    recommended: true,
    minimum_memory_gb: 2.0,
    description: "Recommended default lightweight model for local real-time visualization and debugging.",
    capabilities_preview: { attention: true, hidden_states: true, logit_lens: true, ablation: true },
  },
  {
    id: "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
    family: "llama",
    recommended: true,
    minimum_memory_gb: 2.0,
    description: "Open 1.1B Llama architecture model, small enough for local real-time debugging.",
    capabilities_preview: { attention: true, hidden_states: true, logit_lens: true, ablation: true },
  },
  {
    id: "gpt2",
    family: "gpt2",
    recommended: true,
    minimum_memory_gb: 1.0,
    description: "Classic OpenAI GPT-2 model family.",
    capabilities_preview: { attention: true, hidden_states: true, logit_lens: true, ablation: true },
  },
  {
    id: "microsoft/phi-2",
    family: "phi",
    recommended: true,
    minimum_memory_gb: 6.0,
    description: "Lightweight open 2.7B transformer from Microsoft.",
    capabilities_preview: { attention: true, hidden_states: true, logit_lens: true, ablation: true },
  },
];

// --------------------------------------------------------------------------- //
// Search (GET /api/models)
// --------------------------------------------------------------------------- //

interface HubModelItem {
  id?: string;
  modelId?: string;
  author?: string;
  downloads?: number;
  likes?: number;
  tags?: string[];
  pipeline_tag?: string;
  lastModified?: string;
  lastModifiedAt?: string;
  private?: boolean;
}

export async function clientSearchHFModels(query: string, limit = 10): Promise<HFModelMeta[]> {
  const params = new URLSearchParams({
    search: query,
    filter: "text-generation",
    limit: String(Math.max(1, Math.min(Math.trunc(limit), 25))),
  });
  const res = await fetch(`${HF_HUB_BASE}/api/models?${params.toString()}`, JSON_OPTS);
  if (!res.ok) throw new Error(`Hugging Face Hub search failed (HTTP ${res.status})`);
  const data: HubModelItem[] = await res.json();
  return (data ?? [])
    .map((item): HFModelMeta | null => {
      const id = String(item.id ?? item.modelId ?? "");
      if (!id) return null;
      return {
        id,
        author: String(item.author ?? (id.includes("/") ? id.split("/")[0] : "")),
        downloads: Number(item.downloads ?? 0),
        likes: Number(item.likes ?? 0),
        tags: (Array.isArray(item.tags) ? item.tags.map(String) : []).slice(0, 10),
        pipeline_tag: String(item.pipeline_tag ?? ""),
        last_modified: String(item.lastModified ?? item.lastModifiedAt ?? ""),
        private: Boolean(item.private),
      };
    })
    .filter((m): m is HFModelMeta => m !== null);
}

// --------------------------------------------------------------------------- //
// Capability inspection (config.json driven)
// --------------------------------------------------------------------------- //

const MODEL_ID_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}(\/[A-Za-z0-9_][A-Za-z0-9_.-]{0,127})?$/;

const HUB_REASONS: Record<string, { attention: string; hidden: string; logit: string; head: string; layer: string; patch: string }> = {
  qwen: {
    attention: "Native softmax attention weights exposed via output_attentions=True.",
    hidden: "Intermediate residual stream hidden states accessible via output_hidden_states=True.",
    logit: "RMSNorm and lm_head projection supported for logit lens decomposition.",
    head: "Instrumented PyTorch forward hooks support per-head zeroing.",
    layer: "PyTorch layer forward pass bypass enabled.",
    patch: "Residual stream state injection supported.",
  },
  llama: {
    attention: "Native softmax attention weights exposed via output_attentions=True.",
    hidden: "Intermediate residual stream hidden states accessible.",
    logit: "RMSNorm + lm_head projection supported.",
    head: "PyTorch head zeroing supported.",
    layer: "PyTorch layer bypass supported.",
    patch: "Residual stream state injection supported.",
  },
  gpt2: {
    attention: "Native softmax attention weights exposed via output_attentions=True.",
    hidden: "Intermediate hidden states accessible.",
    logit: "LayerNorm + wte unembedding supported.",
    head: "PyTorch head zeroing supported.",
    layer: "Layer bypass supported.",
    patch: "Residual stream state injection supported.",
  },
  mistral: {
    attention: "Native sliding window attention weights exposed.",
    hidden: "Intermediate residual stream states accessible.",
    logit: "RMSNorm + lm_head supported.",
    head: "Attention head zeroing supported.",
    layer: "Layer bypass supported.",
    patch: "Residual stream state injection supported.",
  },
  gemma: {
    attention: "Gemma multi-query attention weights exposed via output_attentions=True.",
    hidden: "Gemma residual stream hidden states accessible.",
    logit: "Gemma RMSNorm + lm_head projection supported.",
    head: "Gemma head zeroing supported.",
    layer: "Gemma layer bypass supported.",
    patch: "Residual stream state injection supported.",
  },
};

interface FamilySpec {
  family: string;
  arch: string;
  defaultCtx: number;
  /** Config keys (in priority order) that carry the context window. */
  ctxKeys?: string[];
}

const SPECIFIC_FAMILIES: FamilySpec[] = [
  { family: "qwen", arch: "Qwen2ForCausalLM", defaultCtx: 32768 },
  { family: "llama", arch: "LlamaForCausalLM", defaultCtx: 4096 },
  { family: "gpt2", arch: "GPT2LMHeadModel", defaultCtx: 1024, ctxKeys: ["n_ctx", "max_position_embeddings"] },
  { family: "mistral", arch: "MistralForCausalLM", defaultCtx: 8192 },
  { family: "gemma", arch: "GemmaForCausalLM", defaultCtx: 8192 },
];

function matchesFamily(config: Record<string, unknown>, family: string): boolean {
  const modelType = String(config.model_type ?? "").toLowerCase();
  const architectures = Array.isArray(config.architectures)
    ? (config.architectures as unknown[]).map((a) => String(a).toLowerCase())
    : [];
  return modelType.includes(family) || architectures.some((a) => a.includes(family));
}

function extractParamCount(config: Record<string, unknown>): number | null {
  if (typeof config.num_parameters === "number" && Number.isFinite(config.num_parameters)) {
    return Math.trunc(config.num_parameters);
  }
  const hiddenSize = (config.hidden_size ?? config.n_embd ?? config.d_model) as number | undefined;
  const numLayers = (config.num_hidden_layers ?? config.n_layer ?? config.num_layers) as number | undefined;
  if (hiddenSize && numLayers) {
    const vocab = (config.vocab_size as number | undefined) ?? 32000;
    return 12 * hiddenSize ** 2 * numLayers + vocab * hiddenSize;
  }
  return null;
}

function estimateVram(config: Record<string, unknown>): VRAMEstimate {
  const paramCount = extractParamCount(config);
  if (paramCount != null) {
    return {
      estimated_vram_gb: Math.round((paramCount * 2 * 1.2) / 1024 ** 3 * 100) / 100,
      estimation_basis: "params × 2 bytes (FP16) + 20% runtime overhead",
      confidence: "approximate",
    };
  }
  return {
    estimated_vram_gb: 2.0,
    estimation_basis: "default fallback estimate",
    confidence: "approximate",
  };
}

interface ComputedCapabilities {
  supports_attention: CapabilityStatus;
  supports_hidden_states: CapabilityStatus;
  supports_logit_lens: CapabilityStatus;
  supports_head_ablation: CapabilityStatus;
  supports_layer_ablation: CapabilityStatus;
  supports_activation_patch: CapabilityStatus;
  max_context_length: number;
  parameter_count: number | null;
  architecture: string;
  vram_estimate: VRAMEstimate | null;
}

function computeModelCapabilities(config: Record<string, unknown>): ComputedCapabilities {
  const paramCount = extractParamCount(config);
  const vram = estimateVram(config);

  for (const spec of SPECIFIC_FAMILIES) {
    if (!matchesFamily(config, spec.family)) continue;
    const reasons = HUB_REASONS[spec.family];
    const ctxFromKeys = spec.ctxKeys
      ? spec.ctxKeys.map((k) => config[k]).find((v) => typeof v === "number")
      : undefined;
    const maxContext =
      ((ctxFromKeys as number | undefined) ??
        (config.max_position_embeddings as number | undefined) ??
        spec.defaultCtx);
    return {
      supports_attention: { supported: true, confidence: "high", reason: reasons.attention },
      supports_hidden_states: { supported: true, confidence: "high", reason: reasons.hidden },
      supports_logit_lens: { supported: true, confidence: "high", reason: reasons.logit },
      supports_head_ablation: { supported: true, confidence: "high", reason: reasons.head },
      supports_layer_ablation: { supported: true, confidence: "high", reason: reasons.layer },
      supports_activation_patch: { supported: true, confidence: "high", reason: reasons.patch },
      max_context_length: maxContext,
      parameter_count: paramCount,
      architecture: spec.arch,
      vram_estimate: vram,
    };
  }

  // Generic fallback for unrecognized causal LM architectures.
  const archName = (Array.isArray(config.architectures) ? String(config.architectures[0]) : "CausalLM") || "CausalLM";
  const maxCtx =
    (config.max_position_embeddings as number | undefined) ??
    (config.n_ctx as number | undefined) ??
    2048;
  return {
    supports_attention: {
      supported: true,
      confidence: "medium",
      reason: `Architecture '${archName}' recognized as Causal LM; attention extraction attempted via output_attentions=True.`,
    },
    supports_hidden_states: {
      supported: true,
      confidence: "medium",
      reason: `Architecture '${archName}' hidden states extracted via output_hidden_states=True.`,
    },
    supports_logit_lens: {
      supported: false,
      confidence: "medium",
      reason: `Logit lens mapping for unknown architecture '${archName}' is not pre-validated.`,
    },
    supports_head_ablation: {
      supported: false,
      confidence: "low",
      reason: `Head layout for unknown architecture '${archName}' is not validated for head zeroing.`,
    },
    supports_layer_ablation: {
      supported: true,
      confidence: "medium",
      reason: "Layer forward pass bypass supported for standard sequential modules.",
    },
    supports_activation_patch: {
      supported: false,
      confidence: "low",
      reason: `Activation patching for unknown architecture '${archName}' is disabled.`,
    },
    max_context_length: maxCtx,
    parameter_count: paramCount,
    architecture: archName,
    vram_estimate: vram,
  };
}

function effectiveFromModel(caps: ComputedCapabilities): {
  compatibility_level: HFInspectResponse["compatibility_level"];
  compatibility_reason: string;
  capabilities: Record<string, CapabilityStatus | VRAMEstimate>;
} {
  const capabilities: Record<string, CapabilityStatus | VRAMEstimate> = {
    supports_attention: caps.supports_attention,
    supports_hidden_states: caps.supports_hidden_states,
    supports_logit_lens: caps.supports_logit_lens,
    supports_head_ablation: caps.supports_head_ablation,
    supports_layer_ablation: caps.supports_layer_ablation,
    supports_activation_patch: caps.supports_activation_patch,
  };
  const supportedCount = [caps.supports_attention, caps.supports_hidden_states, caps.supports_logit_lens, caps.supports_head_ablation].filter(
    (c) => c.supported
  ).length;
  let compatibility_level: HFInspectResponse["compatibility_level"];
  let compatibility_reason: string;
  if (supportedCount === 4) {
    compatibility_level = "High";
    compatibility_reason = "Full native instrumentation available (Attention, Hidden States, Logit Lens, Ablation).";
  } else if (supportedCount >= 2) {
    compatibility_level = "Partial";
    compatibility_reason = "Partial instrumentation available.";
  } else if (supportedCount >= 1) {
    compatibility_level = "Basic";
    compatibility_reason = "Basic inference / limited activation extraction.";
  } else {
    compatibility_level = "Unsupported";
    compatibility_reason = "Model architecture or backend does not support activation extraction.";
  }
  return { compatibility_level, compatibility_reason, capabilities };
}

export async function clientInspectHFModel(modelId: string): Promise<HFInspectResponse> {
  const id = modelId.trim();

  // HF returns HTTP 401 for BOTH gated repos and nonexistent ids when you fetch
  // /raw files, so the status alone can't distinguish them. Explain the failure
  // using the fetched config.json response body rather than the status alone.
  async function describeHubFetchFailure(configRes: Response, gatedFlag: string): Promise<string> {
    let body = "";
    try {
      body = await configRes.text();
    } catch {
      // Body read is best-effort; the hub CORS policy may hide it.
    }
    const restricted = /restricted|access[^.\n]*gated|log\s*in|authenticated/i.test(body);
    if (gatedFlag && gatedFlag !== "false") {
      return `Model '${id}' is gated (${gatedFlag}) — its files require an approved Hugging Face access token, so capabilities cannot be inspected anonymously.`;
    }
    if (configRes.status === 401 || configRes.status === 403) {
      if (restricted) {
        return `Model '${id}' files are access-restricted on Hugging Face (HTTP ${configRes.status}). Log in and accept the gated-repo terms, then retry with an access token.`;
      }
      return `Model '${id}' not found on Hugging Face Hub (HTTP ${configRes.status}). Check the id for typos.`;
    }
    if (configRes.status === 404) {
      return `Model '${id}' not found on Hugging Face Hub (HTTP 404). Check the id for typos.`;
    }
    return `Config for model '${id}' could not be fetched from Hugging Face Hub (HTTP ${configRes.status}).`;
  }

  if (!MODEL_ID_RE.test(id)) {
    throw new Error("Invalid Hugging Face model ID format.");
  }
  const encId = id.split("/").map(encodeURIComponent).join("/");

  // 1. Determine revision from the repo metadata endpoint.
  let revision = "main";
  let gated = "";
  try {
    const metaRes = await fetch(`${HF_HUB_BASE}/api/models/${encId}`, JSON_OPTS);
    if (metaRes.ok) {
      const meta = await metaRes.json();
      revision = String(meta.sha ?? meta.revision ?? "main");
      gated = String(meta.gated ?? "").trim();
    }
  } catch {
    // Rev meta is best-effort; config.json below is authoritative.
  }

  // Metadata declares the repo gated — nothing more to ask for anonymously.
  if (gated && gated !== "false") {
    throw new Error(
      `Model '${id}' is gated (${gated}) — its files require an approved Hugging Face access token, so capabilities cannot be inspected anonymously.`,
    );
  }

  // 2. Fetch config.json raw.
  const configRes = await fetch(`${HF_HUB_BASE}/${encId}/raw/main/config.json`, JSON_OPTS);
  if (!configRes.ok) {
    throw new Error(await describeHubFetchFailure(configRes, gated));
  }
  const config: Record<string, unknown> = await configRes.json();

  // 3. Compute the deterministic capability matrix (client port of
  //    backend app/inference/adapters + capabilities.calculate_effective_*).
  const caps = computeModelCapabilities(config);
  const { compatibility_level, compatibility_reason, capabilities } = effectiveFromModel(caps);
  if (caps.vram_estimate) {
    capabilities.vram_estimate = caps.vram_estimate;
  }

  return {
    model_id: id,
    revision,
    architecture: caps.architecture,
    model_type: String(config.model_type ?? ""),
    parameter_count: caps.parameter_count,
    max_context_length: caps.max_context_length,
    estimated_vram_gb: caps.vram_estimate?.estimated_vram_gb ?? 2.0,
    estimation_basis: caps.vram_estimate?.estimation_basis ?? "",
    compatibility_level,
    compatibility_reason,
    capabilities,
  };
}