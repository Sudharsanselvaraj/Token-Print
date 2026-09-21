# TokenPrint Developer Guide

This guide covers setup, development workflows, architecture principles, and testing practices for developers contributing to **TokenPrint**.

---

## 1. Prerequisites

- **Python**: 3.11+
- **Node.js**: 20.9+ (checked by `scripts/start.py`)
- **Hardware**: Any modern macOS (Apple Silicon / Intel), Linux, or Windows machine. CUDA GPU, Apple Silicon MPS, or CPU fallback.

---

## 2. Environment Setup

### One-command launcher (recommended)

```bash
python3 scripts/start.py
```

The launcher creates `backend/.venv`, installs declared Python dependencies and
the frontend lockfile, downloads the default Qwen model with progress, boots the
backend, waits for model readiness, and opens the frontend at
`http://localhost:3000`. Ctrl+C stops both services.

### Backend Setup (FastAPI + PyTorch)

```bash
cd backend
python3 -m venv .venv --system-site-packages
source .venv/bin/activate
pip install -r requirements.txt

# Optional: GGUF execution support
pip install -r requirements-gguf.txt

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

Navigate to `http://localhost:3000`. The frontend automatically connects to the backend at `http://localhost:8000`. For a backend-free first look, the home page can also run **browser GPT-2** (WebGPU/ONNX) directly — see [browser-inference.md](browser-inference.md).

---

## 3. Code Verification & Quality Checks

TokenPrint strictly enforces a **"real data only"** policy. Before opening a PR, run verification commands:

```bash
# 1. Frontend Typecheck & Data Integrity Check
cd frontend
npx tsc --noEmit          # type gate (next lint is unavailable)
npm run build             # runs scripts/verify-data.sh (fails on Math.random)

# 2. Visual + unit regression suite
npx playwright test       # tests/visual (chromium + unit projects)

# 3. Backend Data Verification Scripts
cd backend
python3 scripts/verify_real_data.py
python3 scripts/verify_trace.py
```

`npm run build` runs `scripts/verify-data.sh`, which fails the build if `Math.random` is detected in application code without explicit justification.

---

## 4. Pull Request Conventions

- **Branch Naming**: `feat/short-description`, `fix/issue-number`, `docs/update-guide`.
- **Commit Messages**: Use conventional commits (`feat(ui): add provenance badge`, `fix(backend): correct head ablation math`). Commitlint is enforced on PRs.
- **PR Scope**: Keep PRs focused on single issues. `main` is protected — always open a PR (auto-merge is configured for bot-maintained files like contributors and star counts).

---

## 5. Additional Documentation

- [Architecture Guide](architecture.md) — System layout & data flow.
- [Good First Issues](../GOOD_FIRST_ISSUES.md) — Curated beginner tasks.
- [GGUF Format Specification](gguf-format.md) — In-browser binary parser details.
- [Playwright / visual regressions](local-setup.md) — snapshot baselines (linux committed, darwin gitignored) and regeneration.
