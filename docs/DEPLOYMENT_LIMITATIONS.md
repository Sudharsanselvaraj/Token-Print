# TokenPrint — Hugging Face Space & ZeroGPU Deployment Limitations

This document outlines the architectural boundaries, hardware constraints, and platform-specific behaviors when running TokenPrint on Hugging Face Spaces (ZeroGPU Free tier) with the frontend on GitHub Pages.

---

## 1. ZeroGPU Hardware Constraints & Behavior

Hugging Face Spaces ZeroGPU provides dynamic GPU allocation powered by AMD or NVIDIA hardware (typically NVIDIA A100/H100 PCIe).

### A. Dynamic GPU Slicing vs. Continuous Execution
- **Allocation Mechanism:** ZeroGPU does not provide a dedicated, persistent GPU. Containers run on standard vCPUs (2 cores, 16 GB RAM) by default.
- **Function-Level GPU:** Only functions wrapped with `@spaces.GPU` receive GPU hardware acceleration, and only for the duration of the execution (default max: 60 seconds).
- **Idle Sleeping:** Spaces sleep automatically after periods of inactivity. The first request after a sleep period incurs a cold-start initialization latency (typically 10–25 seconds) while the container wakes and loads weights.

### B. Daily Free Quota
- Hugging Face enforces a per-user daily GPU compute quota on the free tier.
- If a user's ZeroGPU quota is exhausted, functions wrapped with `@spaces.GPU` fall back to CPU execution or raise a quota exception.
- **TokenPrint Resilience:** TokenPrint is engineered with a default compact model (`Qwen/Qwen2.5-0.5B-Instruct`). If ZeroGPU quota is exhausted or unavailable, all forward-pass, attention, and generation operations execute reliably on CPU without crashing.

---

## 2. Model Compatibility Matrix

| Model Family / Checkpoint | Parameters | Required RAM/VRAM | ZeroGPU Support | CPU Support | Recommended Runtime Mode |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Qwen/Qwen2.5-0.5B-Instruct** | 490M | ~1.0 GB fp32 | ✅ Supported | ✅ Excellent (~120ms/tok) | **Default resident model** |
| **Qwen/Qwen2.5-1.5B-Instruct** | 1.54B | ~3.2 GB fp32 | ✅ Supported | ⚠️ Slower (~400ms/tok) | Supported via HF selector |
| **meta-llama/Llama-3.2-1B** | 1.23B | ~2.5 GB fp32 | ✅ Supported | ⚠️ Moderate (~350ms/tok) | Requires user HF token for gated weights |
| **meta-llama/Llama-3.2-3B** | 3.21B | ~6.5 GB fp32 | ✅ Supported | ❌ High latency on CPU | Requires ZeroGPU allocation |
| **mistralai/Mistral-7B-v0.1** | 7.24B | ~14.5 GB fp16 | ⚠️ Near VRAM limit | ❌ Exceeds practical CPU budget | High latency on Free tier |
| **deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B** | 1.5B | ~3.0 GB fp32 | ✅ Supported | ⚠️ Slower (~450ms/tok) | Supported via HF selector |
| **Custom `.gguf` Uploads** | Variable | 0.5 – 8 GB | ⚠️ CPU/NEON only | ✅ Fast with Q4_K_M | Metadata & inference supported |

---

## 3. Storage & Persistence Limitations

1. **Ephemeral Filesystem:**
   - The Hugging Face container disk is ephemeral (~50 GB non-persistent scratch space).
   - Any `.gguf` model uploaded via `POST /gguf/upload` will persist only for the lifetime of that container session. If the Space restarts or rebuilds, uploaded files in `data/gguf` are reset.
2. **Persistent Storage Option:**
   - Hugging Face offers Persistent Storage (Volume / Bucket), but this requires a paid tier.
   - For free hosting, users can either inspect remote Hugging Face Hub models directly or re-upload local `.gguf` files as needed.

---

## 4. WebSocket & Real-Time Proxy Limitations

1. **Proxy Inactivity Timeout:**
   - Hugging Face's edge reverse proxy drops idle WebSocket connections after approximately 60 seconds without data transmission.
   - TokenPrint's `/ws/generate` streams continuous token frames during generation, preventing proxy drops.
   - For `/ws/collab`, periodic cursor/presence heartbeats maintain the connection.
2. **Secure Protocol Requirement:**
   - The public URL enforces TLS (`https://...`). All WebSocket handshakes from the browser must use `wss://`. Calling `ws://` will fail due to mixed-content browser security policies.

---

## 5. llama-cpp-python Native Compilation

- `llama-cpp-python` requires native C++ compilation with platform-specific flags.
- To prevent Space build timeouts, `llama-cpp-python` is treated as an optional dependency.
- TokenPrint's backend gracefully degrades:
  - If `llama-cpp-python` is absent, `GGUF_ENGINE_AVAILABLE = False`.
  - GGUF file uploads, byte validation, and metadata extraction continue to work.
  - Native PyTorch models (`Qwen2.5`, `Llama`, `Gemma`) run at full precision without external C++ bindings.
