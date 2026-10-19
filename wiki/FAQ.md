# FAQ

## Overview

Frequently asked questions about running and using TokenPrint.

---

### Why does the UI show "Disconnected"?
The frontend cannot reach the backend. 
1. Ensure the backend is running: `python -m uvicorn app.main:app --port 8000`
2. Ensure it is on exactly port `8000`.
3. Check your terminal for PyTorch loading errors.

### Why does it take so long to start the backend?
The default model (`Qwen/Qwen2.5-0.5B-Instruct`) must be downloaded from HuggingFace (about 1GB) on the first run. Even when cached, loading the weights into RAM/VRAM takes 5-15 seconds depending on your hardware.

### Can I run a 7B or 70B model?
**Yes, but it depends on your hardware.** 
TokenPrint loads models in `float32` with eager attention to capture precise mathematical states. A 7B model requires massive amounts of RAM (often >30GB) to run in this mode. If you run out of memory, the backend will crash.

### Can I run Live Inference on a `.gguf` file?
**No, not currently.** 
You can drag and drop a `.gguf` to view its static structure in the Architecture Explorer, but The backend can run quantized GGUF models via llama.cpp (`backend/app/gguf_engine.py`); browser execution is limited to the ONNX GPT-2 path. Support for in-browser WebGPU inference for GGUF files is on the roadmap.

### Why is the 3D canvas black or missing?
Your browser likely dropped the WebGL context due to GPU strain, or hardware acceleration is disabled in your browser settings. TokenPrint requires a modern browser with WebGL enabled. 

### Why is the "Sampling" concept locked to Greedy Decoding?
TokenPrint aims to show exactly how math produces output. Stochastic sampling (Temperature, Top-P) introduces randomness that makes debugging specific behaviors difficult. A Sampling Playground for exploring temperature is planned.

## Navigation
| Previous | Home | Next |
| --- | --- | --- |
| [Roadmap](Roadmap) | [Home](Home) | [Contributing](Contributing) |
