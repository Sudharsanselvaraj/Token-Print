# TokenPrint — Hugging Face Space Deployment Audit

**Target Space:** `https://huggingface.co/spaces/sudharsan112321/tokenprint-backend`  
**Public Space URL:** `https://sudharsan112321-tokenprint-backend.hf.space`  
**Target Hardware:** ZeroGPU (Free tier)  
**SDK:** Gradio (with mounted FastAPI ASGI application)  
**Frontend Host:** GitHub Pages (`https://sudharsanselvaraj.github.io`)  
**Audit Date:** November 2026  

---

## 1. Existing Backend Architecture Overview

TokenPrint's backend is a specialized Python/FastAPI machine learning service engineered to inspect, ablate, patch, and stream transformer forward-pass computations token-by-token. Unlike conventional LLM serving APIs (e.g., vLLM or Ollama) which discard intermediate layer states to maximize generation throughput, TokenPrint extracts exact tensor matrices:
- Multi-head attention matrices (`output_attentions=True` with `attn_implementation="eager"`).
- Per-layer hidden state representations (residual stream projections to 3D PCA coordinates).
- Layer-by-layer forward execution timings via PyTorch module hooks.
- Exact logit distributions and top-k candidate tokens.
- KV-cache state and speculative decoding verification step dynamics.

### Key Components:
1. **Entrypoint:**
   - Local startup: `python3 scripts/start.py` or `python -m uvicorn app.main:app --port 8000`.
   - Lifespan Handler: Defined in `backend/app/main.py:97`. Handles single-instance model engine initialization and cleanup.
2. **Inference Engine (`backend/app/model.py`):**
   - Default Model: `Qwen/Qwen2.5-0.5B-Instruct` (~490M parameters).
   - Precision: `torch.float32` (avoids MPS/CUDA NaN issues in eager attention).
   - Architecture classification: Supports `causal_lm`, `encoder`, and `vision` models.
   - Modular sub-engines:
     - `AttentionEngine`: Thresholding (<0.01 to 0.0) and rounding (3 decimal places).
     - `ActivationEngine`: Forward hooks measuring per-layer latency in milliseconds.
     - `ReductionEngine`: Incremental PCA projecting hidden states into 3D coordinate space.
3. **Quantized GGUF Engine (`backend/app/gguf_engine.py` & `backend/app/gguf_cache.py`):**
   - Implements local execution for `.gguf` models via optional `llama-cpp-python`.
   - Thread-safe LRU engine cache (`GGUFEngineCache`) holding resident GGUF instances in memory.
   - Secure filesystem sandbox targeting `backend/data/gguf` with path traversal guards.
4. **Intervention & Mechanistic Interpretability:**
   - `backend/app/ablation.py`: Attention head masking and layer zeroing (`Ablation` context manager).
   - Activation Patching: Replaces target residual streams with source sentence states (`analyze_patched`).
   - RAG Attribution (`backend/app/reduce.py`): Token-to-chunk attribution calculation for retrieval grounding.
5. **Real-time Streaming & Collaboration:**
   - `/ws/generate`: Streaming greedy causal generation with bounded backpressure queue (`asyncio.Queue(maxsize=32)`).
   - `/ws/collab/{room_id}`: Real-time multi-viewer cursor, presence, and classroom presenter sync (`backend/app/collab.py`).

---

## 2. API Endpoint Inventory

