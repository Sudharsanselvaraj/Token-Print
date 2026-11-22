#!/usr/bin/env python3
"""Build Linear-style doc images, cards, hero panels, manifest, and contact sheet."""

import json
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

RAW_DIR = "frontend/public/docs/raw"
PANEL_DIR = "frontend/public/docs/panels"
MANIFEST_PATH = "frontend/public/docs/manifest.json"
CONTACT_SHEET_PATH = "docs/IMAGE_CONTACT_SHEET.png"

os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(PANEL_DIR, exist_ok=True)
os.makedirs("docs", exist_ok=True)

# Font selection
FONT_PATH = "/System/Library/Fonts/SFNSMono.ttf"
if not os.path.exists(FONT_PATH):
    FONT_PATH = "/System/Library/Fonts/Monaco.ttf"

def get_font(size):
    try:
        return ImageFont.truetype(FONT_PATH, size)
    except Exception:
        return ImageFont.load_default()

def create_card_image(src_path, out_base, crop_box=None, title_tag=""):
    """Creates a 600x340 card image with subtle vignette/border and saves png + webp."""
    card_w, card_h = 600, 340
    card = Image.new("RGBA", (card_w, card_h), (17, 17, 19, 255)) # #111113

    if os.path.exists(src_path):
        src = Image.open(src_path).convert("RGBA")
        if crop_box:
            src = src.crop(crop_box)
        # Resize to fit within card while maintaining aspect
        src.thumbnail((card_w - 20, card_h - 20), Image.Resampling.LANCZOS)
        # Center image in card
        offset_x = (card_w - src.width) // 2
        offset_y = (card_h - src.height) // 2
        card.paste(src, (offset_x, offset_y), src)

    # Add subtle inner border
    draw = ImageDraw.Draw(card)
    draw.rectangle([0, 0, card_w - 1, card_h - 1], outline=(31, 31, 35, 255), width=1)

    # Save PNG and WebP
    png_path = os.path.join(RAW_DIR, f"{out_base}.png")
    webp_path = os.path.join(RAW_DIR, f"{out_base}.webp")
    card.convert("RGB").save(png_path, "PNG")
    card.convert("RGB").save(webp_path, "WEBP", quality=90, method=6)
    print(f"Generated card: {png_path} & {webp_path}")
    return png_path

def create_hero_panel(src_path, out_base, annotation_text, crop_box=None):
    """Creates a 1600x900 Linear framed panel with rounded corners, #101012 bg, edge fade, and bracket annotation."""
    panel_w, panel_h = 1600, 900
    panel = Image.new("RGBA", (panel_w, panel_h), (16, 16, 18, 255)) # #101012

    # Inner UI Area: 1400 x 740, placed at x=120, y=100
    ui_w, ui_h = 1380, 720
    ui_x, ui_y = 120, 110

    if os.path.exists(src_path):
        src = Image.open(src_path).convert("RGBA")
        if crop_box:
            src = src.crop(crop_box)
        src = src.resize((ui_w, ui_h), Image.Resampling.LANCZOS)

        # Create gradient mask for subtle edge fade on left and top
        mask = Image.new("L", (ui_w, ui_h), 255)
        mask_draw = ImageDraw.Draw(mask)
        # fade left 60px
        for x in range(60):
            alpha = int(255 * (x / 60))
            mask_draw.line([(x, 0), (x, ui_h)], fill=alpha)
        # fade top 50px
        top_mask = Image.new("L", (ui_w, ui_h), 255)
        top_draw = ImageDraw.Draw(top_mask)
        for y in range(50):
            alpha = int(255 * (y / 50))
            top_draw.line([(0, y), (ui_w, y)], fill=alpha)

        # Combine masks
        final_mask = Image.new("L", (ui_w, ui_h), 0)
        final_mask = Image.eval(mask, lambda a: a)
        for y in range(ui_h):
            for x in range(ui_w):
                m1 = mask.getpixel((x, y))
                m2 = top_mask.getpixel((x, y))
                final_mask.putpixel((x, y), min(m1, m2))

        # Paste UI onto panel with mask
        panel.paste(src, (ui_x, ui_y), final_mask)

    # Frame border around the UI
    draw = ImageDraw.Draw(panel)
    draw.rectangle([ui_x - 1, ui_y - 1, ui_x + ui_w, ui_y + ui_h], outline=(35, 35, 40, 255), width=1)

    # Annotation text at top left
    font = get_font(18)
    draw.text((ui_x, ui_y - 45), annotation_text, font=font, fill=(139, 139, 147, 255)) # #8b8b93

    # External Panel Border: rounded rectangle with 24px radius
    # To get clean 24px rounded corners:
    corner_mask = Image.new("L", (panel_w, panel_h), 0)
    corner_draw = ImageDraw.Draw(corner_mask)
    corner_draw.rounded_rectangle([0, 0, panel_w, panel_h], radius=24, fill=255)

    final_panel = Image.new("RGBA", (panel_w, panel_h), (0, 0, 0, 0))
    final_panel.paste(panel, (0, 0), corner_mask)

    # Draw 1px subtle panel boundary border
    border_draw = ImageDraw.Draw(final_panel)
    border_draw.rounded_rectangle([0, 0, panel_w - 1, panel_h - 1], radius=24, outline=(38, 38, 44, 255), width=1)

    # Save PNG and WebP
    png_path = os.path.join(PANEL_DIR, f"{out_base}.png")
    webp_path = os.path.join(PANEL_DIR, f"{out_base}.webp")
    final_panel.save(png_path, "PNG")
    final_panel.save(webp_path, "WEBP", quality=90, method=6)
    print(f"Generated hero panel: {png_path} & {webp_path}")
    return png_path

