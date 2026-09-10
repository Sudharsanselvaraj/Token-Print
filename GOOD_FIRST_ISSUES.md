# TokenPrint Open Contributor Issues & Feature Roadmap

Welcome! TokenPrint is an open-source visual debugger for LLM execution built with **FastAPI**, **PyTorch**, **Next.js**, and **React Three Fiber**.

This manual contains detailed, ready-to-pick issue specs for contributors of all skill levels. Pick any issue below, fork the repo, and open a Pull Request!

---

## Quick Reference Table

| Issue ID | Title | Priority | Category | Domain | Difficulty |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **DOC-04** | Update GGUF setup & optional dependencies | P1 | Documentation | Python / Packaging | 🟢 Easy |
| **DOC-05** | Document GGUF dequantization limitations | P1 | Documentation | Markdown / Frontend | 🟢 Easy |
| **DOC-06** | Fix stale `trace_client.py` endpoints | P1 | Tooling / Script | Python | 🟢 Easy |
| **DOC-07** | Clarify Attention Mass vs Causal Attribution | P1 | Documentation | Interpretability Docs | 🟢 Easy |
| **DESIGN-02** | Add capability-aware UI controls | P1 | UX / Frontend | React / TS | 🟢 Easy |
| **DESIGN-03** | Improve empty & unsupported panel states | P1 | UX / Frontend | React / CSS | 🟢 Easy |
| **ENG-16** | Finish debugger breakpoint (`B` key) controls | P1 | UX / Feature | React / Store | 🟢 Easy |
| **ENG-17** | Deterministic visual randomness in pointcloud | P2 | Rendering | Three.js / WebGL | 🟢 Easy |
| **ENG-06** | Add pytest unit test suite for backend | P0 | Testing | PyTorch / FastAPI | 🟡 Intermediate |
| **ENG-07** | Add Vitest frontend unit test suite | P1 | Testing | Next.js / TypeScript | 🟡 Intermediate |
| **ENG-08** | End-to-end FastAPI integration tests | P1 | Testing | FastAPI / TestClient | 🟡 Intermediate |
| **ENG-09** | GGUF upload file-size limits & cleanup | P0 (Security) | Backend / Security | Python / FastAPI | 🟡 Intermediate |
| **ENG-10** | SSRF protection for remote image loading | P0 (Security) | Security | Python / Networking | 🟡 Intermediate |
| **ENG-11** | Restrict remote Hugging Face model lookup | P1 (Security) | Security / Caching | Python / API | 🟡 Intermediate |
| **ENG-15** | Separate real timing from proxy timing in UI | P1 | Visual UX | React / Profiling | 🟡 Intermediate |
| **ENG-18** | Audit & prune unused frontend components | P2 | Clean Code | Next.js / React | 🟡 Intermediate |
| **ENG-20** | Modular GGUF dependency declarations | P1 | Packaging | Python / pip | 🟡 Intermediate |
| **DESIGN-05** | Build interactive Provenance Inspector panel | P0 | Feature | React / Zustand | 🟡 Intermediate |
| **ENG-03** | Whole-layer ablation residual semantics | P0 | Interpretability | PyTorch Hooks | 🔴 Advanced |
| **ENG-04** | Speculative decoding KV cache state machine | P0 | Engine / KV Cache | PyTorch / Python | 🔴 Advanced |
| **ENG-12** | Refactor `ModelEngine` into modular sub-engines | P1 | Refactoring | Python / Architecture | 🔴 Advanced |
| **ENG-13** | Split Zustand store into modular domain slices | P1 | Refactoring | TypeScript / State | 🔴 Advanced |
| **ENG-14** | Model Capability Adapter abstraction (`ModelAdapter`) | P1 | Architecture | PyTorch / Models | 🔴 Advanced |
| **ENG-19** | CI quality gate enforcement in GitHub Actions | P1 | DevOps | GitHub Actions | 🔴 Advanced |
| **RES-01** | Causal RAG Attribution Interventions | P0 | Research | Interpretability | 🔬 Research |
| **RES-02** | Cross-Quantization Activation Drift Analysis | P1 | Research | Quantization | 🔬 Research |

