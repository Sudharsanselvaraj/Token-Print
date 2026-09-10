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
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .ablation import Ablation
from .debug import DebugCapture
from .model import ModelEngine, TokenizedTooLong
from .reduce import chunk_attribution, query_self_attribution, ungrounded_flags
from .schemas import (
    AblateRequest,
    AnalyzeRequest,
    AnalyzeResponse,
    ModelInfo,
    PatchRequest,
    RagAnalyzeRequest,
    RagAnalyzeResponse,
    RagChunk,
)
from .trace import TraceRecorder, serialize_trace, parse_trace

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("neuroscope")

# Single process-wide engine handle, populated in the lifespan handler.
engine: ModelEngine | None = None

# Last recorded trace (kept in memory; overwritten each generation).
_last_trace: dict | None = None


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
    return {"status": "ok", "model_loaded": engine is not None}


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
        return _require_engine().checkpoint_architecture(model_id)
    return _require_engine().architecture()


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    eng = _require_engine()
    try:
        # The forward pass is CPU/GPU-bound and holds an internal lock; run it off
        # the event loop so the server stays responsive.
        import anyio

        data = await anyio.to_thread.run_sync(eng.analyze, req.sentence)
    except TokenizedTooLong as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
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
    use_chat_template = bool(req.get("use_chat_template", True))
    include_catalog = bool(req.get("trace", False))
    record_trace = bool(req.get("record_trace", False))

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue(maxsize=32)
    SENTINEL = object()

    # Trace recorder — captures frames when record_trace is requested.
    recorder: TraceRecorder | None = None

    def worker() -> None:
        nonlocal recorder
        try:
            for frame in engine.generate_steps(
                prompt, max_new_tokens, top_k, use_chat_template, include_catalog
            ):
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
        except Exception as exc:  # surface generation errors to the client
            asyncio.run_coroutine_threadsafe(
                queue.put({"type": "error", "message": str(exc)}), loop
            ).result()
        finally:
            asyncio.run_coroutine_threadsafe(queue.put(SENTINEL), loop)

    # Only create a recorder if the client asked for it.
    if record_trace:
        recorder = TraceRecorder({"prompt": prompt})

    worker_future = loop.run_in_executor(None, worker)
    try:
        while True:
            frame = await queue.get()
            if frame is SENTINEL:
                break
            await ws.send_json(frame)
    except WebSocketDisconnect:
        pass
    finally:
        # Store the completed trace so it can be downloaded later.
        if recorder is not None and recorder._done is not None:
            _last_trace = recorder.build()
            logger.info(
                "Trace recorded: %d frames, prompt=%r",
                len(recorder._frames),
                prompt[:80],
            )
        await worker_future
        try:
            await ws.close()  # graceful close frame after the stream ends
        except RuntimeError:
            pass  # already closed / client gone


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