def build_all():
    print("Building cards...")
    # 1. Cards
    create_card_image("frontend/public/docs/raw/view-arch.png", "attention-card")
    create_card_image("frontend/public/docs/raw/view-gguf.png", "gguf-card")
    create_card_image("frontend/public/docs/raw/view-walk.png", "walkthrough-card")
    create_card_image("frontend/public/docs/raw/view-debug.png", "debugger-card")
    create_card_image("frontend/public/docs/raw/view-arch.png", "model-card")
    create_card_image("frontend/public/docs/raw/view-matrix.png", "matrix-card")
    create_card_image("frontend/public/docs/raw/view-gen.png", "logits-card")
    create_card_image("frontend/public/docs/raw/view-space.png", "space-card")
    create_card_image("frontend/public/docs/raw/view-api.png", "api-card")
    create_card_image("frontend/public/docs/raw/raw-matrix.png", "community-card", crop_box=(300, 300, 1600, 1000))

    print("Building hero panels...")
    # 2. Hero Panels
    p_att = create_hero_panel(
        "frontend/public/docs/raw/view-arch.png",
        "panel-attention",
        "[ 24 LAYERS · 14 QUERY HEADS · 2 KV GROUPS (GQA) ]"
    )
    p_walk = create_hero_panel(
        "frontend/public/docs/raw/view-walk.png",
        "panel-walkthrough",
        "[ AUTOREGRESSIVE GENERATION · TOP-K DISTRIBUTION ]"
    )
    p_debug = create_hero_panel(
        "frontend/public/docs/raw/view-debug.png",
        "panel-debugger",
        "[ ACTIVATION ABLATION · CAUSAL TRACING · LOGIT LENS ]"
    )
    p_arch = create_hero_panel(
        "frontend/public/docs/raw/view-arch.png",
        "panel-architecture",
        "[ 290 TENSORS · SAFETENSORS · ZERO-FAKE-DATA HARNESS ]"
    )
    p_space = create_hero_panel(
        "frontend/public/docs/raw/view-space.png",
        "panel-space",
        "[ HUGGING FACE SPACES · ZEROGPU DYNAMIC SLICING · GRADIO ]"
    )
    p_matrix = create_hero_panel(
        "frontend/public/docs/raw/view-matrix.png",
        "panel-matrix",
        "[ 6-STAGE VERIFICATION GATEWAY · COMPATIBILITY REGISTRY ]"
    )
    p_api = create_hero_panel(
        "frontend/public/docs/raw/view-api.png",
        "panel-api",
        "[ FASTAPI OPENAPI 3.1.0 · WEBSOCKET STREAMING ENGINE ]"
    )

    # 3. Build Manifest JSON
    manifest = {
        "version": "1.0.0",
        "generated_at": "2026-11-22T06:20:00Z",
        "design_system": "Linear Docs Style (Dark #0a0a0b, Card #111113, Border #1f1f23, Accent #2dd4bf)",
        "cards": [
            {
                "id": "attention-card",
                "type": "Type A (Real Product UI)",
                "source_view": "/app?mode=explorer",
                "png": "/docs/raw/attention-card.png",
                "webp": "/docs/raw/attention-card.webp",
                "dimensions": "600x340",
                "caption": "Multi-head attention matrix, QKV dot products, and GQA geometry clustering."
            },
            {
                "id": "gguf-card",
                "type": "Type A (Real Product UI)",
                "source_view": "/docs/using/model-explorer",
                "png": "/docs/raw/gguf-card.png",
                "webp": "/docs/raw/gguf-card.webp",
                "dimensions": "600x340",
                "caption": "Client-side quantized GGUF parsing, metadata discovery, and offline inspection."
            },
            {
                "id": "walkthrough-card",
                "type": "Type A (Real Product UI)",
                "source_view": "/app?mode=walkthrough",
                "png": "/docs/raw/walkthrough-card.png",
                "webp": "/docs/raw/walkthrough-card.webp",
                "dimensions": "600x340",
                "caption": "Step-by-step token decoding, KV cache expansion, and real top-k probability distributions."
            },
            {
                "id": "debugger-card",
                "type": "Type A (Real Product UI)",
                "source_view": "/app?mode=debugger",
                "png": "/docs/raw/debugger-card.png",
                "webp": "/docs/raw/debugger-card.webp",
                "dimensions": "600x340",
                "caption": "Activation breakpoints, attention head ablation, and causal logit shift measurement."
            },
            {
                "id": "model-card",
                "type": "Type A (Real Product UI)",
                "source_view": "/docs/loading-a-model",
                "png": "/docs/raw/model-card.png",
                "webp": "/docs/raw/model-card.webp",
                "dimensions": "600x340",
                "caption": "Supported Hugging Face Hub models: Qwen 2.5, Llama 3, Gemma 2, and Mistral."
            },
            {
                "id": "matrix-card",
                "type": "Type C (Dense UI Card)",
                "source_view": "/docs/compatibility-matrix",
                "png": "/docs/raw/matrix-card.png",
                "webp": "/docs/raw/matrix-card.webp",
                "dimensions": "600x340",
                "caption": "Six-stage verification status across architecture discovery, inference, and hooks."
            },
            {
                "id": "logits-card",
                "type": "Type A (Real Product UI)",
                "source_view": "/docs/concepts/logits",
                "png": "/docs/raw/logits-card.png",
                "webp": "/docs/raw/logits-card.webp",
                "dimensions": "600x340",
                "caption": "Logit lens unembedding and intermediate layer token distribution."
            },
            {
                "id": "space-card",
                "type": "Type A (Real Product UI)",
                "source_view": "deploy/hf_space/console_ui.py",
                "png": "/docs/raw/space-card.png",
                "webp": "/docs/raw/space-card.webp",
                "dimensions": "600x340",
                "caption": "ZeroGPU dynamic slicing, ASGI reverse proxy, and CPU failover telemetry."
            },
            {
                "id": "api-card",
                "type": "Type C (Dense UI Card)",
                "source_view": "/docs/developers",
                "png": "/docs/raw/api-card.png",
                "webp": "/docs/raw/api-card.webp",
                "dimensions": "600x340",
                "caption": "FastAPI OpenAPI contracts, streaming WebSocket endpoints, and cURL snippets."
            },
            {
                "id": "community-card",
                "type": "Type C (Dense UI Card)",
                "source_view": "/docs/contributing",
                "png": "/docs/raw/community-card.png",
                "webp": "/docs/raw/community-card.webp",
                "dimensions": "600x340",
                "caption": "Development workflow, verified PR guidelines, Discord, and CI verification."
            }
        ],
        "panels": [
            {
                "id": "panel-attention",
                "type": "Type A (Framed Linear Panel)",
                "png": "/docs/panels/panel-attention.png",
                "webp": "/docs/panels/panel-attention.webp",
                "dimensions": "1600x900",
                "bracket_annotation": "[ 24 LAYERS · 14 QUERY HEADS · 2 KV GROUPS (GQA) ]"
            },
            {
                "id": "panel-walkthrough",
                "type": "Type A (Framed Linear Panel)",
                "png": "/docs/panels/panel-walkthrough.png",
                "webp": "/docs/panels/panel-walkthrough.webp",
                "dimensions": "1600x900",
                "bracket_annotation": "[ AUTOREGRESSIVE GENERATION · TOP-K DISTRIBUTION ]"
            },
            {
                "id": "panel-debugger",
                "type": "Type A (Framed Linear Panel)",
                "png": "/docs/panels/panel-debugger.png",
                "webp": "/docs/panels/panel-debugger.webp",
                "dimensions": "1600x900",
                "bracket_annotation": "[ ACTIVATION ABLATION · CAUSAL TRACING · LOGIT LENS ]"
            },
            {
                "id": "panel-architecture",
                "type": "Type A (Framed Linear Panel)",
                "png": "/docs/panels/panel-architecture.png",
                "webp": "/docs/panels/panel-architecture.webp",
                "dimensions": "1600x900",
                "bracket_annotation": "[ 290 TENSORS · SAFETENSORS · ZERO-FAKE-DATA HARNESS ]"
            },
            {
                "id": "panel-space",
                "type": "Type A (Framed Linear Panel)",
                "png": "/docs/panels/panel-space.png",
                "webp": "/docs/panels/panel-space.webp",
                "dimensions": "1600x900",
                "bracket_annotation": "[ HUGGING FACE SPACES · ZEROGPU DYNAMIC SLICING · GRADIO ]"
            },
            {
                "id": "panel-matrix",
                "type": "Type A (Framed Linear Panel)",
                "png": "/docs/panels/panel-matrix.png",
                "webp": "/docs/panels/panel-matrix.webp",
                "dimensions": "1600x900",
                "bracket_annotation": "[ 6-STAGE VERIFICATION GATEWAY · COMPATIBILITY REGISTRY ]"
            },
            {
                "id": "panel-api",
                "type": "Type A (Framed Linear Panel)",
                "png": "/docs/panels/panel-api.png",
                "webp": "/docs/panels/panel-api.webp",
                "dimensions": "1600x900",
                "bracket_annotation": "[ FASTAPI OPENAPI 3.1.0 · WEBSOCKET STREAMING ENGINE ]"
            }
        ]
    }

    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Generated manifest: {MANIFEST_PATH}")

    # 4. Generate Contact Sheet: 4 columns
    print("Building contact sheet...")
    all_images = [
        ("attention-card", os.path.join(RAW_DIR, "attention-card.png")),
        ("gguf-card", os.path.join(RAW_DIR, "gguf-card.png")),
        ("walkthrough-card", os.path.join(RAW_DIR, "walkthrough-card.png")),
        ("debugger-card", os.path.join(RAW_DIR, "debugger-card.png")),
        ("model-card", os.path.join(RAW_DIR, "model-card.png")),
        ("matrix-card", os.path.join(RAW_DIR, "matrix-card.png")),
        ("logits-card", os.path.join(RAW_DIR, "logits-card.png")),
        ("space-card", os.path.join(RAW_DIR, "space-card.png")),
        ("api-card", os.path.join(RAW_DIR, "api-card.png")),
        ("community-card", os.path.join(RAW_DIR, "community-card.png")),
        ("panel-attention", os.path.join(PANEL_DIR, "panel-attention.png")),
        ("panel-walkthrough", os.path.join(PANEL_DIR, "panel-walkthrough.png")),
        ("panel-debugger", os.path.join(PANEL_DIR, "panel-debugger.png")),
        ("panel-architecture", os.path.join(PANEL_DIR, "panel-architecture.png")),
        ("panel-space", os.path.join(PANEL_DIR, "panel-space.png")),
        ("panel-matrix", os.path.join(PANEL_DIR, "panel-matrix.png")),
        ("panel-api", os.path.join(PANEL_DIR, "panel-api.png")),
    ]

    cols = 4
    rows = (len(all_images) + cols - 1) // cols
    cell_w, cell_h = 420, 280
    sheet_w = cols * cell_w + 60
    sheet_h = rows * cell_h + 100

    sheet = Image.new("RGB", (sheet_w, sheet_h), (10, 10, 11)) # #0a0a0b
    sheet_draw = ImageDraw.Draw(sheet)
    title_font = get_font(24)
    label_font = get_font(13)

    sheet_draw.text((30, 30), "TokenPrint Docs — Imagery Contact Sheet (Linear Design System)", font=title_font, fill=(237, 237, 239))

    for idx, (label, img_path) in enumerate(all_images):
        col = idx % cols
        row = idx // cols
        x = 30 + col * cell_w
        y = 80 + row * cell_h

        if os.path.exists(img_path):
            thumb = Image.open(img_path).convert("RGB")
            thumb.thumbnail((cell_w - 20, cell_h - 50), Image.Resampling.LANCZOS)
            sheet.paste(thumb, (x, y))
            sheet_draw.rectangle([x - 1, y - 1, x + thumb.width, y + thumb.height], outline=(31, 31, 35), width=1)
            sheet_draw.text((x, y + thumb.height + 6), label, font=label_font, fill=(139, 139, 147))

    sheet.save(CONTACT_SHEET_PATH, "PNG")
    print(f"Generated contact sheet: {CONTACT_SHEET_PATH}")

if __name__ == "__main__":
    build_all()
