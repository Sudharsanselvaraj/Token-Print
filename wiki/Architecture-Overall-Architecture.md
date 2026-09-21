# Overall Architecture

## Overview

TokenPrint's overall system design follows a strict boundary between the server computing the math and the client rendering the pixels.

## Why it matters

Clear ownership at the boundaries improves reliability and simplifies debugging. If a number is wrong in the UI, you know to check the backend API response. If the number is correct in the API response but wrong in the UI, you know to check the frontend parser.

## How TokenPrint implements it

TokenPrint defines typed interfaces and explicit flow contracts across the overall architecture boundary. 

### The Core Contract
> **The backend serves JSON and never renders; the frontend renders and never fabricates numbers.**

The frontend (`frontend/`) uses a docked shell (CSS grid) avoiding floating overlays.
The backend (`backend/`) uses a headless FastAPI app holding a PyTorch model in memory.

### Browser-only path (in-browser inference)
Since [#329](https://github.com/Sudharsanselvaraj/Token-Print/pull/329), a pinned **GPT-2 ONNX bundle** can run entirely inside the browser (WebGPU or CPU/WASM) through an optional local engine registered into the same store seam as the WebSocket source — no network boundary, no backend. The store is engine-agnostic today: a live WebSocket sink, a recorded trace, or the in-browser engine all feed the same `FrameSink`. Scoped to greedy decoding (<=32 new tokens); attention and interventions still require the Python backend.

## Diagram

```mermaid
flowchart TD
    subgraph Browser Context
        UI[AppShell: CSS Grid]
        UI --> Top[TopBar]
        UI --> Side[Sidebar]
        UI --> Canvas[R3F Canvas]
        UI --> Right[Right Panel]
        UI --> Bot[Bottom Bar]
        
        State[lib/store: Zustand] -.-> UI
        LocalEngine[lib/browser/engine.ts: ONNX GPT-2] -.-> State
    end
    
    subgraph Network Boundary
        WS[WebSocket /ws/generate]
        REST[REST /architecture]
    end
    
    Browser Context <--> Network Boundary
    
    subgraph OS Context
        Network Boundary <--> API[main.py: FastAPI]
        API <--> Engine[model.py: PyTorch]
        Engine <--> Checkpoint[Qwen2.5 Weights]
    end
```

The `LocalEngine -- State` edge is the browser-only path: no network, no backend. It exists alongside (not instead of) the WebSocket and recorded-trace sources.

## Related pages
- [Frontend](Architecture-Frontend)
- [Backend](Architecture-Backend)

## Further reading
- [Project Architecture](../docs/architecture.md)

## Navigation
| Previous | Home | Next |
| --- | --- | --- |
| [Architecture](Architecture) | [Home](Home) | [Frontend](Architecture-Frontend) |
