# TokenPrint System Architecture

TokenPrint is an interactive 3D visual debugger for transformer language models. It connects real model activation hooks and file parsers directly to React Three Fiber WebGL representations.

---

## High-Level System Architecture

```text
┌───────────────────────────────────────────────────────────────────┐
│                      Model / File Source                          │
│   HuggingFace PyTorch Model     OR     Local .gguf File (Binary)  │
└─────────────────┬─────────────────────────────────┬───────────────┘
                  │                                 │
                  ▼                                 ▼
┌──────────────────────────────────┐   ┌────────────────────────────┐
│      FastAPI PyTorch Engine      │   │   Client-Side GGUF Parser   │
│  • Forward Pass Hooks            │   │  • Header Slice Read       │
│  • Logit Lens / PCA / Ablation   │   │  • Dequantization (TS)     │
│  • WebSocket Streaming           │   │  • Tensor Metadata         │
│  • GGUF engine LRU cache (/gguf)*│   │                            │
└─────────────────┬────────────────┘   └────────────┬───────────────┘
                  │                                 │
        ┌─────────┴───────────────┬─────────────────┘
        │                         │
        ▼                         ▼
┌───────────────────────┐   ┌────────────────────────────┐
│   In-Browser GPT-2    │   │   Zustand Application Store │
│   ONNX Engine (5.2b)  │   │  • Engine-agnostic FrameSink│
│   • WebGPU / CPU(WASM)│   │  • Mode selection │ Playback│
│   • Greedy ≤ 32 tokens│   │  • Active trace & selection │
│   (frame-producer seam│   │  (sources are interchangeable)│
│    registered into    │   │                            │
│    the same FrameSink)│   └────────────┬───────────────┘
└───────────┬───────────┘                │
            │ frames (local engine)      │ frames (WS / replay / local)
            └─────────────┬──────────────┘
                          ▼
┌───────────────────────────────────────────────────────────────────┐
│                    React Three Fiber 3D Canvas                    │
│   • TransformerStack (Spine, SwiGLU Funnel, RMSNorm Collar, GQA)  │
│   • TensorCloud (Points layout)                                   │
│   • Annotations & Provenance Overlays                             │
└───────────────────────────────────────────────────────────────────┘
```

`*` The FastAPI engine's GGUF path keeps resident models in an LRU cache with
explicit unload (`POST /gguf/unload`) and stats (`GET /gguf/cache`) endpoints
(see [api.md](api.md)). The in-browser GPT-2 engine is described in
[browser-inference.md](browser-inference.md); it feeds the same store seam as the
live WebSocket, so replay, browser, and backend sources are interchangeable
without store changes.

---

## Core Principles

1. **Architectural Honesty**: 3D geometries accurately reflect model parameters (e.g. 14 Q-heads grouped into 2 KV-heads for GQA, SwiGLU expansion ratio sized to actual FFN dimension).
2. **Provenanced Data**: All values originate from live model forward passes, `named_parameters()`, or `.gguf` file headers.
3. **Responsive WebGL Layout**: Central canvas is framed by responsive top, side, and bottom toolbars without overlapping dynamic 3D elements.
