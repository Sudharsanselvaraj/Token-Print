"""TokenPrint backend console for the Hugging Face Space (Gradio).

Pure UI: no model code lives here. app.py injects two callables so this file can
be dropped in without touching the ZeroGPU runners or the FastAPI mounting.

    health_fn() -> dict   keys (all optional): status, zerogpu, model, mode,
                          device, layers, heads, hidden_size
    analyze_fn(prompt: str) -> dict   an AnalyzeResponse-shaped dict (uses
                          tokens, model, device, num_layers, num_heads, hidden_size)

Gradio 6 takes theme/css in launch() or mount_gradio_app(), not in Blocks():

    from console_ui import build_console, CONSOLE_THEME, CONSOLE_CSS
    demo = build_console(health_fn, analyze_fn)
    demo.launch(theme=CONSOLE_THEME, css=CONSOLE_CSS, prevent_thread_lock=True, ssr_mode=False)
"""
from __future__ import annotations

import base64
import html
from pathlib import Path
import time
from typing import Any, Callable

import gradio as gr

SITE_URL = "https://tokenprint.in"
REPO_URL = "https://github.com/Sudharsanselvaraj/Token-Print"
DOCS_PATH = "/docs"  # FastAPI Swagger UI


def _load_icon_b64() -> str:
    """Load TokenPrint logo as base64 string from local filesystem if available."""
    candidate_paths = [
        Path(__file__).resolve().parent / "tokenprint-logo.png",
        Path(__file__).resolve().parents[2] / ".github" / "assets" / "tokenprint-logo.png",
        Path(__file__).resolve().parents[2] / "frontend" / "public" / "tokenprint-logo.png",
    ]
    for p in candidate_paths:
        if p.is_file():
            try:
                with open(p, "rb") as f:
                    return base64.b64encode(f.read()).decode("ascii")
            except Exception:
                pass
    return ""


_ICON_B64 = _load_icon_b64()

# Gradio 6 Theme Configuration
CONSOLE_THEME = gr.themes.Base(
    primary_hue="teal",
    secondary_hue="zinc",
    neutral_hue="zinc",
    font=[
        gr.themes.GoogleFont("Inter"),
        "ui-sans-serif",
        "system-ui",
        "-apple-system",
        "sans-serif",
    ],
    font_mono=[
        gr.themes.GoogleFont("JetBrains Mono"),
        "ui-monospace",
        "SFMono-Regular",
        "Menlo",
        "monospace",
    ],
).set(
    body_background_fill="#09090b",
    body_background_fill_dark="#09090b",
    block_background_fill="#0e0e11",
    block_background_fill_dark="#0e0e11",
    block_border_color="#27272a",
    block_border_color_dark="#27272a",
    button_primary_background_fill="#2dd4bf",
    button_primary_background_fill_dark="#2dd4bf",
    button_primary_text_color="#000000",
    button_primary_text_color_dark="#000000",
)

