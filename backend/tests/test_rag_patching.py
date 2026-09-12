"""Unit tests for position-aware activation patching and causal RAG attribution."""

from __future__ import annotations

import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
import torch
import torch.nn as nn

from app.ablation import ActivationPatch, PositionActivationPatch
from app.reduce import causal_chunk_scores


class DummyLayer(nn.Module):
    """Simple linear layer simulating a transformer layer with residual input."""
    def __init__(self, dim: int = 16):
        super().__init__()
        self.proj = nn.Linear(dim, dim, bias=False)
        nn.init.eye_(self.proj.weight)

    def forward(self, x):
        return x + self.proj(x)


class DummyModel(nn.Module):
    """Simple dummy model containing layers."""
    def __init__(self, num_layers: int = 4, dim: int = 16):
        super().__init__()
        self.layers = nn.ModuleList([DummyLayer(dim) for _ in range(num_layers)])

    def forward(self, input_ids=None, attention_mask=None, position_ids=None, inputs_embeds=None):
        if inputs_embeds is None:
            # Create synthetic embeddings from input_ids
            inputs_embeds = torch.randn(input_ids.shape[0], input_ids.shape[1], 16)
        x = inputs_embeds
        for layer in self.layers:
            x = layer(x)
        return x


def test_activation_patch_initialization():
    model = DummyModel()
    patch = ActivationPatch(model, patch_layers={1, 2}, patch_spans=[(2, 5)])
    assert patch._patch_layers == {1, 2}
    assert patch._patch_spans == [(2, 5)]
    assert patch._mode == "replace"


def test_position_activation_patch_alias():
    assert PositionActivationPatch is ActivationPatch


def test_position_aware_zero_knockout():
    """Verify that mode='zero' only zeroes the designated token span, leaving surrounding tokens intact."""
    dim = 16
    seq_len = 10
    model = DummyModel(num_layers=2, dim=dim)

    input_tensor = torch.ones(1, seq_len, dim)
    patch_span = (3, 6)  # tokens 3, 4, 5, 6 inclusive

    patch = ActivationPatch(
        model,
        patch_layers={1},
        patch_spans=[patch_span],
        mode="zero",
    )

    with patch:
        # Pre-hook on layer 1 intercepts layer input
        # We trace what layer 1 receives by testing forward hook on dummy model
        out = model(inputs_embeds=input_tensor.clone())

    # Test the hook directly on an input tensor
    hooks = []
    layer_inputs = []
    def record_in(_mod, args):
        layer_inputs.append(args[0].clone())

    model.layers[1].register_forward_pre_hook(record_in)

    with patch:
        _ = model(inputs_embeds=input_tensor.clone())

    assert len(layer_inputs) == 1
    intercepted = layer_inputs[0]

    # Tokens 0..2 should be non-zero (unaffected)
    assert not torch.allclose(intercepted[:, 0:3, :], torch.zeros_like(intercepted[:, 0:3, :]))
    # Tokens 3..6 should be exactly zeroed
    assert torch.allclose(intercepted[:, 3:7, :], torch.zeros_like(intercepted[:, 3:7, :]))
    # Tokens 7..9 should be non-zero (unaffected)
    assert not torch.allclose(intercepted[:, 7:10, :], torch.zeros_like(intercepted[:, 7:10, :]))


def test_position_aware_replace_from_source():
    """Verify that mode='replace' injects source activations exclusively into the patch span."""
    dim = 16
    seq_len = 10
    model = DummyModel(num_layers=2, dim=dim)

    # Synthetic source state (all 9s)
    source_states = {
        0: torch.full((1, seq_len, dim), 9.0),
    }

    patch = ActivationPatch(
        model,
        patch_layers={0},
        patch_spans=[(2, 4)],  # tokens 2, 3, 4
        mode="replace",
    )
    patch(source_states)

    target_input = torch.full((1, seq_len, dim), 1.0)
    layer_inputs = []

    def record_in(_mod, args):
        layer_inputs.append(args[0].clone())

    model.layers[0].register_forward_pre_hook(record_in)

    with patch:
        _ = model(inputs_embeds=target_input)

    intercepted = layer_inputs[0]
    # Tokens 0, 1 should remain 1.0
    assert torch.allclose(intercepted[:, 0:2, :], torch.ones(1, 2, dim))
    # Tokens 2..4 should be 9.0 (from source)
    assert torch.allclose(intercepted[:, 2:5, :], torch.full((1, 3, dim), 9.0))
    # Tokens 5..9 should remain 1.0
    assert torch.allclose(intercepted[:, 5:10, :], torch.ones(1, 5, dim))


def test_causal_chunk_scores_knockout():
    """Test causal attribution scoring in knockout mode."""
    baseline = 0.85
    patched = {
        "chunk_1": 0.83,  # distractor (negligible drop)
        "chunk_2": 0.15,  # ground truth (large drop)
        "chunk_3": 0.84,  # distractor (negligible drop)
    }

    scores = causal_chunk_scores(baseline, patched, mode="knockout")

    assert scores["chunk_2"]["causal_effect"] == pytest.approx(0.70, abs=1e-4)
    assert scores["chunk_1"]["causal_effect"] == pytest.approx(0.02, abs=1e-4)
    assert scores["chunk_3"]["causal_effect"] == pytest.approx(0.01, abs=1e-4)

    # Chunk 2 has dominant relative effect
    assert scores["chunk_2"]["relative_effect"] > scores["chunk_1"]["relative_effect"]
    assert scores["chunk_2"]["relative_effect"] > scores["chunk_3"]["relative_effect"]


def test_causal_chunk_scores_restoration():
    """Test causal attribution scoring in restoration mode."""
    clean_baseline = 0.85
    corrupted_baseline = 0.05
    patched = {
        "chunk_1": 0.06,  # distractor (no recovery)
        "chunk_2": 0.77,  # ground truth (strong recovery)
        "chunk_3": 0.05,  # distractor (no recovery)
    }

    scores = causal_chunk_scores(
        clean_baseline,
        patched,
        mode="restoration",
        corrupted_prob=corrupted_baseline,
    )

    # Recovery effect = (patched - corrupted)
    assert scores["chunk_2"]["causal_effect"] == pytest.approx(0.72, abs=1e-4)
    assert scores["chunk_1"]["causal_effect"] == pytest.approx(0.01, abs=1e-4)
    assert scores["chunk_3"]["causal_effect"] == pytest.approx(0.00, abs=1e-4)

    # Relative recovery = 0.72 / (0.85 - 0.05) = 0.90
    assert scores["chunk_2"]["relative_effect"] == pytest.approx(0.90, abs=1e-2)
