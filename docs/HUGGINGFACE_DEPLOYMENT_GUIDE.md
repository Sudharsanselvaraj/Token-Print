# TokenPrint — Hugging Face Space & ZeroGPU Deployment Guide

**Target Space:** `https://huggingface.co/spaces/sudharsan112321/tokenprint-backend`  
**Live Endpoint:** `https://sudharsan112321-tokenprint-backend.hf.space`  
**Hardware Tier:** ZeroGPU Free (`zero-a10g` / NVIDIA A100/H100 PCIe dynamic slicing)  
**Frontend Deployment:** GitHub Pages (`https://sudharsanselvaraj.github.io`)  
**SDK:** Gradio (ASGI FastAPI mounting architecture)  

---

## 1. Overview & Architectural Design

TokenPrint's backend is a high-performance machine learning instrumentation service that extracts intermediate forward-pass tensor representations (attention matrices, hidden state PCA projections, and layer-by-layer execution latencies).

### Deployment Architecture:
```
                                 ┌──────────────────────────────────────────────┐
                                 │              GitHub Pages                    │
                                 │   https://sudharsanselvaraj.github.io        │
                                 │   (Next.js Static Export Client)             │
                                 └──────────────────────┬───────────────────────┘
                                                        │
                         HTTPS REST / WSS WebSocket     │
                         NEXT_PUBLIC_API_URL            │
                                                        ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               Hugging Face Edge Proxy                  │
                    │       https://sudharsan112321-tokenprint-backend.hf.space
                    │       (SSL Termination, Port 443 → 7860)               │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                                                ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│ Hugging Face Space (ZeroGPU Container)                                                         │
│                                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ app.py (Entrypoint)                                                                     │  │
│  │   ├── Gradio System Console (Root /) — Health, Status, Prompt Tester, Docs Navigation   │  │
│  │   └── FastAPI ASGI App (Mounted)                                                        │  │
│  │         ├── GET  /health, /model-info, /architecture                                    │  │
│  │         ├── POST /analyze, /rag/analyze, /debug/analyze                                 │  │
│  │         ├── POST /ablate/analyze, /patch/analyze                                        │  │
│  │         ├── WS   /ws/generate (Streamed greedy causal generation)                       │  │
│  │         └── WS   /ws/collab/{room_id} (Collaborative multi-viewer channel)               │  │
│  └────────────────────────────────────────┬────────────────────────────────────────────────┘  │
│                                           │                                                   │
│                                           ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ ModelEngine (Qwen/Qwen2.5-0.5B-Instruct in float32 eager attention)                     │  │
│  │   ├── ZeroGPU Accelerated (@spaces.GPU dynamic slicing when CUDA available)             │  │
│  │   └── Automatic CPU Fallback (Guaranteed execution when quota or GPU unavailable)        │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Space Repository File Structure

The deployed Hugging Face Space (`sudharsan112321/tokenprint-backend`) is organized as follows:

```
tokenprint-backend/
├── README.md               # Space metadata (sdk: gradio, python: 3.11, ZeroGPU)
├── app.py                  # ASGI entrypoint mounting Gradio console onto FastAPI
├── requirements.txt        # Pinned, ZeroGPU-compatible Python dependencies
├── .gitignore              # Ignores pycache, .DS_Store, and binary artifacts
├── app/                    # Complete backend implementation package
│   ├── main.py             # FastAPI application, CORS middleware, lifespan
│   ├── model.py            # ModelEngine, PyTorch forward hooks, tokenizer
│   ├── schemas.py          # Pydantic v2 request & response contracts
│   ├── collab.py           # Multi-viewer WebSocket room manager
│   ├── trace.py            # Trace recorder, parser, and serializer
│   ├── ablation.py         # Head & layer ablation context manager
│   ├── gguf_cache.py       # LRU memory cache for resident GGUF models
│   ├── gguf_engine.py      # Optional llama.cpp quantized model runner
│   ├── hf_guard.py         # SSRF protection and safe HF Hub communication
│   ├── reduce.py           # PCA projection and RAG attribution reduction
│   ├── config/             # Curated models configuration
│   └── inference/          # Inference registry, adapters, and capabilities
└── data/
    └── gguf/
        └── .gitkeep        # Ephemeral resident GGUF model directory