CONSOLE_CSS = """
/* TokenPrint HF Space Console — Custom Styling */
.gradio-container {
    max-width: 1040px !important;
    margin: 0 auto !important;
    padding: 32px 24px !important;
    background-color: #09090b !important;
    color: #f4f4f5 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
}

/* Header Area */
.tp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 28px;
    padding-bottom: 24px;
    border-bottom: 1px solid #1e1e24;
}
.tp-header-left {
    display: flex;
    align-items: center;
    gap: 16px;
}
.tp-logo {
    width: 48px;
    height: 48px;
    object-fit: contain;
    border-radius: 8px;
}
.tp-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
}
.tp-title {
    font-size: 22px;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
    letter-spacing: -0.02em;
}
.tp-desc {
    font-size: 13px;
    color: #a1a1aa;
    margin: 4px 0 0 0;
}
.tp-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background-color: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 500;
    color: #34d399;
}
.tp-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: #10b981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
}

/* Action Buttons */
.tp-actions {
    display: flex;
    gap: 10px;
    margin-top: 18px;
}
.tp-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 6px;
    text-decoration: none;
    transition: all 0.15s ease;
}
.tp-btn-primary {
    background-color: #2dd4bf;
    color: #000000 !important;
}
.tp-btn-primary:hover {
    background-color: #14b8a6;
}
.tp-btn-secondary {
    background-color: #18181b;
    color: #e4e4e7 !important;
    border: 1px solid #27272a;
}
.tp-btn-secondary:hover {
    background-color: #27272a;
    border-color: #3f3f46;
}

/* Section Headings */
.tp-section-heading {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #71717a;
    margin: 28px 0 12px 0;
}

/* Stat Grids */
.tp-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background-color: #0e0e11;
    border: 1px solid #27272a;
    border-radius: 8px;
    overflow: hidden;
}
.tp-stat-cell {
    padding: 14px 18px;
    border-right: 1px solid #1e1e24;
    border-bottom: 1px solid #1e1e24;
}
.tp-stat-cell:nth-child(4n) {
    border-right: none;
}
.tp-stat-cell:nth-child(n+5) {
    border-bottom: none;
}
.tp-stat-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #71717a;
    margin-bottom: 4px;
}
.tp-stat-value {
    font-size: 14px;
    font-weight: 500;
    color: #f4f4f5;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.tp-stat-value-highlight {
    font-size: 15px;
    font-weight: 600;
    color: #ffffff;
}

/* Token Badges */
.tp-tokens-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
}
.tp-token-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background-color: #141418;
    border: 1px solid #27272a;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    color: #e4e4e7;
}
.tp-token-chip.special {
    background-color: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.4);
    color: #34d399;
}
.tp-token-id {
    font-size: 10px;
    color: #71717a;
}
.tp-token-chip.special .tp-token-id {
    color: #10b981;
}

/* Prompt Input & Button Styling */
.tp-prompt-container textarea {
    background-color: #0e0e11 !important;
    border: 1px solid #27272a !important;
    color: #f4f4f5 !important;
    font-size: 14px !important;
    border-radius: 8px !important;
}
.tp-prompt-container textarea:focus {
    border-color: #2dd4bf !important;
    box-shadow: 0 0 0 1px #2dd4bf !important;
}

/* Footer */
.tp-footer {
    margin-top: 48px;
    padding-top: 20px;
    border-top: 1px solid #1e1e24;
    text-align: center;
    font-size: 12px;
    color: #71717a;
}
.tp-footer a {
    color: #a1a1aa;
    text-decoration: none;
    margin: 0 8px;
    transition: color 0.15s ease;
}
.tp-footer a:hover {
    color: #f4f4f5;
}
"""


def _render_header_html() -> str:
    """Generate top header with logo, title, online badge, and external action links."""
    logo_img_tag = (
        f'<img src="data:image/png;base64,{_ICON_B64}" alt="TokenPrint" class="tp-logo" />'
        if _ICON_B64
        else '<div class="tp-logo" style="background:#2dd4bf;border-radius:8px;"></div>'
    )

    return f"""
<div class="tp-header">
    <div class="tp-header-left">
        {logo_img_tag}
        <div>
            <div class="tp-title-row">
                <h1 class="tp-title">TokenPrint Backend</h1>
                <span class="tp-status-badge">
                    <span class="tp-status-dot"></span>
                    Online
                </span>
            </div>
            <p class="tp-desc">Inference and instrumentation engine behind the TokenPrint 3D transformer debugger.</p>
            <div class="tp-actions">
                <a href="{SITE_URL}" target="_blank" class="tp-btn tp-btn-primary">Open TokenPrint</a>
                <a href="{DOCS_PATH}" target="_blank" class="tp-btn tp-btn-secondary">API reference (Swagger)</a>
                <a href="{REPO_URL}" target="_blank" class="tp-btn tp-btn-secondary">Source on GitHub</a>
            </div>
        </div>
    </div>
</div>
"""