---

## 🟢 Good First Issues (Beginner)

### `DOC-04` — Update GGUF Setup & Optional Dependencies
- **Priority**: P1
- **Domain**: Packaging / Docs (`backend/`, `README.md`)
- **Problem**: `llama-cpp-python` is advertised for native GGUF execution but not installed by default in base requirements.
- **Tasks**:
  1. Create `backend/requirements-gguf.txt`.
  2. Document optional installation paths (`pip install -r requirements-gguf.txt`).
  3. Document supported vs metadata-only GGUF features in `docs/gguf-format.md`.
- **Verification**: Verify `pip install -r backend/requirements-gguf.txt` installs cleanly.

### `DOC-05` — Document GGUF Dequantization Limitations
- **Priority**: P1
- **Domain**: Docs / Frontend (`frontend/lib/gguf/dequant.ts`, `docs/gguf-format.md`)
- **Problem**: `dequant.ts` uses simplified reconstruction for Q4_K / Q5_K formats. Contributors need clear notice that visualizations represent approximate reconstructions.
- **Tasks**: Add explicit disclaimers in `docs/gguf-format.md` and inline comments in `dequant.ts`.
- **Verification**: `npm run build` passes cleanly.

### `DOC-06` — Fix Stale `trace_client.py` Endpoints
- **Priority**: P1
- **Domain**: Python Scripting (`scripts/trace_client.py`)
- **Problem**: `scripts/trace_client.py` targets deprecated `POST /api/trace` routes instead of `/trace` and `/ws/generate`.
- **Tasks**: Update endpoint URLs and JSON payload keys in `scripts/trace_client.py`.
- **Verification**: Run `python3 scripts/trace_client.py --help` and verify against live FastAPI routes.

### `DOC-07` — Clarify Attention Mass vs Causal Attribution
- **Priority**: P1
- **Domain**: Interpretability Docs (`docs/visual-mapping.md`, `README.md`)
- **Problem**: Users may interpret attention weights as causal proof of model reasoning.
- **Tasks**: Add a "Causality Warning" section explaining that high attention mass does not equal causal necessity.
- **Verification**: Markdown formatting rendered cleanly.

### `DESIGN-02` — Capability-Aware UI Controls
- **Priority**: P1
- **Domain**: Frontend UI (`frontend/components/ui/Sidebar.tsx`)
- **Problem**: Controls like *Head Ablation* or *Vision Analyzer* remain visible even when loading models that don't support them.
- **Tasks**: Conditionally disable or show capability badges (`✓ Supported`, `✗ Unsupported`) based on active model metadata.
- **Verification**: Switch between dense Llama and MoE models in the UI to confirm controls update dynamically.

### `DESIGN-03` — Improve Empty & Unsupported Panel States
- **Priority**: P1
- **Domain**: Frontend UI (`frontend/components/ui/`)
- **Problem**: Missing data currently renders empty grey frames without explanations.
- **Tasks**: Replace empty frames with friendly warning cards (e.g. `"No KV-Cache present for non-autoregressive models"`).
- **Verification**: Inspect empty panel states in Architecture mode.

### `ENG-16` — Finish Debugger Breakpoint (`B` Key) Controls
- **Priority**: P1
- **Domain**: Frontend Controls (`frontend/lib/useKeyboard.ts`, `frontend/lib/store.ts`)
- **Problem**: Pressing <kbd>B</kbd> currently toggles Developer Mode instead of placing a breakpoint at the current op.
- **Tasks**: Wire <kbd>B</kbd> key to toggle breakpoint state at `store.opIndex`.
- **Verification**: Press <kbd>B</kbd> during Replay mode and verify breakpoint dot appears.

