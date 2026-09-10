"""Ablation + activation-patching hooks.

Ablation zeroes out specific attention heads or entire layers during a
forward pass by registering forward hooks that mask the output.

Activation patching (issue #75) is the classic mechanistic-interpretability
move: run a "source" prompt forward, capture the residual stream entering
each chosen layer, then run the "target" prompt forward while injecting those
captured states at the same layers. Layers AFTER the patched one then process
the source's activations, which lets you ask "if this layer saw the other
prompt's state, does the output flip?"
"""

from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    import torch
    import torch.nn as nn


class Ablation:
    """Apply ablation masks to a model during a single forward pass.

    Usage::

        ablation = Ablation(model, zero_heads={"0": [0, 1]}, zero_layers={2, 4})
        with ablation:
            outputs = model(**inputs)
    """

    def __init__(
        self,
        model: nn.Module,
        zero_heads: dict[str, list[int]] | None = None,
        zero_layers: set[int] | None = None,
    ):
        self._handles: list = []
        self._zero_heads = zero_heads or {}
        self._zero_layers = zero_layers or set()
        self._register(model)

    def _register(self, model: nn.Module) -> None:
        """Register forward hooks on each layer's self-attention output."""
        # For Qwen2/Llama: model.layers[i].self_attn
        layers = getattr(model, "layers", None)
        if layers is None:
            # Fallback: find layers by iterating named children
            for name, child in model.named_children():
                if "layer" in name.lower():
                    layers = child
                    break
        if layers is None:
            return

        for i, layer in enumerate(layers):
            if i in self._zero_layers:
                handle = layer.register_forward_hook(
                    lambda _mod, _in, out: out * 0.0
                )
                self._handles.append(handle)
                continue

            attn = getattr(layer, "self_attn", None)
            if attn is None:
                continue

            heads_to_zero = self._zero_heads.get(str(i), [])
            if not heads_to_zero:
                continue

            def make_hook(heads: list[int]):
                def hook(_mod, _in, output):
                    # output is either a tuple (attn_output, ...) or a single tensor
                    if isinstance(output, tuple):
                        hidden = output[0]
                    else:
                        hidden = output
                    # hidden: [batch, seq, hidden_dim]
                    head_dim = hidden.size(-1) // (
                        _mod.num_heads if hasattr(_mod, "num_heads") else 8
                    )
                    for h in heads:
                        start = h * head_dim
                        end = (h + 1) * head_dim
                        hidden[:, :, start:end] = 0.0
                    if isinstance(output, tuple):
                        return (hidden,) + output[1:]
                    return hidden
                return hook

            handle = attn.register_forward_hook(make_hook(heads_to_zero))
            self._handles.append(handle)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.remove()

    def remove(self) -> None:
        for h in self._handles:
            h.remove()
        self._handles.clear()


class ActivationPatch:
    """Patch hidden states from a source forward pass into a target forward pass.

    Run ``capture`` once with the source prompt to record the residual stream
    entering each patch layer, then run the target forward pass with the patch
    hooks registered: layer inputs at ``patch_layers`` are replaced by the
    source's states (position-wise, truncated to the shorter sequence).

    Usage::

        patch = ActivationPatch(model.model, patch_layers={8, 12})
        source = patch.capture(model, source_input_ids)
        with patch(source):
            out = model(**target_inputs)
    """

    def __init__(self, model: nn.Module, patch_layers: set[int] | None = None):
        self._model = model
        self._patch_layers = patch_layers or set()
        self._handles: list = []
        self._source: dict[int, torch.Tensor] = {}
        self._capture_handles: list = []

    # --- Source capture --------------------------------------------------- #
    def capture(
        self,
        model,
        input_ids,
        *,
        attention_mask=None,
        position_ids=None,
    ) -> dict[int, torch.Tensor]:
        """Run one forward pass on the source and return {layer: residual input}."""
        layers = getattr(self._model, "layers", None)
        if layers is None:
            return {}

        self._source.clear()
        self._remove_capture_hooks()
        captures: dict[int, torch.Tensor] = {}

        def make_capture(i: int):
            def hook(_mod, args):
                if args:
                    captures[i] = args[0].detach().clone().float().cpu()
            return hook

        for i in self._patch_layers:
            if 0 <= i < len(layers):
                h = layers[i].register_forward_pre_hook(make_capture(i))
                self._capture_handles.append(h)

        try:
            self._model(input_ids=input_ids, attention_mask=attention_mask, position_ids=position_ids)
        finally:
            self._remove_capture_hooks()

        self._source = captures
        return captures

    def _remove_capture_hooks(self) -> None:
        for h in self._capture_handles:
            h.remove()
        self._capture_handles.clear()

    # --- Patch hooks ------------------------------------------------------ #
    def _register_patch_hooks(self) -> None:
        layers = getattr(self._model, "layers", None)
        if layers is None:
            return

        def make_hook(i: int):
            def hook(_mod, args):
                src = self._source.get(i)
                if src is None or not args:
                    return None
                target = args[0]
                n = min(src.shape[1], target.shape[1])
                patched = target.clone()
                patched[:, :n, :] = src[:, :n, :].to(target.device, target.dtype)
                return (patched,) + args[1:]
            return hook

        for i in self._patch_layers:
            if 0 <= i < len(layers):
                self._handles.append(layers[i].register_forward_pre_hook(make_hook(i)))

    def __enter__(self):
        self._register_patch_hooks()
        return self

    def __exit__(self, *args):
        self.remove()

    def remove(self) -> None:
        for h in self._handles:
            h.remove()
        self._handles.clear()
