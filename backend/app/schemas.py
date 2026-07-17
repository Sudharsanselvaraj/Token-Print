"""Pydantic request/response models for the NeuroScope API.

Phase 1 covers tokens + the full attention tensor. Phase 2 fields
(embeddings_3d, hidden_states_3d, projection) are added additively later.
"""

from __future__ import annotations

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


class ModelInfo(BaseModel):
    model: str
    device: str
    num_layers: int
    num_heads: int
    hidden_size: int
    attn_implementation: str
    max_tokens: int
    ready: bool
