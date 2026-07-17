# LLMStudio

A browser-based 3D inspector for language-model internals. Everything shown is
**real data** — parsed from real model files or produced by a real forward pass.
Nothing is illustrative or hardcoded.

Three modes, selected from the top bar:

1. **Architecture** — a 3D point cloud of a model's real tensors (layers as
   depth-colored slabs), an architecture stat grid, and a scrollable tensor list
   with hover/click inspection. Two real sources:
   - the **live Qwen model** (via `GET /architecture`, from `named_parameters()`),
   - **drag-and-drop `.gguf` files**, parsed client-side by a real GGUF binary
     parser (no upload — only the file's header is read).
2. **Generation** — a real greedy generation streamed over WebSocket. A vertical
   layer tower highlights the operation currently being walked, the follow camera
   tracks it, and a right panel shows the real operation name, parameter count,
   cumulative "parameters used", the architecture-correct LaTeX formula, and a
   real weight-matrix preview. Play / step through the recorded op trace; a token
   strip fills with the real generated tokens.
3. **Walkthrough** — a chaptered explanation (Overview → Tokenization → Embedding
   → Layer Norm → Self-Attention → MLP → Softmax) where every number is read from
   a real forward pass and the 3D view advances in lockstep.

Architecture-aware formulas: the family is detected from the model's
architecture, so Qwen/Llama show **RMSNorm · RoPE · SwiGLU · GQA** and GPT-2-style
models show **LayerNorm · learned positions · GELU** — never the wrong set.

## Architecture

- **Backend** (`backend/`) — FastAPI. `GET /architecture` (real tensors + config,
  no forward pass), `POST /analyze` (real attention + PCA geometry), `WS
  /ws/generate` (streamed greedy generation; `trace:true` adds the real per-op
  catalog). Loads `Qwen/Qwen2.5-0.5B-Instruct` once on Apple **MPS**
  (`attn_implementation="eager"`, float32).
- **Frontend** (`frontend/`) — Next.js (app-router, TS) + React Three Fiber.
  `AppShell` = top bar + left sidebar + full-bleed canvas + right panel.
  `lib/gguf/` client-side GGUF parser; `lib/formulas.ts` KaTeX formula sets;
  `lib/pointcloud.ts` tensor→points; scenes under `components/scenes/`.

## Running it

```bash
# backend
cd backend
python3 -m venv .venv --system-site-packages
source .venv/bin/activate && pip install -r requirements.txt
python -m uvicorn app.main:app --app-dir . --port 8000

# frontend
cd frontend
npm install
npm run dev            # http://localhost:3000   (or: npm run build && npm run start)
```

## Proving the data is real

- **`backend/scripts/verify_architecture.py`** style / `GET /architecture`:
  qwen2, **494,032,768** params = sum of all 290 tensors exactly.
- **GGUF parser** (`frontend/lib/gguf/`) verified against real local GGUF v3
  files (Ollama blobs): **qwen3** (399 tensors, Q4_K, 8.19B) and **llama** 3.2
  (255 tensors, Q4_K, 3.21B) — tensor counts match the binary header; each shows
  its own real vocab / RoPE base / context.
- **`backend/scripts/verify_trace.py`** — the op catalog is real: 243 ops in true
  forward order, q_proj L0 = 803,712 params (matches the module), cumulative
  "parameters used" = 630M.
- **`backend/scripts/verify_real_data.py`** / **`verify_geometry.py`** — attention
  and PCA geometry match an independent forward pass; deterministic.

Visual capture uses a real (headed) Chrome window via `tools/*.mjs` — headless
Chrome on this machine doesn't reliably composite WebGL into screenshots.

## Notes & honest limitations

- The tensor point cloud needs only tensor shapes/offsets/types, so the GGUF
  parser reads just the file header. **Value inspection** is offered for F32/F16
  tensors; quantized tensors are labeled "needs dequantization" rather than faked.
- Point clouds use `THREE.Points` (one draw call) rather than instanced meshes —
  the right tool for hundreds of thousands of points on this GPU.
- The **live-generation model is Qwen** (real, loaded); GPT-2's formula set is
  wired and selected by architecture but not run locally (no local GPT-2).
- The walkthrough's **model-scale selector** rescales the 3D using each reference
  model's real published parameter count; all worked numbers come from the loaded
  Qwen model's real forward pass.
- Local GGUF test files are all dense; verifying MoE fields (`expert_count`) would
  need a small MoE GGUF download.

The logo/name is **LLMStudio** (`frontend/public/llmstudio-logo.png`).

## Documentation

Full docs live in [`docs/`](docs/):

- [Architecture](docs/architecture.md) — how the pieces fit together
- [API reference](docs/api.md) — the REST + WebSocket endpoints
- [GGUF format](docs/gguf-format.md) — what the client-side parser reads
- [Development](docs/development.md) — setup and where things live
- [Verification](docs/verification.md) — how "the data is real" is proven

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Please also
read the [Code of Conduct](CODE_OF_CONDUCT.md). Security issues: see
[SECURITY.md](SECURITY.md) (report privately, not via public issues).

## License

[MIT](LICENSE) © Sudharsan Selvaraj.
