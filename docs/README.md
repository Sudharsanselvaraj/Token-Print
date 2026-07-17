# LLMStudio documentation

LLMStudio is a browser-based 3D inspector for language-model internals. Every
value it shows comes from real parsed model files or a real forward pass —
nothing is illustrative or hardcoded.

## Contents

- [**Architecture**](architecture.md) — how the backend, frontend and the three
  modes fit together, and how data flows.
- [**API reference**](api.md) — the backend HTTP + WebSocket endpoints.
- [**GGUF format**](gguf-format.md) — what the client-side GGUF parser reads and
  how it maps to the UI.
- [**Development**](development.md) — setup, running, and where things live.
- [**Verification**](verification.md) — how the "the data is real" claim is
  proven, with concrete numbers.

## The three modes

| Mode | What it shows | Data source |
| ---- | ------------- | ----------- |
| **Architecture** | A 3D point cloud of a model's real tensors, an architecture stat grid, and a scrollable tensor list. | The live model (`GET /architecture`) **or** a drag-and-dropped `.gguf` parsed client-side. |
| **Generation** | A streamed real greedy generation, walked operation by operation with real parameter counts, formulas, and weight previews, plus a token strip. | `WS /ws/generate` (real forward pass + op catalog). |
| **Walkthrough** | A chaptered explanation where every number is read from a real forward pass and the 3D advances in lockstep. | `POST /analyze` (real attention + geometry). |

## Guiding principle

> Every visualized number — parameter counts, tensor shapes, attention weights,
> logits, layer activations — is derived from real parsed model data or a real
> forward pass. If real data can't cleanly support a visual, the visual is
> adjusted or labeled, never faked.
