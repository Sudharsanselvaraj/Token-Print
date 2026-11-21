"""Tests for GPU, CUDA, and ZeroGPU error classification."""

from __future__ import annotations

from app.inference.error_classification import is_gpu_or_quota_error


class MockZeroGPUQuotaExceeded(Exception):
    pass


class MockCUDAOutOfMemoryError(RuntimeError):
    pass


def test_classify_zerogpu_quota_exceeded():
    exc = MockZeroGPUQuotaExceeded("You have exceeded your ZeroGPU runs limit")
    should_fallback, category = is_gpu_or_quota_error(exc)
    assert should_fallback is True
    assert category == "ZeroGPUQuotaExceeded"


def test_classify_cuda_oom():
    exc = MockCUDAOutOfMemoryError("CUDA out of memory. Tried to allocate 2.00 GiB")
    should_fallback, category = is_gpu_or_quota_error(exc)
    assert should_fallback is True
    assert category == "CUDAOutOfMemory"


def test_classify_cuda_device_error():
    exc = RuntimeError("CUDA error: device-side assert triggered")
    should_fallback, category = is_gpu_or_quota_error(exc)
    assert should_fallback is True
    assert category == "CUDARuntimeError"


def test_classify_non_gpu_error():
    exc = ValueError("Invalid input token length")
    should_fallback, category = is_gpu_or_quota_error(exc)
    assert should_fallback is False
    assert category == "NotGPUError"


def test_classify_key_error():
    exc = KeyError("missing_layer")
    should_fallback, category = is_gpu_or_quota_error(exc)
    assert should_fallback is False
    assert category == "NotGPUError"
