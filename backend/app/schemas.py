"""Pydantic request/response models for the NeuroScope API.

Phase 1 covers tokens + the full attention tensor. Phase 2 fields
(embeddings_3d, hidden_states_3d, projection) are added additively later.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
# Requests
# --------------------------------------------------------------------------- #
class AnalyzeRequest(BaseModel):
    sentence: str = Field(
        ...,
        description="The raw sentence to run a single forward pass on.",
        min_length=1,
    )


class RagChunk(BaseModel):
    id: str = Field(..., description="Caller-provided chunk identifier.")
    text: str = Field(..., description="Retrieved chunk text.", min_length=1)


class RagAnalyzeRequest(BaseModel):
    query: str = Field(..., description="User query to attribute against chunks.", min_length=1)
    chunks: list[RagChunk] = Field(
        ...,
        min_length=1,
        description="Retrieved chunks paired with stable IDs.",
    )
    reduction_mode: Literal["all_layers_mean", "last_layer", "both"] = Field(
        default="both",
        description=(
            "Layer reduction mode for attribution. 'both' returns all-layers and "
            "last-layer reductions; `attribution` defaults to all-layers."
        ),
    )
    ungrounded_threshold: float = Field(
        default=0.1,
        ge=0.0,
        le=1.0,
        description=(
            "Ungrounded flag threshold. A query token is flagged if its max chunk "
            "attribution is below this threshold and below its query-self attribution."
        ),
    )


# --------------------------------------------------------------------------- #
# Ablation (v0.5)
# --------------------------------------------------------------------------- #
class AblateRequest(BaseModel):
    sentence: str = Field(..., min_length=1)
    zero_heads: dict[str, list[int]] = Field(
        default_factory=dict,
        description='Map of layer_index -> list of head indices to zero, e.g. {"0": [0, 1]}',
    )
    zero_layers: list[int] = Field(
        default_factory=list,
        description="List of layer indices to zero entirely.",
    )


class PatchRequest(BaseModel):
    """Activation patching (issue #75): replace target layers' residual stream
    with a source prompt's captured states."""

    sentence: str = Field(
        ..., min_length=1, description="Target sentence to run with patched states."
    )
    source_sentence: str = Field(
        ..., min_length=1, description="Source sentence whose hidden states are patched in."
    )
    patch_layers: list[int] = Field(
        ...,
        min_length=1,
        description="Layer indices whose residual input is replaced by the source's.",
    )


# --------------------------------------------------------------------------- #
# Response building blocks
# --------------------------------------------------------------------------- #
class Token(BaseModel):
    index: int = Field(..., description="Position of the token in the sequence.")
    text: str = Field(..., description="Human-readable decoded token text.")
    piece: str = Field(..., description="Raw tokenizer piece (byte-level BPE).")
    id: int = Field(..., description="Vocabulary id of the token.")
    is_special: bool = Field(
        ..., description="True for special/control tokens (BOS, EOS, role markers)."
    )


class Projection(BaseModel):
    method: str
    note: str
    embedding_explained_variance: list[float] = []


class AnalyzeResponse(BaseModel):
    sentence: str
    model: str = Field(..., description="HF model id that produced this data.")
    device: str = Field(..., description="Device the forward pass ran on (mps/cpu).")
    num_layers: int
    num_heads: int
    hidden_size: int

    tokens: list[Token]

    # attention[layer][head][from_token][to_token] — real softmax attention
    # weights from the forward pass, rounded to 3 decimals with sub-0.01 values
    # zeroed to keep the payload small. Rows still ~sum to 1.
    attention: list[list[list[list[float]]]]

    # --- Phase 2: geometry (PCA projections of real hidden states) --------- #
    # Each is [token_index] -> [x, y, z]; token order matches `tokens`.
    embeddings_3d: list[list[float]] = []
    # layer index (as string "0".."num_layers") -> [token][x,y,z]
    hidden_states_3d: dict[str, list[list[float]]] = {}
    # L2 norm of each token's raw embedding vector.
    embedding_norms: list[float] = []
    projection: Projection | None = None

    # --- Phase 4: logit lens (v0.3) --------------------------------------- #
    # Per-layer top-5 decoded tokens after unembedding projection.
    # Index 0 = embedding output; index L = after layer L.
    # Each entry: [layer_index] -> [{text, token_id, prob}, ...] (top 5)
    logit_lens: list[list[list[dict]]] = []


class RagAnalyzeResponse(AnalyzeResponse):
    query: str
    chunk_spans: dict[str, list[int]] = Field(
        default_factory=dict,
        description="Token spans per chunk id: {chunk_id: [start_token, end_token]}.",
    )
    query_span: list[int] = Field(
        default_factory=list,
        description="Token span for the query inside the composed RAG prompt.",
    )
    attribution_chunk_ids: list[str] = Field(
        default_factory=list,
        description="Column order for attribution matrices.",
    )
    attribution: list[list[float]] = Field(
        default_factory=list,
        description=(
            "Per-query-token per-chunk attribution matrix shaped "
            "[query_token][chunk_id] using all-layer mean."
        ),
    )
    attribution_all_layers_mean: list[list[float]] = Field(default_factory=list)
    attribution_last_layer: list[list[float]] = Field(default_factory=list)
    query_self_attribution: list[float] = Field(
        default_factory=list,
        description="Attention mass from each query token back to query-token span.",
    )
    ungrounded: list[bool] = Field(
        default_factory=list,
        description="Ungrounded flag per query token.",
    )


class ModelInfo(BaseModel):
    model: str
    device: str
    num_layers: int
    num_heads: int
    hidden_size: int
    attn_implementation: str
    max_tokens: int
    ready: bool
