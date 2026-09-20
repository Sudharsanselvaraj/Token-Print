# Supported local setup

Requirements: Python **3.11 or 3.12**, Node **20.9+** with npm, and enough disk/RAM for dependencies and a small model (allow several GB). From a fresh clone:

```sh
python3 scripts/start.py
```

The launcher creates `backend/.venv`, installs the declared Python dependencies and `npm ci` lockfile, downloads the default Qwen model with Hugging Face file progress, starts the backend, waits for model readiness, and opens a frontend service at http://localhost:3000. Visit that URL; Ctrl+C stops both services. Downloads reuse the normal Hugging Face cache.

```sh
python3 scripts/start.py --check          # prerequisites/port diagnostics only
python3 scripts/start.py --install-only   # no model download or service startup
python3 scripts/start.py --fresh --smoke   # reinstall, start, real generation check, stop
python3 scripts/start.py --backend-port 8100 --frontend-port 3100
python3 scripts/start.py --model Qwen/Qwen2.5-0.5B-Instruct --revision COMMIT_SHA
```

For reproducible experiments, use the resolved commit from the experiment file with `--revision`. `TOKENPRINT_MODEL`, `TOKENPRINT_REVISION`, and `TOKENPRINT_DEVICE=cpu` are also supported. A different model must be compatible with TokenPrint's existing inference adapters; selecting it does not create new instrumentation support.

- **Port occupied:** stop the existing service or choose unused ports. The launcher does not kill unrelated processes.
- **401/403 download:** check the model ID and authenticate with Hugging Face if gated. The default Qwen model is public.
- **Network/download interrupted:** rerun; Hugging Face reuses cached files. Check proxy settings and available disk space.
- **Backend exits or readiness times out:** read the Python error printed above the launcher message. Try `TOKENPRINT_DEVICE=cpu`, free RAM, or use the recorded demo without a backend.
- **Node/Python version error:** install the supported version and check `node --version` / `python3 --version` in the same terminal.

Optional quantized GGUF execution still uses `backend/requirements-gguf.txt`; it is not installed by the base launcher. The [development container](../.devcontainer/devcontainer.json) supplies the supported Python/Node tools.

The **Fresh installation** workflow runs on releases, manually, and setup-related PRs. It uses an empty virtual environment, installs frontend dependencies, downloads the public default model, checks backend readiness, performs a real two-token generation, checks the resolved model revision, and fetches the complete offline example. A release is not validated by a cached build alone.
