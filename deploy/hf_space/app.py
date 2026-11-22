"""TokenPrint Backend — Hugging Face Space Application Entrypoint.

Exposes the complete TokenPrint FastAPI backend alongside the custom Gradio 6
system console for live health diagnostics, hardware telemetry, and real-time forward pass testing.
"""

from __future__ import annotations

import logging
import os
import sys

# Detect ZeroGPU environment dynamically
try:
    import spaces
    HAS_ZEROGPU = True
except ImportError:
    HAS_ZEROGPU = False

import gradio as gr
from console_ui import build_console, CONSOLE_THEME, CONSOLE_CSS
from app.main import app, engine, _require_engine

logger = logging.getLogger("tokenprint-space")
logging.basicConfig(level=logging.INFO)


def health_fn() -> dict:
    """Return live status of resident model engine and compute environment."""
    from app import main as app_main
    eng = getattr(app_main, "engine", None)
    device_name = "cpu"
    if eng and getattr(eng, "device", None):
        device_name = str(eng.device)

    return {
        "status": "Online",
        "zerogpu": "Active" if HAS_ZEROGPU else "Inactive (CPU / Standard)",
        "model": eng.model_id if eng else "Qwen/Qwen2.5-0.5B-Instruct",
        "mode": eng.mode if eng else "causal_lm",
        "device": device_name,
        "layers": getattr(eng, "num_layers", 24) if eng else 24,
        "heads": getattr(eng, "num_heads", 14) if eng else 14,
        "hidden_size": getattr(eng, "hidden_size", 896) if eng else 896,
    }


def analyze_fn(prompt: str) -> dict:
    """Execute forward-pass analysis and return extracted tokens and metrics."""
    eng = _require_engine()
    res = eng.analyze(prompt)
    if hasattr(res, "model_dump"):
        return res.model_dump()
    elif hasattr(res, "dict"):
        return res.dict()
    return res if isinstance(res, dict) else {}


# Top-level ZeroGPU runner functions for dynamic AST binding
def hf_space_analyze(sentence: str):
    eng = _require_engine()
    return eng.analyze(sentence)

def hf_space_debug_analyze(sentence: str):
    eng = _require_engine()
    return eng.debug_analyze(sentence)

def hf_space_ablate(sentence: str, layers: list, heads: list):
    eng = _require_engine()
    from app.ablation import Ablation
    with Ablation(eng.model.model, zero_heads=heads, zero_layers=set(layers)):
        return eng.analyze(sentence)

def hf_space_patch(sentence: str, source_sentence: str, patch_layers: list):
    eng = _require_engine()
    return eng.analyze_patched(sentence, source_sentence, patch_layers)

def hf_space_generate_steps(
    prompt: str,
    max_new_tokens: int = 40,
    top_k: int = 10,
    use_chat_template: bool = True,
    include_catalog: bool = False,
    decoding_mode: str = "greedy",
    window_size: int = 512,
    draft_gamma: int = 4,
    needle: str | None = None,
    temperature: float = 1.0,
    top_p: float = 1.0,
    seed: int | None = None,
):
    """Execute autoregressive generation on NVIDIA ZeroGPU and collect streamed frames."""
    eng = _require_engine()
    collector: list[dict] = []

    def _sync_sink(payload: dict):
        collector.append(payload)

    eng.generate_stream_sync(
        prompt=prompt,
        max_new_tokens=max_new_tokens,
        top_k=top_k,
        use_chat_template=use_chat_template,
        include_catalog=include_catalog,
        decoding_mode=decoding_mode,
        window_size=window_size,
        draft_gamma=draft_gamma,
        needle=needle,
        temperature=temperature,
        top_p=top_p,
        seed=seed,
        sink=_sync_sink,
    )
    return collector


# Apply ZeroGPU acceleration decorator when running in ZeroGPU container
if HAS_ZEROGPU:
    logger.info("ZeroGPU runtime detected: wrapping model runners with @spaces.GPU(duration=60)")
    hf_space_analyze = spaces.GPU(duration=60)(hf_space_analyze)
    hf_space_debug_analyze = spaces.GPU(duration=60)(hf_space_debug_analyze)
    hf_space_ablate = spaces.GPU(duration=60)(hf_space_ablate)
    hf_space_patch = spaces.GPU(duration=60)(hf_space_patch)
    hf_space_generate_steps = spaces.GPU(duration=60)(hf_space_generate_steps)
else:
    logger.info("ZeroGPU runtime unavailable: running model runners on local device / CPU")


# Build the Gradio 6 console
demo = build_console(health_fn, analyze_fn)

# Launch Gradio server on Hugging Face Space port
port = int(os.environ.get("PORT", "7860"))
logger.info("Launching Gradio interface on 0.0.0.0:%d", port)
demo.launch(
    server_name="0.0.0.0",
    server_port=port,
    theme=CONSOLE_THEME,
    css=CONSOLE_CSS,
    prevent_thread_lock=True,
    ssr_mode=False,
)

# Attach all TokenPrint FastAPI endpoints BEFORE Gradio's catch-all SPA route
from app import main as app_main
for route in reversed(app_main.app.routes):
    demo.app.router.routes.insert(0, route)

# Register FastAPI startup & shutdown lifecycle handlers on the active Gradio ASGI app
@demo.app.on_event("startup")
async def on_startup():
    if app_main.engine is None:
        from app.model import ModelEngine
        logger.info("Lifespan startup: initializing resident model engine...")
        app_main.engine = ModelEngine()
        logger.info(
            "Lifespan startup complete: %s on %s (%d layers, %d heads)",
            app_main.engine.model_id,
            app_main.engine.device,
            app_main.engine.num_layers,
            app_main.engine.num_heads,
        )

@demo.app.on_event("shutdown")
async def on_shutdown():
    logger.info("Lifespan shutdown: clearing resident caches...")
    if hasattr(app_main, "_gguf_cache"):
        app_main._gguf_cache.clear()
    if app_main.engine is not None:
        if hasattr(app_main.engine, "model") and app_main.engine.model is not None:
            del app_main.engine.model
        app_main.engine = None
    logger.info("Lifespan shutdown: resources successfully released.")

# Pre-warm resident model engine to ensure immediate readiness for API clients
if app_main.engine is None:
    from app.model import ModelEngine
    logger.info("Pre-warming resident model engine...")
    app_main.engine = ModelEngine()

# Keep Space container running indefinitely
demo.block_thread()
