# Deployment

TokenPrint is two deployable pieces with very different needs:

- **Frontend** — a static-ish Next.js app. Deploys anywhere (Vercel, Netlify,
  Cloudflare Pages, a static host).
- **Backend** — FastAPI + PyTorch that loads a ~1GB model and streams generation
  over WebSocket. Needs a **persistent process** with enough RAM and long-lived
  connections. This does **not** fit serverless platforms (Vercel/Netlify
  functions) — size limits, execution timeouts, and no persistent WebSockets.

The frontend is already environment-driven: `lib/api.ts` reads
`NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) and `lib/ws.ts` derives
the WebSocket URL from it (`http→ws`, `https→wss`). Set that one variable and the
whole app points at a hosted backend.

## Option A — frontend only (fastest)

Deploy just the Next.js app. Works standalone for the **Architecture Explorer via
`.gguf` drag-and-drop** (parsed client-side, no backend). "Use live Qwen model",
Generation, and Walkthrough will show "Failed to fetch" until a backend is
reachable.

### Vercel

1. Import the GitHub repo.
2. **Set Root Directory to `frontend`** — the repo is a monorepo; this is required.
3. Build command `next build`, output auto-detected. Deploy.

## Option B — full app (frontend + hosted backend)

Host the backend on a platform that supports long-running Python + WebSockets:
**Render, Railway, Fly.io, or a Hugging Face Space** (or any VM/container host).

### 1. Backend

Run the same command the dev setup uses, bound to the platform's port:

```bash
pip install -r backend/requirements.txt
python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port $PORT
```

Notes:
- First boot downloads `Qwen/Qwen2.5-0.5B-Instruct` (~1GB) from Hugging Face;
  give it a persistent disk/cache or expect a cold-start download.
- CPU is fine at this model size; no GPU required.
- `NEUROSCOPE_MODEL` / `NEUROSCOPE_DEVICE` env vars override the model and device.

### 2. CORS

The backend restricts origins in `backend/app/main.py`. Add your deployed
frontend origin:

```python
allow_origins=[
    "http://localhost:3000",
    "https://your-app.vercel.app",   # <- your deployed frontend
],
```

### 3. Frontend

Deploy as in Option A, and set the env var:

```
NEXT_PUBLIC_API_URL = https://your-backend-host
```

This drives both the REST calls and the WebSocket (`wss://…/ws/generate`).

## Sanity checklist

- [ ] Backend `GET /health` returns `{"status":"ok","model_loaded":true}`.
- [ ] `GET /architecture` returns from the deployed backend origin without a CORS
      error in the browser console.
- [ ] `NEXT_PUBLIC_API_URL` has **no trailing slash** and uses `https` in prod.
- [ ] The deployed frontend origin is in the backend's `allow_origins`.
- [ ] A `.gguf` drag-and-drop works even with the backend down (client-side path).
