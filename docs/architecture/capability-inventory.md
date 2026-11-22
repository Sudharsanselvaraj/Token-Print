# TokenPrint Forensic Capability Inventory

> **Audit Date:** 2026-11-21  
> **Repository Commit:** `e786525`  
> **Status:** AUDITED — Evidence-based source audit across `backend/`, `frontend/`, and deployment topologies.

---

## 1. Provenance & Classification Framework

In accordance with TokenPrint's non-negotiable architectural doctrine, no feature, model, or metric may be documented without verifiable source code or test evidence. Every entry in this inventory traces to an exact `file:line` citation.

### Provenance Vocabulary
- **`REAL`**: Quantitatively computed directly from loaded PyTorch tensor parameters, forward hooks, or parsed GGUF binary headers.
- **`DERIVED`**: Deterministically transformed from `REAL` data via mathematical projection (e.g., PCA 3D projection, cosine similarity, parameter count multiplication).
- **`CONCEPTUAL`**: Structural reference diagrams or static architectural schemas representing transformer topologies without runtime tensor state.
- **`SIMULATION`**: Emulated data streams or fallback representations (e.g., fallback dummy caches in unit test suites).
- **`NOT TESTED` / `UNVERIFIED`**: Architectural claims present in documentation or configuration dictionaries without reproducible CI tests or runtime instrumentation proofs.

### Capability Status Definitions
- **`IMPLEMENTED`**: Fully wired into backend API routes, resident engine hooks, and active frontend visualization views.
- **`PARTIAL`**: Implemented in backend engine or routes but lacking full frontend integration or subject to runtime constraints (e.g. CPU-only, missing dependencies).
- **`EXPERIMENTAL`**: Early prototype code or research script present in the repository, not yet stabilized in canonical endpoints.
- **`PLANNED`**: Defined in architectural roadmaps or schemas; no active execution engine exists in tree.
- **`NOT SUPPORTED`**: Explicitly blocked, non-viable, or prohibited by hardware or architectural boundaries.

---

## 2. Core Capabilities Matrix

