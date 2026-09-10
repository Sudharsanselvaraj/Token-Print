# TokenPrint Contributor Issue Map & Good First Issues

Welcome! TokenPrint is an open-source visual debugger for LLM execution built with **FastAPI**, **PyTorch**, **Next.js**, and **React Three Fiber**.

Whether you are looking for your first 10-minute open-source contribution or a deep research task in mechanistic interpretability, this page maps active work items by difficulty.

---

## 🟢 Good First Issues (Beginner)

Ideal for new contributors looking to get familiar with the repository layout and codebase.

| Issue ID | Title | Domain | Key Files | Description |
| :--- | :--- | :--- | :--- | :--- |
| **GFI-01** | Add provenance badges (`REAL`, `DERIVED`, `SIMULATION`) to remaining UI panels | Frontend (React) | `frontend/components/ui/` | Ensure all statistics panels use `<DataProvenanceBadge />` to indicate data origin. |
| **GFI-02** | Add fallback empty states for unsupported features | Frontend (React) | `frontend/components/ui/` | Replace empty visual frames with human-readable cards explaining missing data. |
| **GFI-03** | Update model capability badges in Architecture panel | Frontend / Docs | `frontend/components/ui/ArchitecturePanel.tsx` | Display capability tags based on detected model family. |
| **GFI-04** | Fix stale trace-client script API endpoint | Python Script | `scripts/trace_client.py` | Align `trace_client.py` with `/trace` and `/ws/generate` backend routes. |

---

## 🟡 Intermediate Issues

Good for developers with React / WebGL / Python experience.

| Issue ID | Title | Domain | Key Files | Description |
| :--- | :--- | :--- | :--- | :--- |
| **INT-01** | Add Pytest automated test suite for backend routes | Backend (Python) | `backend/tests/` | Create unit tests for `/analyze`, `/trace`, `/ablate/analyze`, and schema validation. |
| **INT-02** | Add Vitest unit tests for GGUF dequantization | Frontend (TS) | `frontend/lib/gguf/dequant.ts` | Add unit tests verifying Q4_K and Q8_0 tensor parsing correctness. |
| **INT-03** | Deterministic visual randomness generator | Frontend (WebGL) | `frontend/lib/pointcloud.ts` | Replace non-deterministic jitter with seeded hashes from tensor names. |
| **INT-04** | Optional GGUF `llama-cpp-python` dependency setup | Packaging / CI | `backend/requirements-gguf.txt` | Create modular setup configs for optional GGUF execution. |

---

## 🔴 Advanced Issues

For experienced engine developers, 3D graphics coders, or backend architects.

| Issue ID | Title | Domain | Key Files | Description |
| :--- | :--- | :--- | :--- | :--- |
| **ADV-01** | Architecture-correct attention head ablation | PyTorch / Interpretability | `backend/app/ablation.py`, `model.py` | Intervene at individual head output matrices before concatenation and $W_O$ projection. |
| **ADV-02** | Model Capability Adapter abstraction | PyTorch Architecture | `backend/app/adapters/` | Implement modular adapter classes (`ModelAdapter`) for flexible architecture support. |
| **ADV-03** | Speculative decoding KV cache state machine | PyTorch / Backend | `backend/app/model.py` | Ensure rejected draft tokens are cleanly purged from KV cache states. |

---

## 🔬 Research & Flagship Tasks

For ML researchers and interpretability practitioners.

| Task ID | Title | Focus Area | Goal |
| :--- | :--- | :--- | :--- |
| **RES-01** | Causal RAG Attribution Interventions | Interpretability | Isolate attention mass vs causal influence during RAG retrieval. |
| **RES-02** | Cross-Quantization Trace Diffing | Model Quantization | Compare activation drift between FP16, Q8_0, and Q4_K forward passes. |

---

## How to Get Started

1. Pick an issue above or check open issues on [GitHub Issues](https://github.com/Sudharsanselvaraj/Token-Print/issues).
2. Read the [Developer Guide](docs/DEVELOPMENT.md) and [Architecture Guide](docs/ARCHITECTURE.md).
3. Fork the repository, create a topic branch (`feat/gfi-01-provenance-badges`), and open a Pull Request!
