# TokenPrint archive audit — major findings and proposed fixes

## Scope and limitations

I inventoried the uploaded `Token-Print-fresh.zip` (564 regular files across backend, frontend, tests, docs, examples, tooling, fixtures and wiki). I deeply inspected the primary runtime paths—model execution, inference backends, WebSocket generation, trace parsing, the existing backend tests, contributor guidance and verification docs—then ran targeted static and regression checks. This is not a claim that every line of all 564 files received a manual line-by-line audit; a complete browser/model/hardware audit still needs to run on your laptop.

## Confirmed bugs in the uploaded snapshot

### 1. CUDA is not selected automatically

**File:** `backend/app/model.py`, `_pick_device()` (around lines 95–109)

The function returns an explicit `TOKENPRINT_DEVICE` override, then checks MPS, then returns CPU. It never calls `torch.cuda.is_available()`. So a default Windows/NVIDIA setup can fall back to CPU even if CUDA is available. The README documents CUDA as supported.

**Fix in the inference bundle:** choose CUDA first, then MPS, then CPU, while preserving the explicit override. Unit tests mock hardware availability and do not require a GPU.

### 2. Seeded sampling resets global RNG state at each ordinary decoding step

**File:** `backend/app/model.py`, generation loop (around lines 1445–1449 in the source snapshot)

`torch.manual_seed(seed)` runs inside the generation loop. For repeated identical distributions, the first random draw can repeat at each token because the random sequence is reset each time. It also mutates process-global RNG state. The speculative draft branch samples with `torch.multinomial` without using the supplied seed.

**Fix in the inference bundle:** create a CPU `torch.Generator` once per generation request and pass it into both standard sampling and speculative draft sampling. Greedy decoding is unchanged. Tests use a deterministic synthetic model to check repeatability, multiple draws and global RNG isolation.

### 3. Hugging Face backend readiness check accesses an attribute that `ModelEngine` does not define

**File:** `backend/app/inference/backends/hf_local.py`, `health_check()` (around line 80)

The existing method returns `eng.is_loaded or True`. The actual `ModelEngine` implementation has no `is_loaded` property in the uploaded snapshot. The property access can therefore raise `AttributeError`; if an engine does supply a false value, `or True` also incorrectly reports success.

**Fix in the inference bundle:** fail closed if the engine cannot be obtained; prefer a genuine boolean `is_loaded` flag where available; otherwise check the actual model reference used by the current eager-loading `ModelEngine`.

### 4. GGUF backend health check always reports success

**File:** `backend/app/inference/backends/gguf.py`, `health_check()` (around line 71)

The method returns `True` regardless of whether an engine or loaded llama.cpp context exists. This gives monitoring/callers an inaccurate readiness result.

**Fix in the inference bundle:** return false if the engine is missing or no `_llm` context is resident, while honoring an explicit boolean readiness property if a future implementation provides one.

### 5. Trace parser accepts unsupported future versions and malformed container shapes

**File:** `backend/app/trace.py`, `parse_trace()` (around lines 72–88)

The parser rejects versions below 1 but accepts `trace_version=2` despite the parser's contract saying unsupported versions are rejected. It also checks only for existence of `meta`, `frames` and `done` keys; it does not validate their container shapes, individual frame shape/type, or the done-frame type. Python bools also satisfy `isinstance(value, int)`.

**Fix provided separately:** the trace follow-up package restricts the parser to `TRACE_VERSION`, rejects booleans as versions, validates the required containers and validates token/done frame discriminators. Keep this separate from the inference-runtime PR. This parser change does not solve request-body size limits because the server parses the JSON body before invoking the parser.

## Important risks requiring reproduction or separate scope

### WebSocket disconnect/backpressure

**File:** `backend/app/main.py`, around lines 805–866.

A worker thread waits on `run_coroutine_threadsafe(queue.put(frame), loop).result()` with a bounded queue. On a disconnect, the async task sets a stop event and cancels the `asyncio.to_thread` task, but Python cannot forcibly terminate the underlying worker thread. If a producer is already waiting for capacity after the consumer has exited, it may remain blocked. This is a plausible lifecycle issue; reproduce it with a stress test before changing it. It is not included in the primary patch.

### GPU timing semantics

**Files:** `backend/app/model.py`, `backend/app/debug.py`, `frontend/components/ui/TimingReadout.tsx`, `docs/verification.md`.

The docs acknowledge that `perf_counter()` timings around CUDA/MPS hooks are not synchronized device execution timings. The docs refer to this as a known correctness gap (issue #101). Treat it separately: it concerns what the UI claims its measurements mean, and a valid fix needs device-aware profiling or clearly qualified host-side timing—not just label changes without agreeing the semantics.

### Activation-patching label / experiment mismatch

The verification docs identify that `ActivationPatchCompare` shows a logit-lens trajectory while the panel remains titled “Activation Patching” (issue #75). The docs also state that residual-contribution values are PCA-space residual changes, not attention-versus-MLP decomposition. These are known presentation/scientific-semantics gaps, but they are not changed in the inference patch.

### Unknown model-family fallback

`backend/app/model.py`, `_classify_model_type()` around lines 82–92, maps an unrecognized Hugging Face model type to `causal_lm`. This can send an unsupported architecture into the wrong pipeline. It may have been chosen for backward compatibility; change only with explicit compatibility tests and a clear policy for unknown architectures.

## Files in the primary inference-reliability bundle

- `backend/app/model.py`: CUDA auto-selection; request-local seeded sampling across standard and speculative sampling paths.
- `backend/app/inference/backends/hf_local.py`: accurate HF readiness check.
- `backend/app/inference/backends/gguf.py`: accurate GGUF readiness check.
- `backend/tests/test_inference_backend.py`: readiness regression tests.
- `backend/tests/test_model_runtime_regressions.py`: device-selection, sampling reproducibility and global RNG regression tests.

The separate trace follow-up contains:

- `backend/app/trace.py`
- `backend/tests/test_trace.py`

## Verification performed in this sandbox

- Original source plus added regression tests: **8 failed, 5 passed**, reproducing the targeted CUDA-selection, seed/RNG and backend-health failures.
- Updated inference regression and selected existing backend tests: **70 passed**.
- Trace validation follow-up tests: **14 passed**.
- `python -m compileall -q app tests scripts`: passed.
- The new trace parser accepted both the repository's `fixtures/traces/baseline.json` and `frontend/public/demo/hello-world.json` fixtures.
- Unified patches were checked with `git apply --check` against a normalized clean source snapshot; `git diff --check` passed.

**Important limitation:** `transformers` is not installed in this sandbox, and package installation failed due to unavailable network/DNS. To test the model module and synthetic generation loop, the sandbox used a minimal import-only `transformers` stub; no real Hugging Face model was loaded. `tests/test_inference_backend.py` was also run without that stub and passed. Before submitting, run the tests with the repository's actual dependencies on your laptop, then run `backend/scripts/verify_real_data.py` and `backend/scripts/verify_trace.py` after the model is available.

## Assessment guidance

The archive's `GOOD_FIRST_ISSUES.md` says issue #293 is already shipped and its other listed items are proposals, not pre-existing tracked issues. Confirm a suitable open issue and overlapping PRs before submission. The repository's CONTRIBUTING guide says PRs should remain focused and link the issue they close. If the maintainer/assessment contact does not want multiple inference-runtime concerns in one PR, split the changes into separate contributions instead of combining them just to increase the bug count.