| Method | Endpoint | Description | Compute Class | Payload / Notes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Liveness check, model loaded status, and GGUF availability | CPU | Returns status, model type, mode |
| `GET` | `/model-info` | Active model metadata (layers, heads, hidden size, device) | CPU | Returns `ModelInfo` schema |
| `GET` | `/architecture` | Real tensor list, shapes, dtypes, and layer boundaries | CPU / Memory | Supports `?model_id=` for config-only inspection |
| `GET` | `/gguf/list` | List server-side resident `.gguf` files | CPU | Metadata only from `data/gguf` |
| `POST` | `/gguf/upload` | Upload `.gguf` file (up to 10 GB limit) | Disk / CPU | Streamed upload with filename validation |
| `POST` | `/gguf/open` | Open and initialize resident GGUF engine | CPU / Memory | Loads GGUF into memory |
| `POST` | `/gguf/unload` | Unload resident GGUF model and free RAM | CPU / Memory | Explicit memory reclamation |
| `GET` | `/gguf/cache` | GGUF cache statistics (resident engines, capacity) | CPU | Cache monitoring |
| `GET` | `/api/hf/curated` | Return curated Hugging Face models list | CPU | Loaded from `curated_models.yaml` |
| `GET` | `/api/hf/search` | Search Hugging Face Hub text-generation models | CPU / Network | Cached for 60s, rate-limited, query sanitized |
| `GET` | `/api/hf/inspect` | Inspect remote model architecture & capabilities | CPU / Network | Fetches `config.json` without downloading weights |
| `GET` | `/api/model/capabilities` | Effective capabilities matrix of loaded model | CPU | Returns inspection & intervention flags |
| `POST` | `/analyze` | Single forward pass returning tokens and full attention | GPU / CPU | Heavy compute; eager attention extraction |
| `POST` | `/analyze/image` | Vision transformer forward pass on base64 image | GPU / CPU | Requires vision model mode |
| `POST` | `/rag/analyze` | Chunk-level attribution reduction over attention | GPU / CPU | Computes token spans & grounding scores |
| `GET` | `/debug/ops` | List inspectable module paths | CPU | Static model registry metadata |
| `POST` | `/debug/analyze` | Forward pass with sampled intermediate tensor activations | GPU / CPU | Returns sampled activations per module |
| `POST` | `/ablate/analyze` | Forward pass with zeroed attention heads or layers | GPU / CPU | Mechanistic interpretability intervention |
| `POST` | `/patch/analyze` | Activation patching across residual stream layers | GPU / CPU | Dual forward pass (clean + patched) |
| `WS` | `/ws/generate` | Streamed causal token generation with backpressure | GPU / CPU | Streams JSON token frames, supports trace recording |
| `WS` | `/ws/collab/{room_id}`| Multi-user presence, cursors, and presenter sync | CPU / Memory | Real-time WebSocket room manager |
| `GET` | `/trace` | Download the last recorded generation as JSON | Memory / Disk | Returns `tokenprint-trace.json` |
| `POST` | `/trace/replay` | Validate and replay an uploaded trace JSON | CPU | Used for drag-and-drop trace inspection |

---

## 3. Hardware, Dependency & ZeroGPU Compatibility Analysis

### Hardware Environment:
- **Hugging Face Free Space Tier:**
  - Standard vCPU: 2 vCPU cores, 16 GB system RAM.
  - ZeroGPU: Dynamic NVIDIA A100/H100 GPU allocation.
  - Ephemeral Storage: ~50 GB container disk (cleared on restart).
  - Port: Internal application must bind to `0.0.0.0:7860`.

### ZeroGPU Characteristics & Rules:
1. **Dynamic Slicing:** GPU is allocated on-demand via the `@spaces.GPU` decorator. Unallocated containers run on CPU.
2. **Quota & Timeouts:** ZeroGPU functions have a duration budget (default 60 seconds). Long unyielding loops will be killed.
3. **CUDA Initialization:** ZeroGPU intercepts CUDA initialization. The application must NOT call `torch.cuda.set_device()` or probe CUDA during module import before `@spaces.GPU` takes effect.
4. **Model Loading:** The default model (`Qwen/Qwen2.5-0.5B-Instruct`) requires ~1.0 GB of memory in `float32` (~500 MB in `float16`/`bfloat16`).
   - Fits comfortably in both the 16 GB system RAM (CPU fallback) and ZeroGPU's GPU memory.
   - On CPU, a 20-token generation completes in ~1.2 seconds; on ZeroGPU, it completes in ~80 milliseconds.
5. **Decoupled Decorators:**
   - CPU-compatible metadata endpoints (`/health`, `/model-info`, `/architecture`, `/api/hf/*`) must never acquire a GPU.
   - Only heavy forward-pass execution functions in `ModelEngine` (`generate_steps`, `analyze`, `analyze_patched`) should request GPU execution.
   - A graceful fallback to CPU must be active when `spaces` is unavailable or GPU quota is exhausted.

### Incompatible Dependencies & Constraints:
1. **`llama-cpp-python`:**
   - In `backend/requirements-gguf.txt`, `llama-cpp-python` requires precompiled C++ binaries or CMake compilation with CUDA flags.
   - On Hugging Face Spaces, compiling `llama-cpp-python` from source during build can cause slow build times (10+ minutes) or build failures.
   - *Strategy:* Keep `llama-cpp-python` as optional. TokenPrint already implements graceful degradation (`GGUF_ENGINE_AVAILABLE = False` when uninstalled). GGUF uploads and metadata inspection work natively without compilation.