| # | Capability | Status | Evidence Path (`path:line`) | `hf_local` (PyTorch) | `GGUF` (llama.cpp) | `browser` (ONNX/WebGPU) | `HF Space` (ZeroGPU) | Provenance |
|---|---|---|---|---|---|---|---|---|
| **1** | **Attention Extraction** | `IMPLEMENTED` | [`backend/app/model.py:222-260`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/model.py#L222-L260)<br>[`backend/app/main.py:766-783`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/main.py#L766-L783) | Yes (All layers/heads) | No (llama.cpp CPU API omits attention) | Yes (GPT-2 12-layer attention) | Yes (`@spaces.GPU` slice) | `REAL` |
| **2** | **Hidden States & Residual Stream** | `IMPLEMENTED` | [`backend/app/model.py:553-568`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/model.py#L553-L568)<br>[`backend/app/main.py:766`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/main.py#L766) | Yes (`output_hidden_states=True`) | No (Quantized runtime omits per-layer activations) | Yes (12-layer embeddings) | Yes (`@spaces.GPU` slice) | `REAL` / `DERIVED` (PCA 3D) |
| **3** | **Logit Lens (Unembedding)** | `IMPLEMENTED` | [`backend/app/model.py:558-565`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/model.py#L558-L565)<br>[`backend/app/adapters.py:38`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/adapters.py#L38) | Yes (`lm_head` projection per layer) | No | No | Yes (`@spaces.GPU` slice) | `REAL` |
| **4** | **Head Ablation** | `IMPLEMENTED` | [`backend/app/ablation.py:80-101`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/ablation.py#L80-L101)<br>[`backend/app/main.py:945-985`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/main.py#L945-L985) | Yes (Self-attention output masking) | No | No | Yes (`hf_space_ablate` runner) | `REAL` |
| **5** | **Layer Ablation** | `IMPLEMENTED` | [`backend/app/ablation.py:59-79`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/ablation.py#L59-L79)<br>[`backend/app/main.py:945-985`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/main.py#L945-L985) | Yes (Identity bypass hook) | No | No | Yes (`hf_space_ablate` runner) | `REAL` |
| **6** | **Activation Patching** | `IMPLEMENTED` | [`backend/app/ablation.py:114-250`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/ablation.py#L114-L250)<br>[`backend/app/main.py:986-1025`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/main.py#L986-L1025) | Yes (Source prompt &rarr; target prompt injection) | No | No | Yes (`hf_space_patch` runner) | `REAL` |
| **7** | **MoE Routing Capture** | `PARTIAL` | [`backend/app/inference/compatibility_engine.py:49`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/inference/compatibility_engine.py#L49)<br>[`backend/app/inference/adapters/deepseek.py:87`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/inference/adapters/deepseek.py#L87) | Partial (Schema/adapter ready, DeepSeek-V3 unsupported) | No | No | No | `CONCEPTUAL` / `SIMULATION` |
| **8** | **RAG Attribution** | `PARTIAL` | [`backend/app/main.py:828-905`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/main.py#L828-L905)<br>[`backend/scripts/activation_patch_rag.py:221`](file:///Users/sudharsan/Downloads/NeuroScope/backend/scripts/activation_patch_rag.py#L221) | Yes (Context attribution & token attribution) | No | No | Partial (No CPU fallback on quota exhaustion) | `REAL` |
| **9** | **Embedding Similarity** | `IMPLEMENTED` | [`backend/app/main.py:803-827`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/main.py#L803-L827) | Yes (Cosine similarity on hidden representation) | No | No | Yes | `DERIVED` |
| **10** | **Speculative Decoding / KV State** | `IMPLEMENTED` | [`backend/app/model.py:142-210`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/model.py#L142-L210)<br>[`backend/tests/test_speculative_kv_cache.py:14-45`](file:///Users/sudharsan/Downloads/NeuroScope/backend/tests/test_speculative_kv_cache.py#L14-L45) | Yes (`GenerationState`, sliding-window truncation) | No | No | Yes (`past_key_values` state retention) | `REAL` |
| **11** | **Trace Record / Replay / Diff** | `IMPLEMENTED` | [`backend/app/main.py:1312-1345`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/main.py#L1312-L1345) | Yes (JSON export, replay endpoint, diff parser) | Partial (Structural only) | Partial (Static trace replay) | Yes | `REAL` |
| **12** | **Collab Rooms (WebSocket)** | `IMPLEMENTED` | [`backend/app/collab.py:52-120`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/collab.py#L52-L120)<br>[`backend/app/main.py:1236-1310`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/main.py#L1236-L1310) | Yes (Multi-user presence, view sync, cursor broadcasts) | Yes (Shared session) | Yes (Shared session) | Partial (WSS requires proxy support) | `REAL` |
| **13** | **Model Compatibility Engine** | `IMPLEMENTED` | [`backend/app/inference/compatibility_engine.py:36-390`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/inference/compatibility_engine.py#L36-L390)<br>[`backend/app/main.py:695`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/main.py#L695) | Yes (Dynamic architectural capability evaluator) | Yes (Checks GGUF format) | Yes (Checks ONNX weights) | Yes (Full evaluation) | `DERIVED` |
| **14** | **VRAM Estimation** | `IMPLEMENTED` | [`backend/app/inference/compatibility_engine.py:143-166`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/inference/compatibility_engine.py#L143-L166) | Formula: `params * bytes * 1.25` | Estimated for quantized dtypes | Estimated for WebGPU memory limit | Evaluates ZeroGPU fit (threshold 14GB) | `DERIVED` |
| **15** | **GGUF Upload / Open / Cache** | `PARTIAL` | [`backend/app/gguf_engine.py:1-294`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/gguf_engine.py#L1-L294)<br>[`backend/app/main.py:280-365`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/main.py#L280-L365) | Local only (`data/gguf` directory) | Yes (Local CPU only) | Client-side parser in browser | Not Supported (Space ephemeral disk, no llama_cpp) | `REAL` |
| **16** | **HF Hub Discovery & SSRF Guard** | `IMPLEMENTED` | [`backend/app/hf_guard.py:79-108`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/hf_guard.py#L79-L108)<br>[`backend/app/main.py:446-490`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/main.py#L446-L490) | Yes (Hardened DNS + IP subnet checks) | N/A | Client direct fetch fallback | Yes (Exempts internal HF VPC IPs) | `REAL` |
| **17** | **ZeroGPU Runner & CPU Fallback** | `IMPLEMENTED` | [`backend/app/inference/backends/hf_local.py:57-78`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/inference/backends/hf_local.py#L57-L78)<br>[`backend/app/model.py:572-610`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/model.py#L572-L610) | N/A | N/A | N/A | Yes (ZeroGPU `@spaces.GPU` &rarr; `analyze_cpu_fallback`) | `REAL` |
| **18** | **In-Browser GPT-2 Engine** | `IMPLEMENTED` | [`frontend/lib/browser/engine.ts:1-55`](file:///Users/sudharsan/Downloads/NeuroScope/frontend/lib/browser/engine.ts#L1-L55)<br>[`frontend/lib/browser/inference.worker.ts:1-120`](file:///Users/sudharsan/Downloads/NeuroScope/frontend/lib/browser/inference.worker.ts#L1-L120) | N/A | N/A | Yes (ONNX Runtime Web WebGPU worker) | N/A | `REAL` |

---

## 3. Verified Forensic Architectural Truths

The following findings were verified directly from source code and runtime inspection:

### A. ZeroGPU Dynamic Symbol Binding
- **Finding**: In [`backend/app/inference/backends/hf_local.py:57`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/inference/backends/hf_local.py#L57), the backend looks up ZeroGPU functions dynamically:
  ```python
  main_mod = sys.modules.get("__main__")
  runner = getattr(main_mod, "hf_space_analyze", None)
  ```
- **Architectural Reality**: The `@spaces.GPU`-decorated functions (`hf_space_analyze`, `hf_space_debug_analyze`, `hf_space_ablate`, `hf_space_patch`, `hf_space_generate_steps`) reside in the Hugging Face Space entrypoint (`app.py`), which is maintained outside this repository. If running outside Hugging Face Spaces, `runner` is `None` and the engine executes via native local PyTorch.

### B. GGUF / llama-cpp-python Availability
- **Finding**: [`backend/app/gguf_engine.py:37`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/gguf_engine.py#L37) performs dynamic detection of `llama_cpp`.
- **Architectural Reality**: The hosted Hugging Face Space does not install `llama-cpp-python`. GGUF quantized forward execution is strictly a local feature requiring a local C++ compilation. Furthermore, `llama.cpp` runs in CPU-only mode (`n_gpu_layers` is not accelerated) and does not expose per-layer activations or attention matrices. GGUF files opened in the browser are parsed client-side for metadata and tensor structures only.

### C. Resident Models & Candidate Verification Gap
- **Finding**: [`backend/app/inference/compatibility_registry.py:37-140`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/inference/compatibility_registry.py#L37-L140) defines records for 6 models: `Qwen/Qwen2.5-0.5B-Instruct`, `gpt2`, `TinyLlama/TinyLlama-1.1B-Chat-v1.0`, `mistralai/Mistral-7B-v0.1`, `deepseek-ai/DeepSeek-V3`, and `google/gemma-2-2b`.
- **Architectural Reality**: Only `Qwen/Qwen2.5-0.5B-Instruct` is actively loaded in the resident Space. In `compatibility_registry.py`, flags such as `hf_space_deployment_verified=True` and `full_interpretability_tested=True` for `gpt2` and `TinyLlama` are hard-coded configuration booleans; no automated CI tests currently prove multi-model residency on the Space. These are marked as `UNVERIFIED / NOT TESTED` in the docs.

### D. Hardware & Quota Feasibility Thresholds
- **Finding**: [`backend/app/inference/compatibility_engine.py:179`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/inference/compatibility_engine.py#L179) hard-codes `fits_zerogpu = vram_gb <= 14.0`.
- **Architectural Reality**: Hugging Face ZeroGPU allocations dynamically provision Nvidia A10G slices with variable VRAM ceilings depending on cluster load. The static 14.0 GB threshold is an internal heuristic and must not be cited as an official hardware guarantee. ZeroGPU quotas are enforced per-user/IP. When quota is exhausted, `/analyze`, `/debug/analyze`, and `/ws/generate` gracefully fall back to CPU (`analyze_cpu_fallback`), whereas `/rag/analyze` has no fallback mechanism.

### E. Mechanistic Interpretability Scientific Rigor
- **Finding**: Attention matrix extraction in [`backend/app/model.py:222`](file:///Users/sudharsan/Downloads/NeuroScope/backend/app/model.py#L222) records forward softmax weights $A = \text{softmax}(QK^T / \sqrt{d_k})$.
- **Architectural Reality**: Attention weights represent routing correlation, not mechanistic causal proof. Layer execution timings are wall-clock proxies subject to CPU/GPU thread scheduling jitter. All visual metrics are clearly labeled with their provenance tier (`REAL`, `DERIVED`, `CONCEPTUAL`, or `SIMULATION`).