```

---

## 3. Hugging Face Space Metadata Configuration (`README.md`)

The frontmatter in `README.md` defines the deployment runtime for Hugging Face:

```yaml
---
title: TokenPrint Backend
emoji: ⚡
colorFrom: yellow
colorTo: pink
sdk: gradio
sdk_version: 6.11.0
python_version: '3.11'
app_file: app.py
pinned: false
short_description: TokenPrint Transformer Inference Backend
---
```

**Key Parameters:**
- `sdk: gradio`: Hugging Face uses its managed Gradio runtime environment while serving our mounted FastAPI endpoints.
- `app_file: app.py`: Identifies the main Python entrypoint script.
- `python_version: '3.11'`: Matches the version verified across TokenPrint unit test suites.
- `short_description`: Kept under Hugging Face's 60-character constraint.

---

## 4. Dependencies Strategy (`requirements.txt`)

Hugging Face ZeroGPU containers come with **PyTorch and CUDA preinstalled**. Pinning an explicit non-CUDA wheel (such as macOS MPS wheels or CPU-only wheels) would overwrite the CUDA environment.

The deployment `requirements.txt` specifies compatible versions without clobbering PyTorch:

```text
fastapi>=0.110.0
uvicorn[standard]>=0.28.0
websockets>=12.0
numpy>=1.26.0
python-multipart>=0.0.9
pyyaml>=6.0.1
httpx>=0.27.0
transformers>=4.45.0
scikit-learn>=1.4.0
gradio>=5.0.0
pydantic>=2.0.0
anyio>=4.0.0
```

---

## 5. ZeroGPU Integration & Automatic CPU Fallback

To support ZeroGPU dynamically without crashing on local or CPU environments:
1. **Dynamic Detection:**
   ```python
   try:
       import spaces
       HAS_ZEROGPU = True
   except ImportError:
       HAS_ZEROGPU = False
   ```
2. **Selective Decorator Wrapping:**
   The `@spaces.GPU` decorator is applied exclusively to compute-heavy forward-pass operations (such as interactive generation and token analysis). Metadata, health check, and architecture endpoints execute on CPU without consuming GPU quota.
3. **Hardware Fallback:**
   If GPU quota is exhausted or if the Space transitions to CPU, `Qwen/Qwen2.5-0.5B-Instruct` executes on CPU in ~120ms per token, ensuring 100% service uptime.

---

## 6. Frontend Integration & Static Hosting

Because the frontend is hosted on **GitHub Pages** (static hosting), environment variables must be injected during the build step.

### A. Environment Configuration (`frontend/.env.production`)
```env
NEXT_PUBLIC_API_URL=https://sudharsan112321-tokenprint-backend.hf.space
```

### B. GitHub Actions Automated Deployment (`.github/workflows/deploy.yml`)
The workflow supplies `NEXT_PUBLIC_API_URL` during the `npm run build` step so static assets automatically connect to the live Hugging Face backend:

```yaml
      - run: npm run build
        env:
          NEXT_DISABLE_BASEPATH: "1"
          NEXT_PUBLIC_API_URL: "https://sudharsan112321-tokenprint-backend.hf.space"
```

### C. WebSocket Protocol Resolution
In `frontend/lib/ws.ts` and `frontend/lib/collab/client.ts`, URLs are constructed dynamically:
```typescript
const wsUrl = API_URL.replace(/^http/, "ws") + "/ws/generate";
// https://sudharsan112321-tokenprint-backend.hf.space -> wss://sudharsan112321-tokenprint-backend.hf.space/ws/generate
```

---

## 7. Step-by-Step Deployment & Update Instructions

To update or redeploy the backend in the future:

1. **Verify Local Git Remote:**
   ```bash
   git remote -v
   # Should list hf-space: https://huggingface.co/spaces/sudharsan112321/tokenprint-backend
   ```
2. **Synchronize & Deploy via `huggingface_hub`:**
   ```bash
   python3 -c "
   from huggingface_hub import HfApi
   api = HfApi()
   api.upload_folder(
       folder_path='/path/to/backend',
       repo_id='sudharsan112321/tokenprint-backend',
       repo_type='space',
       commit_message='Update TokenPrint backend',
       ignore_patterns=['.git', '.git/**', '__pycache__', '*.pyc']
   )
   "
   ```
3. **Monitor Space Logs:**
   Visit `https://huggingface.co/spaces/sudharsan112321/tokenprint-backend` to view live build and application logs.

---

## 8. Verification & Troubleshooting

- **Cold Starts:** When waking from sleep, initial requests may take 15–20 seconds to boot the container and load model weights into memory. Subsequent calls execute in real time.
- **CORS Errors:** Ensure the frontend origin (`https://sudharsanselvaraj.github.io`) is listed in `CORSMiddleware` in `app/main.py`.
- **WebSocket Drops:** All client connections to Hugging Face Spaces must use `wss://` (secure WebSockets).