2. **Torch Version:**
   - Local `requirements.txt` specifies `torch==2.14.0`, which is a macOS/MPS test build.
   - Hugging Face ZeroGPU runtime provides PyTorch with CUDA 12.x preinstalled. Pinning an incompatible or non-CUDA torch package in `requirements.txt` would overwrite the preinstalled CUDA PyTorch!
   - *Strategy:* Exclude fixed PyTorch wheels from `requirements.txt` or specify `torch>=2.2.0` so the Space's native CUDA-optimized torch is preserved.

---

## 4. WebSocket & Real-Time Proxy Analysis

Hugging Face Spaces exposes web applications through an SSL-terminating reverse proxy at `https://<space-name>.hf.space`.
1. **WebSocket Handshake:** The proxy correctly handles HTTP `Upgrade: websocket`.
2. **Protocol:** WebSockets must connect via `wss://`, not `ws://`.
3. **CORS & Origin:** FastAPIs `CORSMiddleware` applies to HTTP requests; for WebSockets, FastAPI verifies the `Origin` header if configured. The backend must explicitly accept connections from `https://sudharsanselvaraj.github.io` and `https://tokenprint.in`.
4. **Inactivity Drops:** HF proxies terminate idle WebSocket connections after 60 seconds of silence.
   - TokenPrint's `/ws/generate` streams tokens continuously during generation.
   - TokenPrint's `/ws/collab` sends regular heartbeat/cursor frames, keeping the connection alive.
   - A ping-pong mechanism is preserved for long pauses.

---

## 5. Security & Deployment Risk Matrix

| Risk | Impact | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Exposing Hugging Face API Token** | Critical | Low | Read `HF_TOKEN` strictly from environment; never hardcode or commit secrets. |
| **Overwriting Space Preinstalled PyTorch** | High | High | Do not pin explicit non-CUDA torch wheels in deployment `requirements.txt`. |
| **ZeroGPU Quota Exhaustion** | Medium | Medium | Wrap GPU calls with try-except fallback to CPU; keep default model compact (Qwen 0.5B). |
| **SSRF via `/api/hf/inspect`** | High | Low | Existing `hf_guard.py` enforces allowlist regexes and safe domain checking. |
| **GGUF Path Traversal** | High | Low | Existing `_resolve_gguf` enforces basename resolution inside `data/gguf`. |
| **Ephemeral Disk Eviction** | Low | High | Document that uploaded `.gguf` files are temporary unless external bucket is configured. |
| **Public Space CORS Blocking** | High | Medium | Explicitly include `https://sudharsanselvaraj.github.io` in allowed CORS origins. |

---

## 6. Recommended Migration Architecture

To satisfy Hugging Face's Gradio SDK configuration without Docker:
1. **`app.py` Entrypoint:**
   - Initialize the production `FastAPI` instance from `app.main:app`.
   - Ensure CORS allows the GitHub Pages frontend origin.
   - Define a polished, branded Gradio Blocks interface (`TokenPrint Backend Console`) showcasing system health, loaded model metrics, interactive prompt tester, and links to the GitHub Pages frontend and OpenAPI docs.
   - Mount the Gradio app onto the FastAPI application at root (`/`) or `/gradio` using `gr.mount_gradio_app`.
2. **ZeroGPU Integration:**
   - Detect `spaces` package at runtime:
     ```python
     try:
         import spaces
         HAS_ZEROGPU = True
     except ImportError:
         HAS_ZEROGPU = False
     ```
   - Dynamically decorate heavy forward-pass execution methods without decorating the entire web app.
3. **Deployment Strategy:**
   - Deploy via dedicated git remote `hf-space` pointing to `https://huggingface.co/spaces/sudharsan112321/tokenprint-backend`.
   - Use authenticated Hugging Face CLI credentials already configured for `sudharsan112321`.
4. **Frontend Configuration:**
   - Set `NEXT_PUBLIC_API_URL=https://sudharsan112321-tokenprint-backend.hf.space` for production builds.
   - Keep local fallback `http://localhost:8000` for development.
