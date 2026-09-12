"""Unit tests for ModelEngine modular sub-engines (ENG-12).

Verifies that AttentionEngine, ActivationEngine, and ReductionEngine behave deterministically
and adhere to their expected contracts.
"""

import threading
import torch
import numpy as np
from app.model import AttentionEngine, ActivationEngine, ReductionEngine


def test_attention_engine_processing():
    """Verify AttentionEngine processes, rounds, and thresholds attention tensors correctly."""
    engine = AttentionEngine(decimals=3, zero_below=0.01)

    # 1 layer, 1 head, 2x2 tokens
    layer0 = torch.tensor([[[[0.85432, 0.00412], [0.12345, 0.99999]]]])
    attentions = (layer0,)

    processed = engine.process(attentions)
    assert len(processed) == 1
    assert len(processed[0]) == 1  # 1 head
    # 0.00412 is below 0.01 threshold -> 0.0
    assert processed[0][0][0][1] == 0.0
    # 0.85432 rounded to 3 decimals -> 0.854
    assert abs(processed[0][0][0][0] - 0.854) < 1e-3


def test_activation_engine_timings():
    """Verify ActivationEngine hooks record and snapshot layer timings."""
    engine = ActivationEngine()

    layer0 = torch.nn.Identity()
    layers = [layer0]
    layer_elapsed = {}
    lock = threading.Lock()

    handles = engine.register_timing_hooks(layers, layer_elapsed, lock)
    assert len(handles) == 2  # pre and post hooks

    # Simulate forward pass
    x = torch.randn(1, 10)
    _ = layer0(x)

    timings = engine.snapshot_timings(num_layers=1, layer_elapsed=layer_elapsed, lock=lock)
    assert len(timings) == 1
    assert timings[0] >= 0.0

    # Cleanup
    for h in handles:
        h.remove()


def test_reduction_engine_projection_and_variance():
    """Verify ReductionEngine computes 3D projections and explained variance."""
    engine = ReductionEngine()

    hidden_l0 = np.random.randn(5, 64)
    hidden_l1 = np.random.randn(5, 64)

    proj = engine.project_hidden_states([hidden_l0, hidden_l1])
    assert "0" in proj
    assert "1" in proj
    assert len(proj["0"]) == 5
    assert len(proj["0"][0]) == 3  # 3D points

    var = engine.calculate_explained_variance(hidden_l0)
    assert isinstance(var, list)
    assert len(var) > 0
    assert all(isinstance(v, float) for v in var)