### `ENG-17` — Seeded Deterministic Visual Randomness
- **Priority**: P2
- **Domain**: WebGL Rendering (`frontend/lib/pointcloud.ts`)
- **Problem**: Visual pointcloud variation relies on unseeded Math.random(), causing visual jitter between re-renders.
- **Tasks**: Implement a simple string-hashing PRNG (e.g. `murmur3` or `cyrb53`) keyed on tensor names.
- **Verification**: Verify pointcloud renders deterministically across reloads.

---

## 🟡 Intermediate Issues

### `ENG-06` — Add Pytest Unit Test Suite for Backend
- **Priority**: P0
- **Domain**: PyTorch / FastAPI (`backend/tests/`)
- **Tasks**: Expand `backend/tests/` to test tokenization, logit lens outputs, PCA reduction, and ablation hooks.
- **Verification**: `python3 -m pytest tests/` passes 100%.

### `ENG-07` — Add Vitest Frontend Unit Test Suite
- **Priority**: P1
- **Domain**: Next.js / TypeScript (`frontend/`)
- **Tasks**: Setup Vitest to test `lib/formulas.ts`, `lib/format.ts`, `lib/playback.ts`, and `lib/gguf/parser.ts`.
- **Verification**: `npm run test` passes cleanly.

### `ENG-08` — End-to-End FastAPI Integration Tests
- **Priority**: P1
- **Domain**: FastAPI / TestClient (`backend/tests/test_api.py`)
- **Tasks**: Use `starlette.testclient.TestClient` to test `/analyze`, `/debug/analyze`, and `/ws/generate`.
- **Verification**: `pytest tests/test_api.py` passes.

### `ENG-09` — GGUF Upload File-Size Limits & Storage Cleanup
- **Priority**: P0 (Security)
- **Domain**: FastAPI Security (`backend/app/main.py`)
- **Tasks**: Enforce `MAX_GGUF_BYTES = 10 * 1024 * 1024 * 1024` (10 GB) limit and implement automatic temp file cleanup policies.
- **Verification**: Large payload rejects with `413 Payload Too Large`.

### `ENG-10` — SSRF Protection for Remote Image Loading
- **Priority**: P0 (Security)
- **Domain**: Backend Networking (`backend/app/main.py`)
- **Tasks**: Validate image URLs in `/analyze/image` to reject private IP ranges (`10.0.0.0/8`, `127.0.0.1`, `169.254.169.254`).
- **Verification**: Rejects requests targeting `http://127.0.0.1:8000`.

### `ENG-11` — Restrict Remote Hugging Face Model Lookup
- **Priority**: P1 (Security)
- **Domain**: Backend Caching (`backend/app/model.py`)
- **Tasks**: Add rate limiting, model name validation, and LRU metadata caching for remote Hugging Face queries.
- **Verification**: Repeated requests hit local LRU cache.

### `ENG-15` — Separate Real Timing from Proxy Timing in UI
- **Priority**: P1
- **Domain**: Frontend React (`frontend/components/ui/TimingReadout.tsx`)
- **Tasks**: Clearly separate measured wall-clock forward pass timing from PCA magnitude estimates using distinct `<DataProvenanceBadge />` markers.
- **Verification**: Verify timing panel shows `REAL MS` when profiling is enabled.

### `ENG-18` — Audit & Prune Unused Frontend Components
- **Priority**: P2
- **Domain**: Code Cleanup (`frontend/components/`)
- **Tasks**: Audit unused legacy components (`CameraRig.tsx`, `Hud.tsx`, `Intro.tsx`) and remove or document them.
- **Verification**: `npm run build` completes without unused imports.

### `ENG-20` — Modular GGUF Dependency Declarations
- **Priority**: P1
- **Domain**: Python Packaging (`backend/pyproject.toml`)
- **Tasks**: Introduce `pyproject.toml` with optional extras: `pip install -e ".[gguf,dev]"`.
- **Verification**: `pip install -e .` installs base dependencies only.

