# TokenPrint inference reliability fixes

These are complete replacement files for the exact repository paths listed below. The change bundle targets three related inference-runtime correctness problems found in the uploaded `Token-Print-fresh.zip` snapshot:

1. Automatic device selection does not check CUDA before falling back to MPS/CPU.
2. Sampling calls `torch.manual_seed(seed)` on every decode iteration, which reuses the same start of the random sequence, mutates global RNG state, and leaves speculative draft sampling outside the request's seed.
3. Both inference backend health checks can report or attempt readiness inaccurately: the HF backend reads `eng.is_loaded`, which the repository's `ModelEngine` does not define; the GGUF backend returns `True` unconditionally even without a loaded context.

## Complete replacement files

- `backend/app/model.py`
- `backend/app/inference/backends/hf_local.py`
- `backend/app/inference/backends/gguf.py`
- `backend/tests/test_inference_backend.py`
- `backend/tests/test_model_runtime_regressions.py` (new)

The archive preserves the full contents of every replacement file, not just snippets. `INFERENCE_FIXES.patch` contains the corresponding unified diff for review/application from the repository root.

## Validation performed in the authoring sandbox

- Targeted regression and existing backend tests: **70 passed**.
- Original source plus regression tests: **8 failed, 5 passed**, exposing the device, seed/RNG and health-check failures.
- `python -m compileall -q app tests scripts`: passed.

Important limitation: `transformers` is not installed in the authoring sandbox and package installation failed because external package access was unavailable. To execute the targeted tests here, an import-only `transformers` stub was used; no actual Hugging Face model was loaded. The generation tests use a synthetic PyTorch model and do exercise the modified sampling loop. Before submitting the PR, install the project's declared dependencies on your laptop and rerun the commands below.

## Verify on Windows

From the repository root, after copying the replacement files or applying the patch:

```powershell
cd backend
python -m pytest -q tests/test_model_runtime_regressions.py tests/test_inference_backend.py
python -m pytest -q tests/test_generation_seed.py tests/test_api_smoke.py tests/test_api.py tests/test_schemas.py tests/test_speculative_kv_cache.py tests/test_model_sub_engines.py tests/test_moe_routing.py
python -m compileall -q app tests scripts
```

Run project real-model verification once dependencies and the model are available:

```powershell
python scripts/verify_real_data.py
python scripts/verify_trace.py
```

The first three fixes should be reviewed as one proposed inference-reliability contribution only if there is an appropriate issue or the maintainer agrees with the combined scope. Do not claim the upstream PR is complete until the dependency-backed checks run and the patch is pushed and opened against the original repository.
