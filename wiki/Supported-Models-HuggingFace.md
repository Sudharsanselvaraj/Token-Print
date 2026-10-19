# HuggingFace

## Overview

HuggingFace is the primary hub for open-source AI models. TokenPrint's backend uses the `transformers` library to download, load, and execute models hosted on HuggingFace.

## Why it matters

To provide real-time Live Inference and capture intermediate layer statistics (like attention weights and hidden states), TokenPrint must execute a real forward pass. PyTorch and the HuggingFace `transformers` library are the gold standards for accessing these internal states during execution.

## How TokenPrint implements it

In `backend/app/model.py`, TokenPrint initializes the `ModelEngine`.

By default, it loads `Qwen/Qwen2.5-0.5B-Instruct`.

It enforces a specific flag: `attn_implementation="eager"`.
This is critical. Modern PyTorch often defaults to FlashAttention or SDPA (Scaled Dot Product Attention) to speed up inference. However, these optimized kernels fuse operations and **do not return the attention probability matrices**. TokenPrint forces eager execution so it can extract the real `[layer][head][from][to]` attention tensors to render in the UI.

## Changing the Model

To load a different HuggingFace model:
1. Stop the backend server.
2. Set `TOKENPRINT_MODEL` environment variable (or edit the default in `backend/app/model.py`); adapters in `backend/app/inference/adapters/` register families..
3. Restart the server.

> **Warning**
> TokenPrint loads models in `float32` by default to ensure maximum precision of the extracted activations. Loading a 7B or 8B model will require significant RAM/VRAM. The default 0.5B model was chosen so anyone can run it locally on a standard laptop.

## Diagram

```mermaid
flowchart TD
    HF[HuggingFace Hub] -->|Download Weights| Cache[Local HF Cache]
    Cache --> Engine[ModelEngine (PyTorch)]
    
    subgraph Execution Parameters
        Engine --> Eager[attn_implementation="eager"]
        Engine --> FP32[torch_dtype=float32]
    end
    
    Eager --> Output[Real Attention Tensors]
```

## Related pages
- [Supported Models](Supported-Models)
- [Live Inference](User-Guide-Live-Inference)

## Further reading
- [Architecture Docs](../docs/architecture.md)

## Navigation
| Previous | Home | Next |
| --- | --- | --- |
| [GGUF](Supported-Models-GGUF) | [Home](Home) | [Llama](Supported-Models-Llama) |
