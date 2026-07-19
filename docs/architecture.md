# Architecture

TokenPrint is split cleanly into three concerns: **parsing**, **inference**, and
**rendering**. The backend serves JSON and never renders; the frontend renders
and never fabricates numbers.

```
┌───────────────────────────── frontend (Next.js + R3F) ─────────────────────────────┐
│                                                                                      │
│  AppShell ── TopBar (logo, mode tabs, live stats)                                    │
│      │       Sidebar (per-mode controls)      RightPanel (per-mode inspector)        │
│      └────── Canvas → Scene (mode switch)                                            │
│                        ├── TensorCloud       (explorer)                              │
│                        ├── GenerationScene   (generation)                            │
│                        └── WalkthroughScene  (walkthrough)                           │
│                                                                                      │
│  lib/store.ts (zustand)   lib/gguf/ (client-side parser)   lib/formulas.ts (KaTeX)   │
│         │                          │                                                  │
└─────────┼──────────────────────────┼─────────────────────────────────────────────────┘
          │ fetch / WebSocket         │ reads local .gguf (no upload)
          ▼                           ▼
┌──────── backend (FastAPI) ────────┐   (client-only; the file never leaves the browser)
│  GET  /architecture   (tensors)   │
│  POST /analyze        (attention) │   ModelEngine ── Qwen/Qwen2.5-0.5B-Instruct
│  WS   /ws/generate    (op trace)  │        (MPS, eager attention, float32, loaded once)
└───────────────────────────────────┘
```

## Backend (`backend/app/`)

- **`model.py` — `ModelEngine`.** Loads the model once (in the FastAPI lifespan)
  with `attn_implementation="eager"` (required — the default SDPA path returns no
  attentions) and `float32` on MPS/CPU. Provides:
  - `analyze(sentence)` — one forward pass → tokens, the full
    `[layer][head][from][to]` attention tensor, and per-layer hidden states
    projected to 3D with PCA.
  - `generate_steps(...)` — a manual greedy decode loop yielding one frame per
    token (chosen token, top-k probabilities, per-layer activation stats). It
    threads real `past_key_values`, so each frame also reports its true KV-cache
    **phase** (`prefill` for step 0 over the whole prompt, `decode` after),
    positions computed, and cache length reused. A `trace` flag also emits the
    op catalog.
  - `_op_catalog()` — the ordered list of forward-pass operations with real
    per-op parameter counts, weight slices, and dims (static per model, cached).
  - `architecture()` — pure introspection of `named_parameters()` + `config`
    (no forward pass), the model-backed source for the explorer.
- **`main.py`** — thin FastAPI endpoints; the WebSocket runs the blocking decode
  loop in a worker thread bridged to the event loop by a bounded `asyncio.Queue`
  (backpressure).
- **`reduce.py`** — PCA projection to 3D.

## Frontend (`frontend/`)

- **`lib/store.ts`** — a single Zustand store holding the app mode, explorer
  state, generation stream + op-walkthrough playback, autoplay/speed/overlay
  settings, and walkthrough state. It lives outside React's render tree so 60fps
  `useFrame` reads don't re-render the UI.
- **`lib/playback.ts`** — pure helpers shared by the store, autoplay engine, and
  scenes: op→layer mapping, per-layer anchors for layer-by-layer stepping, and
  the real KV-cache `phaseInfo` (prefers backend fields, derives otherwise).
- **`components/PlaybackEngine.tsx`** — one headless ticker that drives all timed
  playback: generation autoplays layer-by-layer then rolls to the next token;
  walkthrough auto-advances chapters. Pacing is normalized by a speed multiplier,
  never fabricated. Pausing tears down the interval so playback (and the follow
  camera) freeze at the exact state.
- **`components/scenes/TransformerStack.tsx`** — the data-driven block geometry
  (GQA-clustered attention blades, SwiGLU funnel, dual RMSNorm waists, residual
  through-line), reused by both Generation and Walkthrough.
- **`components/SceneLoader.tsx`** — the WebGL boundary: probes for WebGL,
  remounts a fresh canvas on context loss, and shows a readable fallback instead
  of a broken-image icon.
- **`lib/gguf/`** — the client-side GGUF binary parser (see
  [gguf-format.md](gguf-format.md)).
- **`lib/pointcloud.ts`** — turns a tensor list into a `THREE.Points` cloud
  (layers as depth-colored panels, density ∝ real parameter counts).
- **`lib/formulas.ts`** — architecture-aware LaTeX formula sets, rendered with
  KaTeX; `detectArch()` picks RMSNorm/RoPE/SwiGLU (llama-family) vs
  LayerNorm/learned-pos/GELU (gpt2).
- **`components/`** — `AppShell` (chrome) + `scenes/` (3D) + `ui/` (panels).

## Data flow by mode

- **Architecture:** on mount, the shell calls `GET /architecture` (live model).
  Dragging a `.gguf` runs the client-side parser instead; both produce the same
  `TensorInfo[]`, which `pointcloud.ts` renders and `TensorList`/`ArchitecturePanel`
  display. Hover picking maps a rendered point back to its real tensor.
- **Generation:** `startGeneration()` opens the WebSocket with `trace:true`. The
  first frame carries the op catalog (sent once); token frames follow. Once a
  trace exists it **autoplays** — `PlaybackEngine` walks the recorded catalog
  layer-by-layer (no re-inference) and rolls to the next token at the end of the
  stack. The `TransformerStack` highlights the active op's real geometry, the
  follow camera eases to it, and the KV-phase readout + top-k skyline update from
  the current frame.
- **Walkthrough:** loads one real `/analyze` and steps through chapters that read
  real numbers from it while switching the 3D scene in lockstep.

## Why these choices

- **`THREE.Points`, not instanced meshes**, for the cloud — a single
  BufferGeometry is the right tool for hundreds of thousands to millions of
  points at 60fps.
- **Op catalog sent once, referenced by index** — weights are identical every
  token, so per-token frames stay tiny.
- **Client-side GGUF parsing** — only the file header is read, so multi-GB files
  parse instantly and nothing is uploaded.
