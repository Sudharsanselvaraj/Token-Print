# TokenPrint Developer Guide

This guide covers setup, development workflows, architecture principles, and testing practices for developers contributing to **TokenPrint**.

---

## 1. Prerequisites

- **Python**: 3.11+
- **Node.js**: 18.0+
- **Hardware**: Any modern macOS (Apple Silicon / Intel), Linux, or Windows machine. CUDA GPU, Apple Silicon MPS, or CPU fallback.

---

## 2. Environment Setup

### Backend Setup (FastAPI + PyTorch)

```bash
cd backend
python3 -m venv .venv --system-site-packages
source .venv/bin/activate
pip install -r requirements.txt

# Optional: GGUF execution support
pip install llama-cpp-python

# Run backend API server with auto-reload
python -m uvicorn app.main:app --app-dir . --port 8000 --reload
```

On first startup, the backend automatically downloads `Qwen/Qwen2.5-0.5B-Instruct` (~1 GB) into the local HuggingFace cache and initializes model hooks.

### Frontend Setup (Next.js 15 + R3F)

```bash
cd frontend
npm install

# Start local Next.js dev server
npm run dev
```

Navigate to `http://localhost:3000`. The frontend automatically connects to the backend at `http://localhost:8000`.

---

## 3. Code Verification & Quality Checks

TokenPrint strictly enforces a **"real data only"** policy. Before opening a PR, run verification commands:

```bash
# 1. Frontend Build & Data Integrity Check
cd frontend
npm run build

# 2. Backend Data Verification Scripts
cd backend
python3 scripts/verify_real_data.py
python3 scripts/verify_trace.py
```

`npm run build` runs `scripts/verify-data.sh`, which fails the build if `Math.random` is detected in application code without explicit justification.

---

## 4. Pull Request Conventions

- **Branch Naming**: `feat/short-description`, `fix/issue-number`, `docs/update-guide`.
- **Commit Messages**: Use conventional commits (`feat(ui): add provenance badge`, `fix(backend): correct head ablation math`).
- **PR Scope**: Keep PRs focused on single issues.

---

## 5. Additional Documentation

- [Architecture Guide](ARCHITECTURE.md) — System layout & data flow.
- [Good First Issues](../GOOD_FIRST_ISSUES.md) — Curated beginner tasks.
- [GGUF Format Specification](gguf-format.md) — In-browser binary parser details.
