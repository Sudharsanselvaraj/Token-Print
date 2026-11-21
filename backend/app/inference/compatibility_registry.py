"""Model Compatibility Registry for TokenPrint.

Maintains explicit verification matrices across architectures and candidate checkpoints:
- architecture_recognized: Architecture config recognized by adapter system
- model_load_tested: Weights and tokenizer successfully loaded in memory
- forward_pass_tested: Generates valid logits on input sentences
- attention_extraction_tested: Returns multi-head attention weights per layer
- full_interpretability_tested: Supports logit lens, ablation, and activation patching
- hf_space_deployment_verified: Confirmed running on Hugging Face Spaces (ZeroGPU / CPU fallback)
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ModelVerificationRecord(BaseModel):
    """Forensic verification record for a specific model checkpoint or architecture."""

    model_id: str = Field(..., description="Hugging Face model repository ID or identifier")
    family: str = Field(..., description="Model architectural family (e.g. qwen, gpt2, llama)")
    architecture_recognized: bool = Field(..., description="Architecture recognised by adapter system")
    model_load_tested: bool = Field(..., description="Model weights and tokenizer loaded cleanly")
    forward_pass_tested: bool = Field(..., description="Standard forward pass completed successfully")
    attention_extraction_tested: bool = Field(..., description="Extracted attention matrices from all layers")
    full_interpretability_tested: bool = Field(..., description="Logit lens, ablation, and patching verified")
    hf_space_deployment_verified: bool = Field(..., description="Verified operating inside Hugging Face Spaces")
    status: Literal["fully_operational", "partially_supported", "unsupported", "experimental"] = Field(
        ..., description="Overall deployment and verification classification"
    )
    supported_features: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    notes: str = ""


# Canonical Model Compatibility Registry
MODEL_COMPATIBILITY_REGISTRY: dict[str, ModelVerificationRecord] = {
    "Qwen/Qwen2.5-0.5B-Instruct": ModelVerificationRecord(
        model_id="Qwen/Qwen2.5-0.5B-Instruct",
        family="qwen",
        architecture_recognized=True,
        model_load_tested=True,
        forward_pass_tested=True,
        attention_extraction_tested=True,
        full_interpretability_tested=True,
        hf_space_deployment_verified=True,
        status="fully_operational",
        supported_features=[
            "attention_matrix_24_layers",
            "residual_stream_trajectory",
            "logit_lens",
            "head_ablation",
            "activation_patching",
            "zerogpu_cuda_acceleration",
            "cpu_fallback",
            "streaming_websockets",
        ],
        limitations=[
            "ZeroGPU cold starts may take ~25s",
            "Subject to Hugging Face Free ZeroGPU quota limits per IP",
        ],
        notes="Primary verified production model actively deployed on Hugging Face Spaces.",
    ),
    "gpt2": ModelVerificationRecord(
        model_id="gpt2",
        family="gpt2",
        architecture_recognized=True,
        model_load_tested=True,
        forward_pass_tested=True,
        attention_extraction_tested=True,
        full_interpretability_tested=True,
        hf_space_deployment_verified=True,
        status="fully_operational",
        supported_features=[
            "attention_matrix_12_layers",
            "residual_stream_trajectory",
            "logit_lens",
            "head_ablation",
            "activation_patching",
            "cpu_inference",
        ],
        limitations=[
            "Standard GPT-2 architecture does not use RoPE or GQA",
        ],
        notes="Fully tested and verified classical autoregressive candidate.",
    ),
    "TinyLlama/TinyLlama-1.1B-Chat-v1.0": ModelVerificationRecord(
        model_id="TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        family="llama",
        architecture_recognized=True,
        model_load_tested=True,
        forward_pass_tested=True,
        attention_extraction_tested=True,
        full_interpretability_tested=True,
        hf_space_deployment_verified=True,
        status="fully_operational",
        supported_features=[
            "attention_matrix_22_layers",
            "residual_stream_trajectory",
            "logit_lens",
            "head_ablation",
            "activation_patching",
            "rope_rotary_embeddings",
        ],
        limitations=[
            "Requires ~2.2 GB VRAM; tight on minimal CPU free tier instances",
        ],
        notes="Verified Llama-architecture candidate for lightweight deployments.",
    ),
    "mistralai/Mistral-7B-v0.1": ModelVerificationRecord(
        model_id="mistralai/Mistral-7B-v0.1",
        family="mistral",
        architecture_recognized=True,
        model_load_tested=False,
        forward_pass_tested=False,
        attention_extraction_tested=False,
        full_interpretability_tested=False,
        hf_space_deployment_verified=False,
        status="unsupported",
        supported_features=["architecture_definition"],
        limitations=[
            "Exceeds free ZeroGPU 16GB VRAM allocation without 4-bit quantization",
            "Not verified on Hugging Face Space free tier",
        ],
        notes="Architecture recognized by adapter, but not verified on current zero-a10g space.",
    ),
    "deepseek-ai/DeepSeek-V3": ModelVerificationRecord(
        model_id="deepseek-ai/DeepSeek-V3",
        family="deepseek",
        architecture_recognized=True,
        model_load_tested=False,
        forward_pass_tested=False,
        attention_extraction_tested=False,
        full_interpretability_tested=False,
        hf_space_deployment_verified=False,
        status="unsupported",
        supported_features=["architecture_definition"],
        limitations=[
            "Massive MoE model (671B); cannot run on single GPU node",
            "Requires distributed multi-node cluster",
        ],
        notes="Architecture defined for schema compatibility only; cannot be loaded locally.",
    ),
    "google/gemma-2-2b": ModelVerificationRecord(
        model_id="google/gemma-2-2b",
        family="gemma",
        architecture_recognized=True,
        model_load_tested=False,
        forward_pass_tested=False,
        attention_extraction_tested=False,
        full_interpretability_tested=False,
        hf_space_deployment_verified=False,
        status="partially_supported",
        supported_features=["architecture_definition", "gemma_adapter"],
        limitations=[
            "Gemma 2 requires sliding window attention masking and custom logit soft-capping",
            "Requires user authentication token for gated model access",
        ],
        notes="Gated model family; requires HF_TOKEN.",
    ),
}


def get_model_verification(model_id: str) -> ModelVerificationRecord | None:
    """Retrieve compatibility verification record for a given model ID."""
    return MODEL_COMPATIBILITY_REGISTRY.get(model_id)


def list_compatibility_records() -> list[ModelVerificationRecord]:
    """Return all registered model verification records."""
    return list(MODEL_COMPATIBILITY_REGISTRY.values())
