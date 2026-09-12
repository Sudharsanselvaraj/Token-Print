"""Expanded Pytest unit test suite for backend execution logic (ENG-06).

Tests cover:
  * PCA 3D dimensionality reduction & bounding (project_3d, explained_variance)
  * RAG attribution reduction, causal scores & ungrounded token detection (chunk_attribution, causal_chunk_scores, ungrounded_flags)
  * Schema edge cases and validation rules (RagAnalyzeRequest, ModelInfo)
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pytest
from app.reduce import (
    WORLD_HALF,
    causal_chunk_scores,
    chunk_attribution,
    explained_variance,
    project_3d,
    query_self_attribution,
    ungrounded_flags,
)
from app.schemas import AnalyzeRequest, ModelInfo, RagAnalyzeRequest, RagChunk


def test_project_3d_standard_shape():
    """Verify PCA projection of standard [N, D] matrices into bounded [-8, 8] 3D box."""
    np.random.seed(42)
    vectors = np.random.randn(10, 64)
    res = project_3d(vectors)

    assert len(res) == 10
    for point in res:
        assert len(point) == 3
        for val in point:
            assert -WORLD_HALF <= val <= WORLD_HALF


def test_project_3d_edge_cases():
    """Verify single-vector and empty inputs handling without throwing PCA exceptions."""
    # Single vector (n=1) returns zero-padded [0.0, 0.0, 0.0]
    single = project_3d([[1.0, 2.0, 3.0, 4.0]])
    assert single == [[0.0, 0.0, 0.0]]

    # Empty inputs
    assert project_3d([]) == []
    assert project_3d([[]]) == [[0.0, 0.0, 0.0]]


def test_explained_variance():
    """Verify explained variance ratio computation for PCA axes."""
    np.random.seed(42)
    vectors = np.random.randn(20, 128)
    ratios = explained_variance(vectors)

    assert len(ratios) == 3
    assert all(r >= 0.0 for r in ratios)
    assert sum(ratios) <= 1.0 + 1e-4

    # Insufficient vectors edge case
    assert explained_variance([[1.0, 2.0]]) == []


def test_chunk_attribution_and_ungrounded_flags():
    """Verify layer-reduction matrix computations and ungrounded token flagging."""
    # Dummy attention tensor: [layers=2, heads=2, from_tokens=4, to_tokens=4]
    attn = [[[[0.25] * 4 for _ in range(4)] for _ in range(2)] for _ in range(2)]

    query_span = (0, 1)
    chunk_spans = {
        "chunk_1": (2, 2),
        "chunk_2": (3, 3),
    }

    result = chunk_attribution(attn, query_span, chunk_spans)
    assert result["chunk_ids"] == ["chunk_1", "chunk_2"]
    assert len(result["all_layers_mean"]) == 2  # 2 query tokens
    assert len(result["last_layer"]) == 2

    query_self = query_self_attribution(attn, query_span, query_span)
    assert len(query_self["all_layers_mean"]) == 2

    # Verify ungrounded flag computation
    flags = ungrounded_flags(
        attribution_rows=result["all_layers_mean"],
        query_self=query_self["all_layers_mean"],
        threshold=0.1,
    )
    assert len(flags) == 2
    assert isinstance(flags[0], bool)


def test_causal_chunk_scores():
    """Verify knockout and restoration causal attribution calculations."""
    patched_probs = {"chunk_1": 0.2, "chunk_2": 0.7}
    knockout = causal_chunk_scores(baseline_prob=0.8, patched_probs=patched_probs, mode="knockout")

    assert "chunk_1" in knockout
    assert knockout["chunk_1"]["patched_prob"] == 0.2
    assert knockout["chunk_1"]["causal_effect"] == 0.6  # 0.8 - 0.2

    restoration = causal_chunk_scores(
        baseline_prob=0.8,
        patched_probs=patched_probs,
        mode="restoration",
        corrupted_prob=0.1,
    )
    assert "chunk_2" in restoration
    assert restoration["chunk_2"]["causal_effect"] == 0.6  # 0.7 - 0.1


def test_schemas_validation():
    """Verify Pydantic model validations for backend request/response payloads."""
    req = AnalyzeRequest(sentence="Hello world")
    assert req.sentence == "Hello world"

    with pytest.raises(ValueError):
        AnalyzeRequest(sentence="")

    rag = RagAnalyzeRequest(
        query="What is TokenPrint?",
        chunks=[RagChunk(id="c1", text="TokenPrint is an LLM debugger.")],
    )
    assert rag.reduction_mode == "both"
    assert rag.ungrounded_threshold == 0.1
