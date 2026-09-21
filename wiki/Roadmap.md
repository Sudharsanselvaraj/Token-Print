# Roadmap

## Overview

TokenPrint is actively evolving. The ultimate goal is to become the standard interactive visual debugger for Transformer execution—the tool that answers *"what is my model doing right now, and why?"*

## Current Status (Shipped)

- **Architecture Explorer:** Real tensor inventory with point-cloud rendering.
- **Live Inference:** Streamed greedy generation with dynamic `TransformerStack` geometry.
- **Walkthrough Mode:** Eased camera tours with PCA projections and attention bezier curves.
- **Debugger Mode:** Breakpoints, anomaly sentinels, logit-lens, and raw-component ablation.
- **Trace Record/Replay:** Exporting generations to `.tokenprint.json` for offline viewing.
- **Guided Replay & Reproducible Experiments:** Step-through replay, portable experiment definitions (`.tokenprint.json`), and share/load of exact runs.
- **Browser GPT-2 Inference:** In-browser WebGPU/ONNX (or CPU/WASM) GPT-2 greedy decoding from the intrinsics home page — no Python backend needed for basic use.
- **GGUF LRU cache eviction** and **HF revision-SHA resolution** in the Model Explorer.

## Upcoming Milestones

### Milestone 1: MoE and Advanced Architectures
- Support for **Mixture of Experts (MoE)** routing visualization (e.g., DeepSeek, Mixtral).
- Support for Multi-Head Latent Attention (MLA).

### Milestone 2: Activation Patching
- Moving beyond simple "ablation" (zeroing out a head) to true **Activation Patching** (swapping a hidden state from a corrupted prompt into a clean prompt) directly via the UI.

### Milestone 3: Client-side Inference
- The **browser GPT-2 forward pass (WebGPU/ONNX) shipped in [#329](https://github.com/Sudharsanselvaraj/Token-Print/pull/329)** — the frame-producer seam landed in [#315](https://github.com/Sudharsanselvaraj/Token-Print/pull/315). Remaining scope (Phase 5.2, Stage B): running **GGUF files dropped into the browser** via WebGPU, additional in-browser models, and a browser-vs-backend verification harness.
- **Status: in progress (Phase 5.2, Stage B)** — tracked under [#295](https://github.com/Sudharsanselvaraj/Token-Print/issues/295) with sub-issues [#313](https://github.com/Sudharsanselvaraj/Token-Print/issues/313)–[#314](https://github.com/Sudharsanselvaraj/Token-Print/issues/314).

### Milestone 4: Multi-Model Diffing
- Loading two traces from two different quantized versions of the same model (e.g., Q4 vs FP16) and rendering a visual 3D diff to see exactly where the quantization errors accumulate during the forward pass.

## Related pages
- [Contributing](Contributing)

## Further reading
- [Full Roadmap File](../ROADMAP.md)
- [Design Review](../docs/design-review.md)

## Navigation
| Previous | Home | Next |
| --- | --- | --- |
| [Scientific Accuracy](Research-Scientific-Accuracy) | [Home](Home) | [FAQ](FAQ) |
