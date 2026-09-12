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
    from torch import nn


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
                def make_layer_hook():
                    def hook(_mod, _in, output):
                        # Safely handle tuple outputs (hidden_states, present_key_value, ...)
                        if isinstance(output, tuple):
                            # Retain input residual state while zeroing the layer's additive contribution
                            return (_in[0] if len(_in) > 0 else output[0] * 0.0,) + output[1:]
                        return output * 0.0
                    return hook
                handle = layer.register_forward_hook(make_layer_hook())
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
                    num_heads = getattr(_mod, "num_heads", None) or getattr(_mod, "num_attention_heads", 8)
                    head_dim = hidden.size(-1) // num_heads
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
    source's states (or ablated / noised).

    Position-Aware Patching (Issue #115):
        Specify ``patch_spans=[(start, end), ...]`` (inclusive 0-indexed token spans)
        to restrict the intervention strictly to specific token positions (e.g.
        retrieved RAG context chunks), preserving the surrounding prompt.

    Modes:
        * ``"replace"`` (default): Injects captured source activations.
        * ``"zero"``: Zeroes out activations at the target positions (knockout).
        * ``"noise"``: Replaces activations at the target positions with Gaussian noise.

    Usage::

        # Position-aware RAG chunk patching
        patch = ActivationPatch(
            model.model,
            patch_layers={8, 12, 16},
            patch_spans=[(14, 28)],  # Token span for Chunk 2
        )
        source_states = patch.capture(model, source_input_ids)
        with patch:
            out = model(**target_inputs)
    """

    def __init__(
        self,
        model: nn.Module,
        patch_layers: set[int] | None = None,
        patch_spans: list[tuple[int, int]] | tuple[int, int] | None = None,
        source_spans: list[tuple[int, int]] | tuple[int, int] | None = None,
        mode: str = "replace",
        noise_std: float = 0.1,
    ):
        self._model = model
        self._patch_layers = patch_layers or set()
        self._handles: list = []
        self._source: dict[int, torch.Tensor] = {}
        self._capture_handles: list = []
        self._mode = mode
        self._noise_std = noise_std
        self.set_patch_spans(patch_spans, source_spans)

    def set_patch_spans(
        self,
        patch_spans: list[tuple[int, int]] | tuple[int, int] | None,
        source_spans: list[tuple[int, int]] | tuple[int, int] | None = None,
    ) -> None:
        """Configure target token spans (inclusive [start, end]) to patch."""
        if patch_spans is None:
            self._patch_spans = None
        elif isinstance(patch_spans, tuple) and len(patch_spans) == 2 and isinstance(patch_spans[0], int):
            self._patch_spans = [patch_spans]
        else:
            self._patch_spans = list(patch_spans)

        if source_spans is None:
            self._source_spans = None
        elif isinstance(source_spans, tuple) and len(source_spans) == 2 and isinstance(source_spans[0], int):
            self._source_spans = [source_spans]
        else:
            self._source_spans = list(source_spans)

    def set_mode(self, mode: str, noise_std: float = 0.1) -> None:
        """Set patch mode: 'replace', 'zero', or 'noise'."""
        self._mode = mode
        self._noise_std = noise_std

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
                if not args:
                    return None
                target = args[0]
                patched = target.clone()

                if self._mode == "zero":
                    if self._patch_spans:
                        for s_start, s_end in self._patch_spans:
                            s = max(0, s_start)
                            e = min(target.shape[1], s_end + 1)
                            if s < e:
                                patched[:, s:e, :] = 0.0
                    else:
                        patched.zero_()
                    return (patched,) + args[1:]

                if self._mode == "noise":
                    import torch

                    if self._patch_spans:
                        for s_start, s_end in self._patch_spans:
                            s = max(0, s_start)
                            e = min(target.shape[1], s_end + 1)
                            if s < e:
                                noise = torch.randn_like(target[:, s:e, :]) * self._noise_std
                                patched[:, s:e, :] = noise
                    else:
                        patched = torch.randn_like(target) * self._noise_std
                    return (patched,) + args[1:]

                # Default mode: "replace" from source activations
                src = self._source.get(i)
                if src is None:
                    return None

                if self._patch_spans:
                    # Position-targeted patching
                    for idx, (tgt_start, tgt_end) in enumerate(self._patch_spans):
                        src_span = (
                            self._source_spans[idx]
                            if (self._source_spans and idx < len(self._source_spans))
                            else (tgt_start, tgt_end)
                        )
                        src_start, src_end = src_span

                        tgt_len = max(0, tgt_end - tgt_start + 1)
                        src_len = max(0, src_end - src_start + 1)
                        patch_len = min(tgt_len, src_len)
                        if patch_len <= 0:
                            continue

                        t_s = max(0, tgt_start)
                        t_e = min(target.shape[1], t_s + patch_len)
                        s_s = max(0, src_start)
                        s_e = min(src.shape[1], s_s + patch_len)

                        actual_len = min(t_e - t_s, s_e - s_s)
                        if actual_len > 0:
                            patched[:, t_s : t_s + actual_len, :] = src[
                                :, s_s : s_s + actual_len, :
                            ].to(target.device, target.dtype)
                else:
                    # Full sequence replacement up to shorter length
                    n = min(src.shape[1], target.shape[1])
                    patched[:, :n, :] = src[:, :n, :].to(target.device, target.dtype)

                return (patched,) + args[1:]

            return hook

        for i in self._patch_layers:
            if 0 <= i < len(layers):
                try:
                    self._handles.append(layers[i].register_forward_pre_hook(make_hook(i), prepend=True))
                except TypeError:
                    self._handles.append(layers[i].register_forward_pre_hook(make_hook(i)))

    def __call__(self, source: dict[int, torch.Tensor] | None = None) -> ActivationPatch:
        if source is not None:
            self._source = source
        return self

    def __enter__(self):
        self._register_patch_hooks()
        return self

    def __exit__(self, *args):
        self.remove()

    def remove(self) -> None:
        for h in self._handles:
            h.remove()
        self._handles.clear()


# Alias for explicit position-aware naming
PositionActivationPatch = ActivationPatch

