# Repository Structure

## Overview

The TokenPrint repository is divided into two primary workspaces: `backend` and `frontend`. 

## Why it matters

Knowing where to find files is the first step to contributing. This structure enforces the decoupling of the rendering engine from the machine learning engine.

## How TokenPrint implements it

### Root Directory

```text
Token-Print/
├── backend/          # Python FastAPI & PyTorch
├── frontend/         # TypeScript Next.js & React Three Fiber
├── docs/             # Technical documentation
├── scripts/          # Shared CI/CD scripts
├── wiki/             # The GitHub Wiki markdown files (you are here)
├── README.md         # Project overview
└── ROADMAP.md        # Future plans
```

### Backend Directory

```text
backend/
├── app/
│   ├── main.py       # FastAPI entrypoint, WebSockets, GGUF cache & unload endpoints
│   ├── model.py      # PyTorch ModelEngine (Loads Qwen2.5)
│   ├── trace.py      # Serialization for Record & Replay
│   ├── debug.py      # Stepped inspection logic
│   ├── ablation.py   # Forward hooks for zeroing heads
│   ├── reduce.py     # PCA and dimensionality reduction
│   ├── inference/    # Model adapters, GGUF engine, capabilities
│   └── schemas.py    # Pydantic models for JSON APIs
├── scripts/          # Verification scripts (verify_real_data.py)
└── requirements.txt  # Python dependencies
```

### Frontend Directory

```text
frontend/
├── app/              # Next.js App Router (page.tsx)
├── components/
│   ├── scenes/       # R3F 3D Components (TransformerStack.tsx)
│   ├── ui/           # Standard React UI Panels (BottomBar.tsx)
│   └── SceneLoader.tsx # WebGL Context boundary
├── lib/
│   ├── store/        # Split Zustand domain slices + hooks (architecture/generation/debug)
│   ├── browser/      # In-browser GPT-2 ONNX engine (WebGPU/WASM worker)
│   ├── gguf/         # Client-side .gguf parser & dequantization
│   ├── generation.ts # Engine-agnostic FrameSink seam (WS / trace / browser)
│   ├── formulas.ts   # KaTeX LaTeX strings
│   ├── playback.ts   # Autoplay pacing and layer logic
│   └── sceneColors.ts# Canonical color mapping
├── public/           # Static assets
└── package.json      # Node dependencies
```

## Related pages
- [Building From Source](Developer-Guide-Building-From-Source)
- [Architecture](Architecture)

## Further reading
- [Development Environment Setup](../docs/development.md)

## Navigation
| Previous | Home | Next |
| --- | --- | --- |
| [Developer Guide](Developer-Guide) | [Home](Home) | [Building From Source](Developer-Guide-Building-From-Source) |
