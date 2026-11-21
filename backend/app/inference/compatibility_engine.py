"""Model Compatibility Engine for TokenPrint.

Performs static capability classification and memory estimation from Hugging Face model
metadata and config.json without loading weights.

Implements the four-tier capability classification:
- LEVEL 1 — DISCOVERABLE: Model exists on Hugging Face and metadata can be inspected.
- LEVEL 2 — LOADABLE: Model architecture is compatible with one of TokenPrint's execution backends.
- LEVEL 3 — INSTRUMENTED: TokenPrint can extract internal model tensors (attention, hidden states, logits).
- LEVEL 4 — ADVANCED INTERPRETABILITY: Model supports logit lens, ablation, activation patching, MoE routing.

Evaluates 12 individual capabilities:
1. Tokenization
2. Text generation
3. Logits
4. Hidden states
5. Attention matrices
6. Logit lens
7. Head ablation
8. Layer ablation
9. Activation patching
10. Residual stream
11. MoE routing
12. KV cache
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.inference.capabilities import CapabilityStatus, VRAMEstimate


class CapabilityMatrix(BaseModel):
    """The 12 individual architectural and instrumentation capabilities."""

    supports_tokenization: CapabilityStatus
    supports_text_generation: CapabilityStatus
    supports_logits: CapabilityStatus
    supports_hidden_states: CapabilityStatus
    supports_attention: CapabilityStatus
    supports_logit_lens: CapabilityStatus
    supports_head_ablation: CapabilityStatus
    supports_layer_ablation: CapabilityStatus
    supports_activation_patch: CapabilityStatus
    supports_residual_stream: CapabilityStatus
    supports_moe_routing: CapabilityStatus
    supports_kv_cache: CapabilityStatus


class HardwareFeasibility(BaseModel):
    """Hardware compatibility and resource assessment."""

    zerogpu_feasible: bool = Field(..., description="Whether model can run within ZeroGPU memory and time quotas")
    cpu_feasible: bool = Field(..., description="Whether model can run with acceptable latency on CPU")
    recommended_vram_gb: float = Field(..., description="Recommended minimum VRAM in GB")
    recommended_ram_gb: float = Field(..., description="Recommended minimum host RAM in GB")
    notes: str = ""


class ModelCompatibilityReport(BaseModel):
    """Comprehensive forensic compatibility report for a Hugging Face model."""

    model_id: str
    revision: str = "main"
    architecture: str
    model_type: str
    parameter_count: int | None = None
    max_context_length: int = 2048
    torch_dtype: str | None = None
    quantization: str | None = None
    level_number: Literal[1, 2, 3, 4]
    level_name: Literal["DISCOVERABLE", "LOADABLE", "INSTRUMENTED", "ADVANCED"]
    compatibility_level: Literal["High", "Partial", "Basic", "Unsupported"]
    compatibility_reason: str
    gated: bool | str = False
    private: bool = False
    weight_formats: list[str] = Field(default_factory=list)
    supported_backends: list[str] = Field(default_factory=list)
    vram_estimate: VRAMEstimate
    hardware: HardwareFeasibility
    capabilities: CapabilityMatrix


# Known architectures supported by TokenPrint's PyTorch instrumentation engine
NATIVE_INSTRUMENTED_ARCHS = frozenset(
    {
        "qwen2forcausallm",
        "qwen2moeforcausallm",
        "llamaforcausallm",
        "gpt2lmheadmodel",
        "mistralforcausallm",
        "mixtralforcausallm",
        "gemmaforcausallm",
        "gemma2forcausallm",
        "phiforcausallm",
        "phi3forcausallm",
        "deepseekforcausallm",
        "deepseekv2forcausallm",
        "deepseekv3forcausallm",
    }
)

# Known model types supported by TokenPrint
NATIVE_MODEL_TYPES = frozenset(
    {
        "qwen2",
        "qwen2_moe",
        "llama",
        "gpt2",
        "mistral",
        "mixtral",
        "gemma",
        "gemma2",
        "phi",
        "phi3",
        "deepseek",
        "deepseek_v2",
        "deepseek_v3",
    }
)


def extract_parameter_count(config: dict[str, Any]) -> int | None:
    """Extract or calculate parameter count from model configuration dictionary."""
    if "num_parameters" in config and isinstance(config["num_parameters"], (int, float)):
        return int(config["num_parameters"])

    hidden_size = config.get("hidden_size") or config.get("n_embd") or config.get("d_model")
    num_layers = config.get("num_hidden_layers") or config.get("n_layer") or config.get("num_layers")
    vocab_size = config.get("vocab_size") or 32000

    if isinstance(hidden_size, int) and isinstance(num_layers, int):
        # 12 * h^2 per layer + vocab * h embed/unembed
        layer_params = 12 * (hidden_size**2) * num_layers
        embed_params = vocab_size * hidden_size
        return layer_params + embed_params
    return None


def calculate_vram_estimate(param_count: int | None, dtype: str | None = None) -> VRAMEstimate:
    """Calculate VRAM requirements based on parameter count and dtype."""
    if param_count is not None:
        bytes_per_param = 2.0  # Default to FP16 / BF16
        if dtype and "float32" in dtype.lower():
            bytes_per_param = 4.0
        elif dtype and ("int8" in dtype.lower() or "8bit" in dtype.lower()):
            bytes_per_param = 1.0
        elif dtype and ("int4" in dtype.lower() or "4bit" in dtype.lower()):
            bytes_per_param = 0.55

        # params * bytes + 25% KV cache and activation headroom
        est_gb = round((param_count * bytes_per_param * 1.25) / (1024**3), 2)
        return VRAMEstimate(
            estimated_vram_gb=max(0.5, est_gb),
            estimation_basis=f"params ({param_count:,}) × {bytes_per_param:.1f} bytes + 25% activation overhead",
            confidence="high" if param_count > 0 else "approximate",
        )
    return VRAMEstimate(
        estimated_vram_gb=2.0,
        estimation_basis="Heuristic default fallback estimate (model parameter count unspecified)",
        confidence="approximate",
    )


def evaluate_hardware_feasibility(param_count: int | None, vram_gb: float) -> HardwareFeasibility:
    """Determine whether model can execute within Hugging Face ZeroGPU and local CPU limits."""
    # Free ZeroGPU provides ~16GB usable VRAM with 60s max per execution slice.
    # Models <= 3B params (~3-4GB VRAM) run smoothly without quota timeouts.
    # Models > 7B params (or > 14GB VRAM) frequently risk quota timeouts or OOM on cold start.
    zerogpu_ok = vram_gb <= 14.0
    cpu_ok = param_count is not None and param_count <= 1_500_000_000

    notes_list: list[str] = []
    if zerogpu_ok:
        notes_list.append("ZeroGPU CUDA acceleration supported.")
    else:
        notes_list.append("Exceeds standard Free ZeroGPU 14GB memory limit; requires local dedicated GPU.")

    if cpu_ok:
        notes_list.append("Lightweight enough for local CPU fallback.")
    else:
        notes_list.append("CPU execution not recommended due to high inference latency.")

    return HardwareFeasibility(
        zerogpu_feasible=zerogpu_ok,
        cpu_feasible=cpu_ok,
        recommended_vram_gb=round(vram_gb, 1),
        recommended_ram_gb=round(max(4.0, vram_gb * 1.5), 1),
        notes=" ".join(notes_list),
    )


def evaluate_model_compatibility(
    model_id: str,
    config: dict[str, Any],
    revision: str = "main",
    gated: bool | str = False,
    private: bool = False,
    siblings: list[str] | None = None,
) -> ModelCompatibilityReport:
    """Analyze a model's config dictionary and siblings to generate a deterministic compatibility report."""
    raw_archs = config.get("architectures", [])
    primary_arch = str(raw_archs[0]) if raw_archs else "Unknown"
    norm_arch = primary_arch.lower()
    model_type = str(config.get("model_type", "")).lower()

    param_count = extract_parameter_count(config)
    torch_dtype = str(config.get("torch_dtype", "float16")) if config.get("torch_dtype") else None
    vram = calculate_vram_estimate(param_count, torch_dtype)
    hardware = evaluate_hardware_feasibility(param_count, vram.estimated_vram_gb)

    # Detect weight formats from siblings
    weight_formats: list[str] = []
    if siblings:
        sib_lower = [s.lower() for s in siblings]
        if any(s.endswith(".safetensors") for s in sib_lower):
            weight_formats.append("safetensors")
        if any(s.endswith(".gguf") for s in sib_lower):
            weight_formats.append("gguf")
        if any(s.endswith(".onnx") for s in sib_lower):
            weight_formats.append("onnx")
        if any(s.endswith((".bin", ".pt")) for s in sib_lower):
            weight_formats.append("pytorch_bin")
    if not weight_formats:
        weight_formats.append("safetensors")

    # Detect context length
    max_ctx = (
        config.get("max_position_embeddings")
        or config.get("seq_length")
        or config.get("n_ctx")
        or config.get("max_sequence_length")
        or 2048
    )

    # Check architecture recognition
    is_arch_recognized = norm_arch in NATIVE_INSTRUMENTED_ARCHS or model_type in NATIVE_MODEL_TYPES
    is_causal_lm = "causallm" in norm_arch or "lmhead" in norm_arch or model_type in NATIVE_MODEL_TYPES

    # Detect Mixture of Experts
    has_moe = bool(
        config.get("num_experts")
        or config.get("num_local_experts")
        or "moe" in norm_arch
        or "moe" in model_type
    )

    # Determine supported backends
    supported_backends: list[str] = []
    if is_causal_lm:
        supported_backends.append("pytorch")
        supported_backends.append("transformers")
    if "gguf" in weight_formats:
        supported_backends.append("gguf")
    if "onnx" in weight_formats or (param_count and param_count <= 500_000_000):
        supported_backends.append("onnx")

    # Individual Capability Detection
    # 1. Tokenization: available if model has vocab or tokenizer config
    has_vocab = bool(config.get("vocab_size") or config.get("tokenizer_config"))
    cap_tokenization = CapabilityStatus(
        supported=has_vocab or is_causal_lm,
        confidence="high",
        reason="Hugging Face AutoTokenizer supports vocabulary and chat templates."
        if (has_vocab or is_causal_lm)
        else "No recognized tokenizer specification in configuration.",
    )

    # 2. Text generation: standard causal LM decoding loop
    cap_text_gen = CapabilityStatus(
        supported=is_causal_lm,
        confidence="high",
        reason="Autoregressive next-token sampling supported via CausalLM architecture."
        if is_causal_lm
        else "Model architecture is not an autoregressive causal language model.",
    )

    # 3. Logits: output logit projection
    cap_logits = CapabilityStatus(
        supported=is_causal_lm,
        confidence="high",
        reason="Final lm_head projections produce vocabulary probability distributions."
        if is_causal_lm
        else "lm_head logit projection not available.",
    )

    # 4. Hidden states: output_hidden_states=True
    cap_hidden_states = CapabilityStatus(
        supported=is_arch_recognized,
        confidence="high" if is_arch_recognized else "medium",
        reason="Intermediate residual stream representations accessible via output_hidden_states=True."
        if is_arch_recognized
        else "Hidden state hooks unverified for this unrecognised architecture.",
    )

    # 5. Attention matrices: output_attentions=True
    cap_attention = CapabilityStatus(
        supported=is_arch_recognized,
        confidence="high" if is_arch_recognized else "medium",
        reason="Multi-head attention weights captured natively per layer across all heads."
        if is_arch_recognized
        else "Attention tensor extraction unverified for this architecture.",
    )

    # 6. Logit lens: unembedding residual stream
    cap_logit_lens = CapabilityStatus(
        supported=is_arch_recognized and is_causal_lm,
        confidence="high" if is_arch_recognized else "low",
        reason="Intermediate layers can be normalized and projected through unembedding matrix."
        if is_arch_recognized
        else "Layer normalization and unembedding projection not mapped.",
    )

    # 7. Head ablation: zeroing individual attention heads
    cap_head_ablation = CapabilityStatus(
        supported=is_arch_recognized,
        confidence="high" if is_arch_recognized else "low",
        reason="PyTorch forward pre-hooks support targeted head zeroing and masking."
        if is_arch_recognized
        else "Head masking hooks not implemented for this architecture.",
    )

    # 8. Layer ablation: bypassing transformer blocks
    cap_layer_ablation = CapabilityStatus(
        supported=is_arch_recognized,
        confidence="high" if is_arch_recognized else "low",
        reason="Residual identity bypass enabled for intermediate transformer blocks."
        if is_arch_recognized
        else "Layer bypass hooks not implemented.",
    )

    # 9. Activation patching: injecting residual activations
    cap_activation_patch = CapabilityStatus(
        supported=is_arch_recognized,
        confidence="high" if is_arch_recognized else "low",
        reason="Residual stream tensor replacement supported via PyTorch forward hooks."
        if is_arch_recognized
        else "Activation injection hooks unverified.",
    )

    # 10. Residual stream: 3D trajectory tracking
    cap_residual_stream = CapabilityStatus(
        supported=is_arch_recognized,
        confidence="high",
        reason="Residual stream vectors extractable across all layer depths for 3D trajectory visualization."
        if is_arch_recognized
        else "Residual stream extraction unverified.",
    )

    # 11. MoE routing: router gate logits
    cap_moe_routing = CapabilityStatus(
        supported=has_moe and is_arch_recognized,
        confidence="high",
        reason="Router gate logits captured to inspect top-k expert assignments."
        if has_moe
        else "Dense architecture; no mixture-of-experts routing layers.",
    )

    # 12. KV cache: key-value caching
    cap_kv_cache = CapabilityStatus(
        supported=is_causal_lm,
        confidence="high",
        reason="Past key/value state caching supported for low-latency sequential generation."
        if is_causal_lm
        else "KV caching not applicable.",
    )

    capabilities = CapabilityMatrix(
        supports_tokenization=cap_tokenization,
        supports_text_generation=cap_text_gen,
        supports_logits=cap_logits,
        supports_hidden_states=cap_hidden_states,
        supports_attention=cap_attention,
        supports_logit_lens=cap_logit_lens,
        supports_head_ablation=cap_head_ablation,
        supports_layer_ablation=cap_layer_ablation,
        supports_activation_patch=cap_activation_patch,
        supports_residual_stream=cap_residual_stream,
        supports_moe_routing=cap_moe_routing,
        supports_kv_cache=cap_kv_cache,
    )

    # Compute Classification Level (Levels 1 to 4)
    # Level 4 — ADVANCED: Architecture recognized, supports logit lens, ablation, and patching
    if is_arch_recognized and cap_logit_lens.supported and cap_head_ablation.supported:
        level_number: Literal[1, 2, 3, 4] = 4
        level_name: Literal["DISCOVERABLE", "LOADABLE", "INSTRUMENTED", "ADVANCED"] = "ADVANCED"
        compat_level: Literal["High", "Partial", "Basic", "Unsupported"] = "High"
        reason = "Full native instrumentation and advanced interpretability available (Attention, Residuals, Logit Lens, Ablation, Patching)."
    # Level 3 — INSTRUMENTED: Supports attention and hidden states
    elif is_arch_recognized and cap_attention.supported and cap_hidden_states.supported:
        level_number = 3
        level_name = "INSTRUMENTED"
        compat_level = "Partial"
        reason = "Tensor instrumentation available (Attention and Hidden States extractable)."
    # Level 2 — LOADABLE: Compatible causal LM with weights/tokenizer
    elif is_causal_lm and cap_text_gen.supported:
        level_number = 2
        level_name = "LOADABLE"
        compat_level = "Basic"
        reason = "Causal LM executable on PyTorch/Transformers runtime; internal hooks unverified."
    # Level 1 — DISCOVERABLE: Exists on Hub, metadata inspectable
    else:
        level_number = 1
        level_name = "DISCOVERABLE"
        compat_level = "Unsupported"
        reason = "Model metadata inspectable on Hugging Face Hub; architecture unverified for local execution."

    return ModelCompatibilityReport(
        model_id=model_id,
        revision=revision,
        architecture=primary_arch,
        model_type=model_type or "unknown",
        parameter_count=param_count,
        max_context_length=int(max_ctx),
        torch_dtype=torch_dtype,
        quantization=str(config.get("quantization_config", {}).get("quant_method", "")) or None,
        level_number=level_number,
        level_name=level_name,
        compatibility_level=compat_level,
        compatibility_reason=reason,
        gated=gated,
        private=private,
        weight_formats=weight_formats,
        supported_backends=supported_backends,
        vram_estimate=vram,
        hardware=hardware,
        capabilities=capabilities,
    )