def _render_engine_grid_html(health: dict) -> str:
    """Render 4x2 stat grid for engine health and hardware residency."""
    model_id = health.get("model", health.get("Resident Model", "Qwen/Qwen2.5-0.5B-Instruct"))
    device = health.get("device", health.get("Compute Device", "cpu"))
    zerogpu = health.get("zerogpu", health.get("ZeroGPU Enabled", "Active"))
    mode = health.get("mode", health.get("Mode", "causal_lm"))
    layers = str(health.get("layers", health.get("Total Layers", 24)))
    heads = str(health.get("heads", health.get("Attention Heads", 14)))
    hidden_size = str(health.get("hidden_size", health.get("Hidden Size", 896)))
    status = health.get("status", health.get("Status", "Online"))

    return f"""
<div class="tp-section-heading">Engine</div>
<div class="tp-stat-grid">
    <div class="tp-stat-cell">
        <div class="tp-stat-label">Model</div>
        <div class="tp-stat-value">{html.escape(str(model_id))}</div>
    </div>
    <div class="tp-stat-cell">
        <div class="tp-stat-label">Device</div>
        <div class="tp-stat-value">{html.escape(str(device).lower())}</div>
    </div>
    <div class="tp-stat-cell">
        <div class="tp-stat-label">ZeroGPU</div>
        <div class="tp-stat-value">{html.escape(str(zerogpu))}</div>
    </div>
    <div class="tp-stat-cell">
        <div class="tp-stat-label">Mode</div>
        <div class="tp-stat-value">{html.escape(str(mode))}</div>
    </div>
    <div class="tp-stat-cell">
        <div class="tp-stat-label">Layers</div>
        <div class="tp-stat-value tp-stat-value-highlight">{html.escape(layers)}</div>
    </div>
    <div class="tp-stat-cell">
        <div class="tp-stat-label">Attention Heads</div>
        <div class="tp-stat-value tp-stat-value-highlight">{html.escape(heads)}</div>
    </div>
    <div class="tp-stat-cell">
        <div class="tp-stat-label">Hidden Size</div>
        <div class="tp-stat-value tp-stat-value-highlight">{html.escape(hidden_size)}</div>
    </div>
    <div class="tp-stat-cell">
        <div class="tp-stat-label">Status</div>
        <div class="tp-stat-value tp-stat-value-highlight">{html.escape(status)}</div>
    </div>
</div>
"""


def _render_forward_stats_html(res: dict, latency_ms: float) -> str:
    """Render 4x2 stat grid for forward-pass execution metrics."""
    model_id = res.get("model", "Qwen/Qwen2.5-0.5B-Instruct")
    device = res.get("device", "cpu")
    layers = str(res.get("num_layers", 24))
    heads = str(res.get("num_heads", 14))
    hidden_size = str(res.get("hidden_size", 896))

    tokens = res.get("tokens", [])
    total_tokens = len(tokens)
    special_tokens = sum(
        1 for t in tokens if (t.get("is_special") if isinstance(t, dict) else getattr(t, "is_special", False))
    )

    return f"""
<div class="tp-stat-grid" style="margin-top: 14px;">
    <div class="tp-stat-cell">
        <div class="tp-stat-label">Model</div>
        <div class="tp-stat-value">{html.escape(str(model_id))}</div>
    </div>
    <div class="tp-stat-cell">
        <div class="tp-stat-label">Device</div>
        <div class="tp-stat-value">{html.escape(str(device).lower())}</div>
    </div>
    <div class="tp-stat-cell">
        <div class="tp-stat-label">Layers</div>
        <div class="tp-stat-value tp-stat-value-highlight">{html.escape(layers)}</div>
    </div>
    <div class="tp-stat-cell">
        <div class="tp-stat-label">Heads</div>
        <div class="tp-stat-value tp-stat-value-highlight">{html.escape(heads)}</div>
    </div>
    <div class="tp-stat-cell">
        <div class="tp-stat-label">Hidden Size</div>
        <div class="tp-stat-value tp-stat-value-highlight">{html.escape(hidden_size)}</div>
    </div>
    <div class="tp-stat-cell">
        <div class="tp-stat-label">Tokens</div>
        <div class="tp-stat-value tp-stat-value-highlight">{total_tokens}</div>
    </div>
    <div class="tp-stat-cell">
        <div class="tp-stat-label">Special Tokens</div>
        <div class="tp-stat-value tp-stat-value-highlight">{special_tokens}</div>
    </div>
    <div class="tp-stat-cell">
        <div class="tp-stat-label">Latency</div>
        <div class="tp-stat-value tp-stat-value-highlight">{int(round(latency_ms))} ms</div>
    </div>
</div>
"""


