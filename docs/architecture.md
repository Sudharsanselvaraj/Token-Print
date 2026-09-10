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
└─────────────────┬────────────────┘   └────────────┬───────────────┘
                  │                                 │
                  └─────────────────┬───────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                       Zustand Application Store                   │
│      • Mode selection (Explorer, Generation, Walkthrough, Debug)   │
│      • Playback ticker & op-catalog index                         │
│      • Active trace frames & selection state                      │
└──────────────────────────────────┬────────────────────────────────┘
                                   │
                                   ▼
┌───────────────────────────────────────────────────────────────────┐
│                    React Three Fiber 3D Canvas                    │
│   • TransformerStack (Spine, SwiGLU Funnel, RMSNorm Waist, GQA)   │
│   • TensorCloud (Points layout)                                   │
│   • Annotations & Provenance Overlays                             │
└───────────────────────────────────────────────────────────────────┘
```

---

## Core Principles

1. **Architectural Honesty**: 3D geometries accurately reflect model parameters (e.g. 14 Q-heads grouped into 2 KV-heads for GQA, SwiGLU expansion ratio sized to actual FFN dimension).
2. **Provenanced Data**: All values originate from live model forward passes, `named_parameters()`, or `.gguf` file headers.
3. **Responsive WebGL Layout**: Central canvas is framed by responsive top, side, and bottom toolbars without overlapping dynamic 3D elements.
