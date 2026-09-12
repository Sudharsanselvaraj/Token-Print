"""Unit tests for whole-layer ablation residual connection semantics (ENG-03).

Tests cover:
  * Whole-layer zero ablation preserving residual input pass-through (_in[0])
  * Single tensor and tuple output handling
  * Attention head zeroing hook behavior
"""

import sys
from pathlib import Path
from unittest import mock

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Pre-mock heavy native deps before importing app.ablation
_HEAVY_MODS = [
    "torch", "torch.nn", "torch.nn.functional", "transformers", "sklearn", "sklearn.decomposition", "llama_cpp"
]
for _mod in _HEAVY_MODS:
    if _mod not in sys.modules:
        sys.modules[_mod] = mock.MagicMock()

from app.ablation import Ablation


class DummySubLayer(mock.MagicMock):
    """Mock sublayer for testing attention head ablation hooks."""
    def __init__(self, num_heads=4):
        super().__init__()
        self.num_heads = num_heads
        self._hooks = []

    def register_forward_hook(self, hook):
        self._hooks.append(hook)
        handle = mock.MagicMock()
        handle.remove = lambda: self._hooks.remove(hook) if hook in self._hooks else None
        return handle


class DummyLayerModule(mock.MagicMock):
    """Mock transformer block layer for testing layer ablation hooks."""
    def __init__(self, layer_idx=0):
        super().__init__()
        self.layer_idx = layer_idx
        self.self_attn = DummySubLayer(num_heads=4)
        self._hooks = []

    def register_forward_hook(self, hook):
        self._hooks.append(hook)
        handle = mock.MagicMock()
        handle.remove = lambda: self._hooks.remove(hook) if hook in self._hooks else None
        return handle

    def run_hook(self, in_tensor, out_tensor):
        result = out_tensor
        for h in self._hooks:
            res = h(self, (in_tensor,), out_tensor)
            if res is not None:
                result = res
        return result


class DummyTransformerModel(mock.MagicMock):
    """Mock transformer model with layers attribute."""
    def __init__(self, num_layers=3):
        super().__init__()
        self.layers = [DummyLayerModule(i) for i in range(num_layers)]


def test_whole_layer_ablation_preserves_residual_stream():
    """Verify layer ablation returns residual input tensor rather than zeroing it completely."""
    model = DummyTransformerModel(num_layers=3)
    ablation = Ablation(model, zero_layers={1})

    res_input = mock.MagicMock(name="residual_stream_input")
    layer_output = mock.MagicMock(name="layer_output_delta")

    # Single tensor output test
    out = model.layers[1].run_hook(res_input, layer_output)
    assert out == res_input  # Preserves residual input

    # Tuple output test (hidden_states, present_kv)
    kv_cache = mock.MagicMock(name="present_kv_cache")
    tuple_out = model.layers[1].run_hook(res_input, (layer_output, kv_cache))
    assert tuple_out[0] == res_input
    assert tuple_out[1] == kv_cache

    ablation.remove()


def test_unablated_layer_returns_original_output():
    """Verify layers not in zero_layers are untouched."""
    model = DummyTransformerModel(num_layers=3)
    ablation = Ablation(model, zero_layers={1})

    res_input = mock.MagicMock()
    layer_output = mock.MagicMock()

    # Layer 0 is not ablated
    out = model.layers[0].run_hook(res_input, layer_output)
    assert out == layer_output

    ablation.remove()
