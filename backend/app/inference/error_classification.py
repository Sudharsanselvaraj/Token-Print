"""Classification utilities for GPU, CUDA, and ZeroGPU runtime exceptions."""

from __future__ import annotations

import logging

logger = logging.getLogger("tokenprint.inference.error_classification")


def is_gpu_or_quota_error(exc: Exception) -> tuple[bool, str]:
    """Classify an exception to determine whether it is a GPU/quota error that warrants CPU fallback.

    Returns:
        (should_fallback, classification_category)

    Categories:
        - "ZeroGPUQuotaExceeded"
        - "CUDAOutOfMemory"
        - "CUDARuntimeError"
        - "ZeroGPURunnerError"
        - "NotGPUError"
    """
    exc_type = type(exc).__name__
    exc_str = str(exc).lower()
    exc_module = getattr(type(exc), "__module__", "")

    # 1. ZeroGPU Quota exhaustion
    if (
        "zerogpuquotaexceeded" in exc_type.lower()
        or "quota" in exc_str
        or "exceeded your zerogpu" in exc_str
    ):
        return True, "ZeroGPUQuotaExceeded"

    # 2. PyTorch CUDA Out Of Memory
    if (
        "outofmemoryerror" in exc_type.lower()
        or "cuda out of memory" in exc_str
        or ("out of memory" in exc_str and "cuda" in exc_str)
    ):
        return True, "CUDAOutOfMemory"

    # 3. CUDA hardware/driver/kernel runtime failures
    if (
        "cuda" in exc_str
        or "device-side assert" in exc_str
        or "cublas" in exc_str
        or "cudnn" in exc_str
        or "cuda error" in exc_str
    ):
        return True, "CUDARuntimeError"

    # 4. ZeroGPU runner IPC communication or connection errors
    if "spaces" in exc_module or "zerogpu" in exc_module:
        return True, "ZeroGPURunnerError"

    # Not a GPU or compute hardware error (e.g. ValueError, TokenizedTooLong, etc.)
    return False, "NotGPUError"
