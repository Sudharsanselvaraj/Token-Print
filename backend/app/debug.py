"""Debug snapshot: capture intermediate outputs from every module during a
forward pass.  Each hook stores its output tensor, keyed by module path."""

from __future__ import annotations

import threading
import time
import typing

if typing.TYPE_CHECKING:
    import torch
    from torch import nn


class DebugCapture:
    """Register forward hooks on every leaf module in a model to capture
    intermediate outputs during one forward pass."""

    def __init__(self, model: nn.Module):
        self._lock = threading.Lock()
        self._handles: list = []
        self._outputs: dict[str, torch.Tensor] = {}
        self._timings: dict[str, float] = {}
        self._register_hooks(model)

    def _register_hooks(self, module: nn.Module, prefix: str = "") -> None:
        for name, child in module.named_children():
            path = f"{prefix}.{name}" if prefix else name
            if list(child.named_children()):
                self._register_hooks(child, path)
            else:
                handle = child.register_forward_hook(
                    lambda mod, _in, out, _p=path: self._capture(_p, out)
                )
                self._handles.append(handle)

    def _capture(self, path: str, output: torch.Tensor) -> None:
        with self._lock:
            self._outputs[path] = output

    def timed_forward(self, model, *args, **kwargs):
        """Run a forward pass through the model, capturing per-module timings."""
        for h in self._handles:
            h.remove()
        self._handles.clear()
        self._outputs.clear()
        self._timings.clear()
        self._register_timed(model)

        t0 = time.perf_counter()
        result = model(*args, **kwargs)
        self._timings["_total"] = time.perf_counter() - t0
        return result

    def _register_timed(self, module: nn.Module, prefix: str = "") -> None:
        for name, child in module.named_children():
            path = f"{prefix}.{name}" if prefix else name
            if list(child.named_children()):
                self._register_timed(child, path)
            else:
                t0 = [0.0]

                def pre_hook(_mod, _in, _p=path, _t0=t0):
                    _t0[0] = time.perf_counter()

                def post_hook(mod, _in, out, _p=path, _t0=t0):
                    elapsed = time.perf_counter() - _t0[0]
                    self._capture(_p, out)
                    with self._lock:
                        self._timings[_p] = elapsed

                handle_pre = child.register_forward_pre_hook(pre_hook)
                handle_post = child.register_forward_hook(post_hook)
                self._handles.append(handle_pre)
                self._handles.append(handle_post)

    def pop_outputs(self) -> dict[str, torch.Tensor]:
        with self._lock:
            out = dict(self._outputs)
            self._outputs.clear()
        return out

    def pop_timings(self) -> dict[str, float]:
        with self._lock:
            t = dict(self._timings)
            self._timings.clear()
        return t

    def remove_hooks(self) -> None:
        for h in self._handles:
            h.remove()
        self._handles.clear()
