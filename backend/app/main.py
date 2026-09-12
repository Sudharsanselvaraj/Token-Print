"""FastAPI application for NeuroScope.

Endpoints:
  * GET  /health      — liveness + whether the model is loaded
  * GET  /model-info  — model metadata (layers, heads, hidden size, device)
  * POST /analyze     — real attention data for a sentence
  * POST /rag/analyze — chunk-level attribution reduction over real attention
  * GET  /architecture — real tensor list (Explorer data source)
  * WS   /ws/generate — streamed greedy generation
  * GET  /trace       — download the last recorded generation as a JSON trace file
  * POST /trace/replay — upload a trace JSON and replay it to the caller

The model is loaded ONCE at startup via the lifespan handler, never per request.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import (
    FastAPI,
    File,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .ablation import Ablation
from .gguf_engine import GGUFEngine
from .model import ModelEngine, TokenizedTooLong
from .reduce import chunk_attribution, query_self_attribution, ungrounded_flags
from .schemas import (
    AblateRequest,
    AnalyzeImageRequest,
    AnalyzeRequest,
    AnalyzeResponse,
    ModelInfo,
    PatchRequest,
    RagAnalyzeRequest,
    RagAnalyzeResponse,
    RagChunk,
)
from .trace import TraceRecorder, parse_trace, serialize_trace

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("neuroscope")

# Single process-wide engine handle, populated in the lifespan handler.
engine: ModelEngine | None = None

# Last recorded trace (kept in memory; overwritten each generation).
_last_trace: dict | None = None

# Directory that holds user GGUF files (issue #85). Generation district can
# switch to real quantized inference against any .gguf found here.
GGUF_DIR = Path(__file__).resolve().parent.parent / "data" / "gguf"
GGUF_DIR.mkdir(parents=True, exist_ok=True)

# Hard upload limit for GGUF files (ENG-09). 10 GB expressed in bytes.
MAX_GGUF_BYTES = 10 * 1024 * 1024 * 1024

# Cache of opened GGUF engines keyed by resolved path.
_gguf_engines: dict[str, GGUFEngine] = {}


def _resolve_gguf(path: str) -> str:
    """Canonicalize a requested GGUF path, forbidding traversal outside GGUF_DIR."""
    if not path or not isinstance(path, str):
        raise HTTPException(status_code=400, detail="Invalid GGUF path.")
    safe_name = os.path.basename(path)
    valid_map = {p.name: p.resolve() for p in GGUF_DIR.iterdir() if p.is_file()}
    if safe_name not in valid_map:
        raise HTTPException(status_code=404, detail="GGUF file not found in data/gguf.")
    return str(valid_map[safe_name])


def _gguf_engine_for(path: str) -> GGUFEngine:
    resolved = _resolve_gguf(path)
    if resolved not in _gguf_engines:
        _gguf_engines[resolved] = GGUFEngine(resolved)
    return _gguf_engines[resolved]


@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    logger.info("Loading model (first run downloads ~1GB from Hugging Face)...")
    engine = ModelEngine()
    logger.info(
        "Model ready: %s on %s (%d layers, %d heads, hidden %d)",
        engine.model_id,
        engine.device,
        engine.num_layers,
        engine.num_heads,
        engine.hidden_size,
    )
    yield
    engine = None


app = FastAPI(title="NeuroScope", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _require_engine() -> ModelEngine:
    if engine is None:
        raise HTTPException(status_code=503, detail="Model is still loading.")
    return engine


def _build_rag_prompt_and_char_ranges(
    query: str,
    chunks: list[RagChunk],
) -> tuple[str, dict[str, tuple[int, int]], tuple[int, int]]:
    parts: list[str] = []
    chunk_ranges: dict[str, tuple[int, int]] = {}
    cursor = 0

    def append(text: str) -> None:
        nonlocal cursor
        parts.append(text)
        cursor += len(text)

    append("Context:\n")
    for chunk in chunks:
        chunk_id = str(chunk.id)
        append(f"<chunk id={chunk_id}>")
        start = cursor
        append(chunk.text)
        end = cursor
        append("</chunk>\n")
        chunk_ranges[chunk_id] = (start, end)

    append("\n<query>")
    query_start = cursor
    append(query)
    query_end = cursor
    append("</query>")
    return "".join(parts), chunk_ranges, (query_start, query_end)


def _char_range_to_token_span(
    offsets: list[tuple[int, int]],
    char_range: tuple[int, int],
) -> tuple[int, int]:
    start, end = char_range
    token_idxs: list[int] = []
    for idx, (tok_start, tok_end) in enumerate(offsets):
        if tok_end <= tok_start:
            continue
        if tok_start < end and tok_end > start:
            token_idxs.append(idx)
    if not token_idxs:
        return (-1, -1)
    return (token_idxs[0], token_idxs[-1])


def _token_spans_from_char_ranges(
    tokenizer,
    prompt: str,
    chunk_char_ranges: dict[str, tuple[int, int]],
    query_char_range: tuple[int, int],
) -> tuple[dict[str, tuple[int, int]], tuple[int, int]]:
    enc = tokenizer(prompt, return_offsets_mapping=True)
    raw_offsets = enc.get("offset_mapping")
    if raw_offsets is None:
        raise HTTPException(
            status_code=500,
            detail="Tokenizer does not expose offset_mapping for RAG attribution.",
        )

    offsets = [(int(s), int(e)) for s, e in raw_offsets]
    chunk_spans = {
        chunk_id: _char_range_to_token_span(offsets, span)
        for chunk_id, span in chunk_char_ranges.items()
    }
    query_span = _char_range_to_token_span(offsets, query_char_range)
    return chunk_spans, query_span


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "model_loaded": engine is not None,
        "mode": engine.mode if engine is not None else None,
        "model_type": engine.model_type if engine is not None else None,
    }


@app.get("/model-info", response_model=ModelInfo)
async def model_info() -> ModelInfo:
    return ModelInfo(**_require_engine().info())


@app.get("/architecture")
async def architecture(model_id: str | None = None) -> dict:
    """Real architecture metadata + tensor list (Explorer data source).

    If ``model_id`` is provided, loads just the config for that HF model
    (no weights) and returns its architecture metadata. Otherwise returns
    the currently loaded model's metadata.
    """
    if model_id:
        try:
            return _require_engine().checkpoint_architecture(model_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=404,
                detail=f"Failed to fetch model architecture for '{model_id}': {exc}",
            ) from exc
    return _require_engine().architecture()


# --- GGUF quantized generation (issue #85) -------------------------------- //

def _quant_guess(filename: str) -> str:
    stem = Path(filename).stem.upper()
    for token in ("Q8_0", "Q6_K", "Q5_K_M", "Q5_K_S", "Q5_0", "Q4_K_M", "Q4_K_S", "Q4_0", "Q3_K", "Q2_K", "F16", "F32"):
        if token in stem:
            return token
    return "unknown"


@app.get("/gguf/list")
async def gguf_list() -> dict:
    """List server-side .gguf files eligible for real quantized generation."""
    items = []
    for p in sorted(GGUF_DIR.glob("*.gguf")):
        items.append(
            {
                "name": p.name,
                "path": p.name,
                "size_bytes": p.stat().st_size,
                "quant": _quant_guess(p.name),
                "loaded": str(p.resolve()) in _gguf_engines,
            }
        )
    return {"files": items}


@app.post("/gguf/upload")
async def gguf_upload(file: UploadFile = File(None)) -> dict:  # noqa: B008
    """Stream an uploaded .gguf into data/gguf so it can power generation."""
    if file is None or not (file.filename or "").lower().endswith(".gguf"):
        raise HTTPException(status_code=400, detail="Only .gguf files are accepted.")
    raw_name = file.filename or "model.gguf"
    safe = os.path.basename(raw_name)
    if not safe or safe != raw_name or ".." in safe or "/" in safe or "\\" in safe:
        raise HTTPException(status_code=400, detail="Invalid filename.")
    base_dir = GGUF_DIR.resolve()
    dest = (base_dir / safe).resolve()
    if not str(dest).startswith(str(base_dir) + os.sep):
        raise HTTPException(status_code=400, detail="Invalid target path.")
    size = 0
    try:
        with open(dest, "wb") as fh:  # noqa: ASYNC230
            while chunk := await file.read(8 << 20):  # 8 MB chunks
                size += len(chunk)
                if size > MAX_GGUF_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"Upload rejected: file exceeds the "
                            f"{MAX_GGUF_BYTES // (1024 ** 3)} GB limit."
                        ),
                    )
                fh.write(chunk)
    except HTTPException:
        dest.unlink(missing_ok=True)
        raise
    except Exception:
        dest.unlink(missing_ok=True)
        raise
    return {"name": safe, "path": safe, "size_bytes": size, "quant": _quant_guess(safe)}


@app.post("/gguf/open")
async def gguf_open(payload: dict = ...) -> dict:
    """Open (and cache) a server-side GGUF for generation; returns metadata."""
    path = str(payload.get("path") or "")
    if not path:
        raise HTTPException(status_code=400, detail="`path` is required.")
    resolved = _resolve_gguf(path)
    if resolved not in _gguf_engines:
        _gguf_engines[resolved] = GGUFEngine(resolved)
    try:
        meta = _gguf_engines[resolved].metadata()
    except (RuntimeError, ModuleNotFoundError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True, **meta}


from app.inference.adapters import select_model_adapter
from app.inference.capabilities import (
    BackendCapabilities,
    RuntimeCapabilities,
    calculate_effective_capabilities,
)
from app.inference.registry import registry as backend_registry
from app.schemas import HFInspectResponse, HFModelMeta, HFSearchResponse

# Simple in-memory cache for HF API responses with timestamp
_hf_search_cache: dict[str, tuple[float, HFSearchResponse]] = {}
_hf_inspect_cache: dict[str, tuple[float, HFInspectResponse]] = {}
_CACHE_TTL_SEARCH = 60.0  # seconds
_CACHE_TTL_INSPECT = 300.0  # seconds


@app.get("/api/hf/curated")
@app.get("/api/hf/curated/")
def hf_curated() -> dict:
    """Return config-driven list of curated Hugging Face models."""
    import yaml
    config_path = Path(__file__).resolve().parent / "config" / "curated_models.yaml"
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            return data or {"models": []}
    return {"models": []}


@app.get("/api/hf/search", response_model=HFSearchResponse)
@app.get("/api/hf/search/", response_model=HFSearchResponse)
def hf_search(query: str = "", limit: int = 10) -> HFSearchResponse:
    """Search Hugging Face Hub for text generation models with caching and safety bounds."""
    query = (query or "").strip()[:200]  # Sanitize and cap length
    limit = max(1, min(int(limit), 25))  # Bound limit between 1 and 25

    from app.hf_guard import safe_urlopen, sanitize_log, validate_search_term

    if query and not validate_search_term(query):
        # Reject control characters / non-url-safe input with an empty result.
        logger.warning("Rejected non-printable HF search term: %s", sanitize_log(query))
        return HFSearchResponse(query=query, limit=limit, models=[])

    cache_key = f"{query}:{limit}"
    now = time.time()
    if cache_key in _hf_search_cache:
        ts, cached_resp = _hf_search_cache[cache_key]
        if now - ts < _CACHE_TTL_SEARCH:
            return cached_resp

    import urllib.error
    import urllib.parse

    params: dict[str, str] = {"limit": str(limit), "filter": "text-generation"}
    if query:
        params["search"] = query
    url = "https://huggingface.co/api/models?" + urllib.parse.urlencode(params)

    try:
        import json

        with safe_urlopen(url) as resp:
            if resp.status != 200:
                raise HTTPException(status_code=502, detail="Failed to fetch search results from Hugging Face Hub.")
            raw_data = json.loads(resp.read(1 << 20).decode("utf-8"))  # Limit response size to 1MB
            
            models = []
            for item in raw_data:
                model_id = str(item.get("id") or item.get("modelId") or "")
                if not model_id:
                    continue
                models.append(
                    HFModelMeta(
                        id=model_id,
                        author=item.get("author", model_id.split("/")[0] if "/" in model_id else ""),
                        downloads=int(item.get("downloads", 0)),
                        likes=int(item.get("likes", 0)),
                        tags=item.get("tags", [])[:10],
                        pipeline_tag=str(item.get("pipeline_tag", "")),
                        last_modified=str(item.get("lastModified", "")),
                        private=bool(item.get("private", False)),
                    )
                )
            result = HFSearchResponse(query=query, limit=limit, models=models)
            _hf_search_cache[cache_key] = (now, result)
            return result
    except (urllib.error.URLError, OSError, ValueError) as exc:
        logger.warning("HF Hub search failed for '%s': %s", sanitize_log(query), exc)
        # Return empty search result fallback on error or network offline
        return HFSearchResponse(query=query, limit=limit, models=[])


@app.get("/api/hf/inspect", response_model=HFInspectResponse)
@app.get("/api/hf/inspect/", response_model=HFInspectResponse)
def hf_inspect(model_id: str) -> HFInspectResponse:
    """Fetch HF model config.json and compute deterministic EffectiveCapabilities matrix without downloading model weights."""
    from app.hf_guard import safe_urlopen, sanitize_log, validate_model_id

    model_id = (model_id or "").strip()
    if not validate_model_id(model_id):
        raise HTTPException(status_code=400, detail="Invalid Hugging Face model ID format.")

    now = time.time()
    if model_id in _hf_inspect_cache:
        ts, cached_resp = _hf_inspect_cache[model_id]
        if now - ts < _CACHE_TTL_INSPECT:
            return cached_resp

    try:
        import json

        # 1. Fetch commit revision SHA metadata
        meta_url = f"https://huggingface.co/api/models/{model_id}"
        revision = "main"
        with safe_urlopen(meta_url) as resp:
            if resp.status == 200:
                meta_json = json.loads(resp.read(1 << 20).decode("utf-8"))
                revision = meta_json.get("sha") or meta_json.get("revision") or "main"

        # 2. Fetch config.json
        config_url = f"https://huggingface.co/{model_id}/raw/main/config.json"
        with safe_urlopen(config_url) as resp:
            if resp.status != 200:
                raise HTTPException(status_code=404, detail=f"Config for model '{model_id}' not found on Hugging Face Hub.")
            config_json = json.loads(resp.read(1 << 20).decode("utf-8"))

        # 3. Select deterministic adapter & compute capabilities
        adapter = select_model_adapter(config_json)
        mod_caps = adapter.get_capabilities(config_json)
        backend_caps = BackendCapabilities(
            backend_name="hf_local",
            can_capture_attention=True,
            can_capture_hidden_states=True,
            can_ablate=True,
            can_patch=True,
        )
        runtime_caps = RuntimeCapabilities(device="cpu")
        eff_caps = calculate_effective_capabilities(mod_caps, backend_caps, runtime_caps)

        result = HFInspectResponse(
            model_id=model_id,
            revision=revision,
            architecture=mod_caps.architecture,
            model_type=str(config_json.get("model_type", "")),
            parameter_count=mod_caps.parameter_count,
            max_context_length=mod_caps.max_context_length,
            estimated_vram_gb=mod_caps.vram_estimate.estimated_vram_gb if mod_caps.vram_estimate else 2.0,
            estimation_basis=mod_caps.vram_estimate.estimation_basis if mod_caps.vram_estimate else "",
            compatibility_level=eff_caps.compatibility_level,
            compatibility_reason=eff_caps.compatibility_reason,
            capabilities=eff_caps.model_dump(),
        )
        _hf_inspect_cache[model_id] = (now, result)
        return result
    except HTTPException:
        raise
    except ValueError as exc:
        logger.warning("HF inspection rejected for '%s': %s", sanitize_log(model_id), exc)
        raise HTTPException(status_code=400, detail="Model inspection blocked by security policy.") from exc
    except Exception as exc:
        logger.error("HF inspection error for '%s': %s", sanitize_log(model_id), exc)
        raise HTTPException(status_code=500, detail="Failed to inspect model.") from exc


@app.get("/api/model/capabilities")
@app.get("/api/model/capabilities/")
async def model_capabilities() -> dict:
    """Return effective capabilities of currently loaded model."""
    eng = _require_engine()
    from app.inference.adapters import select_model_adapter
    config_dict = {
        "architectures": [eng.model.__class__.__name__] if getattr(eng, "model", None) else ["Qwen2ForCausalLM"],
        "model_type": eng.model_type or "qwen2",
        "num_hidden_layers": eng.num_layers,
        "hidden_size": eng.hidden_size,
    }
    adapter = select_model_adapter(config_dict)
    mod_caps = adapter.get_capabilities(config_dict)
    backend_caps = BackendCapabilities(backend_name="hf_local")
    runtime_caps = RuntimeCapabilities(device=eng.device)
    eff = calculate_effective_capabilities(mod_caps, backend_caps, runtime_caps)
    return eff.model_dump()


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    _require_engine()
    try:
        # Route analyze call through InferenceBackendRegistry
        import anyio

        backend = backend_registry.get_backend("hf_local")
        resp = await anyio.to_thread.run_sync(
            asyncio.run, backend.analyze(req.sentence)
        )
    except TokenizedTooLong as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return resp



@app.post("/analyze/image", response_model=AnalyzeResponse)
async def analyze_image(req: AnalyzeImageRequest) -> AnalyzeResponse:
    """Vision-transformer forward pass over an image (issue #87).

    Patches are surfaced as "tokens"; every value is a real forward-pass
    number from the loaded vision model.
    """
    eng = _require_engine()
    if eng.mode != "vision":
        raise HTTPException(
            status_code=400,
            detail=f"Loaded model ({eng.mode}) is not a vision transformer.",
        )
    import anyio

    data = await anyio.to_thread.run_sync(eng.analyze_image, req.image)
    return AnalyzeResponse(**data)


@app.post("/rag/analyze", response_model=RagAnalyzeResponse)
async def rag_analyze(req: RagAnalyzeRequest) -> RagAnalyzeResponse:
    eng = _require_engine()
    prompt, chunk_char_ranges, query_char_range = _build_rag_prompt_and_char_ranges(
        req.query,
        req.chunks,
    )
    chunk_spans, query_span = _token_spans_from_char_ranges(
        eng.tokenizer,
        prompt,
        chunk_char_ranges,
        query_char_range,
    )
    if query_span[0] < 0:
        raise HTTPException(
            status_code=400,
            detail="Could not map query text to tokens in composed RAG prompt.",
        )

    import anyio

    try:
        data = await anyio.to_thread.run_sync(eng.analyze, prompt)
    except TokenizedTooLong as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    attribution_result = chunk_attribution(
        attention=data["attention"],
        target_span=query_span,
        chunk_spans=chunk_spans,
    )
    query_self = query_self_attribution(
        attention=data["attention"],
        target_span=query_span,
        query_span=query_span,
    )

    if req.reduction_mode == "last_layer":
        primary_attribution = attribution_result["last_layer"]
        primary_query_self = query_self["last_layer"]
    else:
        primary_attribution = attribution_result["all_layers_mean"]
        primary_query_self = query_self["all_layers_mean"]

    data.update(
        {
            "query": req.query,
            "chunk_spans": {
                chunk_id: [span[0], span[1]] for chunk_id, span in chunk_spans.items()
            },
            "query_span": [query_span[0], query_span[1]],
            "attribution_chunk_ids": attribution_result["chunk_ids"],
            "attribution": primary_attribution,
            "attribution_all_layers_mean": attribution_result["all_layers_mean"],
            "attribution_last_layer": attribution_result["last_layer"],
            "query_self_attribution": primary_query_self,
            "ungrounded": ungrounded_flags(
                primary_attribution,
                primary_query_self,
                req.ungrounded_threshold,
            ),
        }
    )
    return RagAnalyzeResponse(**data)


# --------------------------------------------------------------------------- #
# Debug snapshot (v0.4)
# --------------------------------------------------------------------------- #

@app.get("/debug/ops")
async def debug_ops() -> list[dict]:
    """List every captured module path available during a debug forward pass."""
    return _require_engine().debug_ops


@app.post("/debug/analyze")
async def debug_analyze(req: AnalyzeRequest) -> dict:
    """Same as POST /analyze but also returns a ``debug_snapshot`` dict mapping
    module paths to sampled float arrays of their outputs."""
    eng = _require_engine()
    import anyio

    try:
        data = await anyio.to_thread.run_sync(eng.debug_analyze, req.sentence)
    except TokenizedTooLong as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return data


@app.post("/ablate/analyze")
async def ablate_analyze(req: AblateRequest) -> dict:
    """Run the forward pass with selected attention heads or layers ablated
    (zeroed out). Returns the same structure as /analyze."""
    eng = _require_engine()
    import anyio

    def run():
        with Ablation(
            eng.model.model,
            zero_heads=req.zero_heads,
            zero_layers=set(req.zero_layers),
        ):
            return eng.analyze(req.sentence)

    try:
        data = await anyio.to_thread.run_sync(run)
    except TokenizedTooLong as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return data


@app.post("/patch/analyze")
async def patch_analyze(req: PatchRequest) -> dict:
    """Activation patching (issue #75): run the target sentence with the
    residual stream at ``patch_layers`` replaced by the source sentence's
    captured states. Returns the patched analysis plus the clean (unpatched)
    and source analyses for comparison."""
    eng = _require_engine()
    import anyio

    def run():
        return eng.analyze_patched(
            req.sentence,
            req.source_sentence,
            list(req.patch_layers),
        )

    try:
        data = await anyio.to_thread.run_sync(run)
    except TokenizedTooLong as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return data


@app.websocket("/ws/generate")
async def ws_generate(ws: WebSocket) -> None:
    """Stream a real greedy generation, one message per generated token.

    The blocking decode loop runs in a worker thread; frames cross to the event
    loop through a *bounded* queue, which gives automatic backpressure — if the
    browser can't keep up, the queue fills and the generating thread blocks,
    so memory never balloons.

    When ``record_trace`` is set in the request, the full stream is tee'd into
    an in-memory trace that can later be downloaded via ``GET /trace``.
    """
    global _last_trace
    await ws.accept()
    if engine is None:
        await ws.send_json({"type": "error", "message": "Model is still loading."})
        await ws.close()
        return

    try:
        req = await ws.receive_json()
    except (WebSocketDisconnect, ValueError):
        return

    prompt = str(req.get("prompt", "")).strip()
    if not prompt:
        await ws.send_json({"type": "error", "message": "Empty prompt."})
        await ws.close()
        return

    max_new_tokens = req.get("max_new_tokens", 40)
    top_k = req.get("top_k", 10)
    temperature = float(req.get("temperature", 1.0))
    top_p = float(req.get("top_p", 1.0))
    seed = req.get("seed") or None
    use_chat_template = bool(req.get("use_chat_template", True))
    include_catalog = bool(req.get("trace", False))
    record_trace = bool(req.get("record_trace", False))
    decoding_mode = req.get("decoding_mode", "greedy")
    window_size = req.get("window_size", 512)
    draft_gamma = req.get("draft_gamma", 4)
    needle = req.get("needle") or None
    # Issue #85: when `gguf` names a server-side .gguf, generation runs on the
    # real quantized weights through llama.cpp instead of full-precision PyTorch.
    gguf_path: str | None = req.get("gguf") or None
    if gguf_path:
        _gguf_engine_for(gguf_path)  # open early so errors surface as a frame

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue(maxsize=32)
    SENTINEL = object()

    # Trace recorder — captures frames when record_trace is requested.
    recorder: TraceRecorder | None = None

    def worker() -> None:
        nonlocal recorder
        try:
            if gguf_path:
                frames = _gguf_engine_for(gguf_path).generate(
                    prompt, int(max_new_tokens), int(top_k),
                )
            else:
                frames = engine.generate_steps(
                    prompt, max_new_tokens, top_k, use_chat_template, include_catalog,
                    decoding_mode, window_size, draft_gamma, needle,
                    temperature, top_p, seed,
                )
            for frame in frames:
                # Tee to the recorder for trace capture.
                if recorder is not None:
                    if frame.get("type") == "meta":
                        recorder = TraceRecorder(frame)
                    elif frame.get("type") == "token":
                        recorder.add_frame(frame)
                    elif frame.get("type") == "done":
                        recorder.finalize(frame)
                # .result() blocks this thread until the queue has room -> backpressure.
                asyncio.run_coroutine_threadsafe(queue.put(frame), loop).result()
        except Exception as exc:  # noqa: BLE001 — surface generation errors to the client
            asyncio.run_coroutine_threadsafe(
                queue.put({"type": "error", "message": str(exc)}), loop
            ).result()
        finally:
            asyncio.run_coroutine_threadsafe(queue.put(SENTINEL), loop)

    # Only create a recorder if the client asked for it.
    if record_trace:
        recorder = TraceRecorder({"prompt": prompt})

    worker_task = asyncio.create_task(asyncio.to_thread(worker))
    try:
        while True:
            frame = await queue.get()
            if frame is SENTINEL:
                break
            await ws.send_json(frame)
    except WebSocketDisconnect:
        logger.info("WebSocket connection closed by client.")
    finally:
        # Store the completed trace so it can be downloaded later.
        if recorder is not None and recorder._done is not None:
            _last_trace = recorder.build()
            safe_prompt = prompt[:80].replace("\r", " ").replace("\n", " ")
            logger.info(
                "Trace recorded: %d frames, prompt=%r",
                len(recorder._frames),
                safe_prompt,
            )
        await asyncio.gather(worker_task)
        try:
            await ws.close()  # graceful close frame after the stream ends
        except RuntimeError:
            logger.debug("WebSocket already closed.")


# --------------------------------------------------------------------------- #
# Trace download
# --------------------------------------------------------------------------- #

@app.get("/trace")
async def download_trace() -> Response:
    """Download the last recorded generation as a JSON trace file.

    Returns 404 if no trace has been recorded yet in this server session.
    """
    if _last_trace is None:
        raise HTTPException(
            status_code=404,
            detail="No trace recorded yet. Start a generation with record_trace=true.",
        )
    body = serialize_trace(_last_trace)
    return Response(
        content=body,
        media_type="application/json",
        headers={
            "Content-Disposition": 'attachment; filename="tokenprint-trace.json"',
            "X-Trace-Version": str(_last_trace.get("trace_version", 1)),
        },
    )


@app.post("/trace/replay")
async def replay_trace(req_body: dict) -> dict:
    """Accept a trace JSON and return the parsed/validated trace.

    This lets the frontend validate a trace file it received via drag-and-drop
    and load it into the store.  The full trace dict is returned so the frontend
    can populate genMeta, genFrames, etc.
    """
    try:
        trace = parse_trace(req_body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return trace