### `DESIGN-05` — Build Interactive Provenance Inspector Panel
- **Priority**: P0
- **Domain**: Frontend React (`frontend/components/ui/ProvenanceInspector.tsx`)
- **Tasks**: Clicking any displayed UI statistic opens a drawer showing exact source tensor name, layer index, head index, mathematical transformation, and data origin (`REAL` / `DERIVED`).
- **Verification**: Click any statistic to view provenance breadcrumbs.

---

## 🔴 Advanced Issues

### `ENG-03` — Whole-Layer Ablation Residual Semantics
- **Priority**: P0
- **Domain**: Interpretability (`backend/app/ablation.py`)
- **Problem**: Layer ablation should cleanly isolate residual stream state (`residual + 0 × layer_out`).
- **Tasks**: Refactor PyTorch forward hooks to zero sub-layer additive deltas while preserving residual tensor pass-through.
- **Verification**: Logit lens output responds predictably to layer zeroing.

### `ENG-04` — Speculative Decoding KV Cache State Machine
- **Priority**: P0
- **Domain**: Inference Engine (`backend/app/model.py`)
- **Problem**: Speculative draft verification can leave rejected draft tokens in the KV cache tensor.
- **Tasks**: Implement a formal `GenerationState` machine that truncates key/value caches upon draft rejection.
- **Verification**: Rejection sequence tests verify KV cache length matches accepted token count.

### `ENG-12` — Refactor `ModelEngine` into Modular Sub-Engines
- **Priority**: P1
- **Domain**: Backend Architecture (`backend/app/engine/`)
- **Tasks**: Refactor `model.py` (1,400+ lines) into modular classes: `ModelRegistry`, `InferenceEngine`, `AnalysisEngine`, `InterventionEngine`.
- **Verification**: All API endpoints pass regression tests.

### `ENG-13` — Split Zustand Store into Modular Domain Slices
- **Priority**: P1
- **Domain**: Frontend State (`frontend/lib/store/`)
- **Tasks**: Split monolithic `store.ts` (800+ lines) into domain slices: `architectureSlice`, `generationSlice`, `traceSlice`, `uiSlice`.
- **Verification**: App runs without state regression.

### `ENG-14` — Model Capability Adapter Abstraction (`ModelAdapter`)
- **Priority**: P1
- **Domain**: PyTorch Models (`backend/app/adapters/`)
- **Tasks**: Define a base `ModelAdapter` class with standard methods (`get_layers()`, `get_attention_module()`, `supports_ablation()`) for Llama, Qwen, Gemma, and DeepSeek.
- **Verification**: Adding a new architecture requires only a single adapter class.

### `ENG-19` — CI Quality Gate Enforcement
- **Priority**: P1
- **Domain**: DevOps (`.github/workflows/ci.yml`)
- **Tasks**: Configure CI to run frontend lint + typecheck + build and backend pytest on every PR.
- **Verification**: CI fails on deliberate type errors.

---

## 🔬 Interpretability & Research Tasks

### `RES-01` — Causal RAG Attribution Interventions
- **Priority**: P0
- **Focus**: RAG / Causality
- **Goal**: Perform activation patching on RAG context tokens to prove whether specific retrieved chunks causally determine the output token.

### `RES-02` — Cross-Quantization Activation Drift Analysis
- **Priority**: P1
- **Focus**: Model Quantization
- **Goal**: Compute cosine similarity and MSE drift of hidden state vectors across FP16, Q8_0, Q4_K, and IQ3_XS quantized weights.

---

## How to Submit a Pull Request

1. Fork the repo and pick an issue ID (e.g. `DOC-04` or `ENG-06`).
2. Create your branch: `git checkout -b feat/doc-04-gguf-setup`.
3. Verify your changes (`npm run build` and `pytest tests/`).
4. Submit a PR referencing the issue ID!