def _render_tokens_html(tokens: list[Any]) -> str:
    """Render extracted token sequence as interactive chips with IDs."""
    if not tokens:
        return ""

    chips: list[str] = []
    for t in tokens:
        if isinstance(t, dict):
            text = t.get("piece") or t.get("text") or ""
            tok_id = t.get("id", "")
            is_special = bool(t.get("is_special", False))
        else:
            text = getattr(t, "piece", getattr(t, "text", ""))
            tok_id = getattr(t, "id", "")
            is_special = bool(getattr(t, "is_special", False))

        cls = "tp-token-chip special" if is_special else "tp-token-chip"
        escaped_text = html.escape(str(text))
        chips.append(
            f'<div class="{cls}">'
            f'<span>{escaped_text}</span>'
            f'<span class="tp-token-id">{tok_id}</span>'
            f'</div>'
        )

    chips_html = "\n".join(chips)
    return f"""
<div class="tp-section-heading" style="margin-top: 24px;">Tokens</div>
<div class="tp-tokens-wrap">
    {chips_html}
</div>
"""


def _render_footer_html() -> str:
    """Render footer links."""
    return f"""
<div class="tp-footer">
    <a href="{DOCS_PATH}" target="_blank">API</a> &nbsp;·&nbsp;
    <a href="{REPO_URL}" target="_blank">GitHub</a> &nbsp;·&nbsp;
    <a href="{SITE_URL}" target="_blank">tokenprint.in</a> &nbsp;·&nbsp;
    <span>Built with Gradio</span>
</div>
"""


def build_console(
    health_fn: Callable[[], dict],
    analyze_fn: Callable[[str], dict],
) -> gr.Blocks:
    """Build the TokenPrint backend console UI for Hugging Face Spaces."""
    initial_health = health_fn() if callable(health_fn) else {}

    with gr.Blocks(title="TokenPrint Backend Console") as demo:
        # Header
        gr.HTML(_render_header_html())

        # Engine Stats Grid
        engine_html = gr.HTML(_render_engine_grid_html(initial_health))

        # Raw Telemetry JSON Accordion
        with gr.Accordion("Raw telemetry (JSON)", open=False):
            telemetry_json = gr.JSON(value=initial_health)

        # Forward Pass Test Section
        gr.HTML('<div class="tp-section-heading">Forward Pass Test</div>')
        with gr.Row():
            with gr.Column(scale=5):
                prompt_input = gr.Textbox(
                    value="The transformer mechanism inspects tokens in real time.",
                    placeholder="Enter sentence to run forward pass...",
                    lines=3,
                    show_label=True,
                    label="Prompt",
                    elem_classes=["tp-prompt-container"],
                )
            with gr.Column(scale=1, min_width=180):
                run_btn = gr.Button(
                    "Run forward pass",
                    variant="primary",
                    elem_classes=["tp-btn-primary"],
                )

        # Forward Pass Results Output
        forward_stats_html = gr.HTML("")
        tokens_display_html = gr.HTML("")

        # Footer
        gr.HTML(_render_footer_html())

        def _on_run_click(prompt: str):
            t0 = time.perf_counter()
            result = analyze_fn(prompt)
            dt_ms = (time.perf_counter() - t0) * 1000.0

            # If result is Pydantic model, convert to dict
            if hasattr(result, "model_dump"):
                res_dict = result.model_dump()
            elif hasattr(result, "dict"):
                res_dict = result.dict()
            else:
                res_dict = result if isinstance(result, dict) else {}

            stats_markup = _render_forward_stats_html(res_dict, dt_ms)
            tokens_markup = _render_tokens_html(res_dict.get("tokens", []))
            return stats_markup, tokens_markup

        run_btn.click(
            fn=_on_run_click,
            inputs=[prompt_input],
            outputs=[forward_stats_html, tokens_display_html],
        )

    return demo
