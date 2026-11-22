# TokenPrint Documentation Rebuild — Linear Style Implementation Report

**Branch**: `docs/linear-style` (isolated work branch, not merged, not pushed)  
**Verification Date**: 2026-11-22  
**Target Architecture**: Next.js 15.5.25 App Router (`output: "export"`), React 19, Tailwind CSS 3, `@phosphor-icons/react` (filled glyphs)  
**Runtime Evidence**: Python 3.12 FastAPI backend + PyTorch 2.5 (`Qwen2.5-0.5B-Instruct` on Apple MPS / CUDA ZeroGPU)

---

## Executive Summary

The TokenPrint developer and product documentation portal has been completely reconstructed in the **Linear docs design system** (`linear.app/docs`, `/developers`). All previous visual artifacts (glowing teal blobs, bright gradients, AI-style illustrations, and emojis) have been completely removed and replaced with a high-density, monochrome palette (`#0a0a0b`), crisp 1px borders (`#1f1f23`), authentic product imagery (Type A framed linear panels, Type C dense UI cards), and filled glyph icons.

All 38 original documentation routes and content remain fully preserved and operational. The Next.js 15 static export pipeline (`npm run build`) generates all 46 static pages with zero server-side runtime dependencies.

---

## 1. Information Architecture & Navigation

The documentation is organized into two distinct workspaces connected by a pinned bottom section switcher:

```
┌─────────────────────────────┐  ┌──────────────────────────────────┐  ┌─────────────────────────┐
│ Left Sidebar (285px)        │  │ Center Content (max-w 720px/1280)│  │ Right Rail TOC (230px)  │
│ ─────────────────────────── │  │ ──────────────────────────────── │  │ ─────────────────────── │
│ Brand Mark | Docs / Devs  🔍│  │ Sticky TopBar (56px)             │  │ On this page            │
│                             │  │ Breadcrumb / Theme / Copy / App  │  │                         │
│ Groups (13px muted, no caps)│  │                                  │  │ │ ── Active H2          │
│ • Getting started           │  │ H1 Title (52px, -0.03em)         │  │ │    H3 (20px indent)   │
│ • Inspect (with nested tree)│  │ Intro Text (19px muted)          │  │ │                       │
│ • Models                    │  │ ImagePanel (Type A Hero Panel)   │  │                         │
│ • Deploy                    │  │ Prose & Tables                   │  │                         │
│ • Reference                 │  │ Suggested Articles (3 cards)     │  │                         │
│                             │  │                                  │  │                         │
│ [Pinned Bottom Switcher]    │  │                                  │  │                         │
│ Docs · Devs · Learn · Supp  │  │                                  │  │                         │
└─────────────────────────────┘  └──────────────────────────────────┘  └─────────────────────────┘
```

### Component Architecture

| Component | File Path | Description |
| :--- | :--- | :--- |
| `DocsAppShell` | `frontend/components/docs/DocsAppShell.tsx` | Coordinates the 3-column desktop layout, slide-over mobile drawer, and `Cmd+K` / Escape keyboard shortcuts. |
| `DocsNav` | `frontend/components/docs/DocsNav.tsx` | 285px sidebar featuring brand lockup, 36px circular search trigger, collapsible groups, 20px filled glyphs (`@phosphor-icons/react`), nested tree lines with elbows, bottom gradient fade mask, and pinned workspace switcher. |
| `TopBar` | `frontend/components/docs/TopBar.tsx` | 56px sticky bar rendering hierarchical breadcrumbs (`Group / Page`), circular theme toggle, split "Copy page" dropdown (raw markdown, Claude prompt, ChatGPT prompt), and pill "Open app" trigger (`https://tokenprint.in`). |
| `DocsOnThisPage` | `frontend/components/docs/DocsOnThisPage.tsx` | 230px sticky right rail with continuous 1px left track, short white active bar indicator, H2 (0 indent), H3 (20px indent), and `IntersectionObserver` scroll-spy. |
| `ImagePanel` | `frontend/components/docs/ImagePanel.tsx` | 1600x900 framed panel container (radius 24px, `#101012` canvas, UI offset with edge gradient fade, and monospace bracket annotation). |
| `DocCard` | `frontend/components/docs/DocCard.tsx` | 420-450px tall card with 16:9 upper image area, top-right glyph corner tag, 1px divider, and bottom content area. |
| `SuggestedArticles` | `frontend/components/docs/SuggestedArticles.tsx` | Renders 3 contextually relevant article cards at the bottom of every page + prev/next navigation links. |
| `DocsApiExplorer` | `frontend/components/docs/DocsApiExplorer.tsx` | Interactive OpenAPI 3.1.0 client with live method badges (`GET`, `POST`, `WS`), cURL / Python / JS code tabs, and JSON contract payload viewer. |
| `LinearIcon` | `frontend/components/docs/LinearIcon.tsx` | Central filled glyph resolver mapping string identifiers to `@phosphor-icons/react` components with `weight="fill"`. |

---

## 2. Linear Design Tokens & Typographic Hierarchy

Configured in `frontend/app/globals.css`:

### Color Tokens

```css
:root {
  --bg: #0a0a0b;             /* Pure near-black page background */
  --sidebar: #0a0a0b;        /* Matching sidebar background */
  --card: #111113;           /* Elevated surface for cards & code blocks */
  --border: #1f1f23;         /* Subtle 1px boundary line */
  --border-strong: #2a2a30;  /* Active borders and hover states */
  --text: #ededef;           /* High-contrast off-white primary headers */
  --body: #c9c9ce;           /* Warm grey body text (not stark white) */
  --muted: #8b8b93;          /* Low-emphasis meta and group labels */
  --faint: #5b5b63;          /* Tree lines and subtle glyphs */
  --accent: #2dd4bf;         /* Subtle teal accent for status badges */
}

[data-theme="light"] {
  --bg: #fafafa;
  --sidebar: #f4f4f5;
  --card: #ffffff;
  --border: #e4e4e7;
  --border-strong: #d4d4d8;
  --text: #18181b;
  --body: #3f3f46;
  --muted: #71717a;
  --faint: #a1a1aa;
}
```

### Typographic Rhythm

- **Title H1**: `52px` (desktop), `38px` (mobile), weight 500, letter-spacing `-0.03em`, line-height `1.1`, color `var(--text)`.
- **Section H2**: `34px`, weight 500, letter-spacing `-0.025em`, line-height `1.25`, top margin `56px`, bottom margin `16px`.
- **Subsection H3**: `23px`, weight 500, letter-spacing `-0.015em`, line-height `1.35`, top margin `36px`, bottom margin `12px`.
- **Body Paragraphs**: `17.5px` (desktop), `16px` (mobile), line-height `1.65`, color `var(--body)` (`#c9c9ce`).
- **Inline Links**: Underlined, same color as body or slightly brighter (`#ededef`), 1px underline, offset `3px`, hover opacity `0.85`. No bright blue links.
- **Inline Code**: `14.5px`, JetBrains Mono / SFMono, background `#161619`, border `1px solid #1f1f23`, padding `2px 6px`, border-radius `6px`.
- **Tables**: Full width, 1px horizontal borders only (`#1f1f23`), no vertical borders, header muted `13px`, data rows `15px #c9c9ce`.
- **Divider HR**: `1px solid #1f1f23`, margin `48px 0`.

---

## 3. Product Imagery Pipeline & Asset Inventory

All documentation imagery strictly adheres to authentic product telemetry (no synthetic diagrams or AI-generated stock illustrations):

- **Capture Pipeline**: `frontend/scripts/capture-linear-screenshots.cjs` driven by Playwright at `deviceScaleFactor: 2` (3200x1800 native) across live local routes (`/app?mode=explorer`, `/app?mode=walkthrough`, `/app?mode=generation`, `/app?mode=debugger`, `/docs/compatibility-matrix`, `/docs/developers`).
- **Compositing Engine**: `scripts/build_linear_imagery.py` using Pillow 10.4.0 to composite 1600x900 Linear framed panels (radius 24px, `#101012` canvas, directional edge gradient fade, and SFNSMono monospace bracket annotations) and 600x340 card crops in both WebP (quality 90) and PNG formats.
- **Manifest**: Generated at `frontend/public/docs/manifest.json`.
- **Contact Sheet**: Generated at `docs/IMAGE_CONTACT_SHEET.png` (4 columns across all cards and panels).

### Image Inventory

| Asset Name | Type | Format | Dimensions | Bracket Annotation / Source |
| :--- | :--- | :--- | :--- | :--- |
| `attention-card` | Type A | WebP & PNG | 600x340 | Multi-head attention matrix, QKV dot products, and GQA geometry clustering. |
| `gguf-card` | Type A | WebP & PNG | 600x340 | Client-side quantized GGUF parsing and offline inspection. |
| `walkthrough-card` | Type A | WebP & PNG | 600x340 | Step-by-step token decoding and real top-k probability distributions. |
| `debugger-card` | Type A | WebP & PNG | 600x340 | Activation breakpoints, attention head ablation, and logit lens shift. |
| `model-card` | Type A | WebP & PNG | 600x340 | Supported Hugging Face Hub models: Qwen 2.5, Llama 3, Gemma 2, Mistral. |
| `matrix-card` | Type C | WebP & PNG | 600x340 | Six-stage verification status across architecture discovery and inference. |
| `logits-card` | Type A | WebP & PNG | 600x340 | Logit lens unembedding and intermediate layer token distribution. |
| `space-card` | Type A | WebP & PNG | 600x340 | ZeroGPU dynamic slicing, ASGI reverse proxy, and CPU failover telemetry. |
| `api-card` | Type C | WebP & PNG | 600x340 | FastAPI OpenAPI contracts, streaming WebSocket endpoints, and cURL snippets. |
| `community-card` | Type C | WebP & PNG | 600x340 | Development workflow, verified PR guidelines, Discord, and CI verification. |
| `panel-attention` | Type A | WebP & PNG | 1600x900 | `[ 24 LAYERS · 14 QUERY HEADS · 2 KV GROUPS (GQA) ]` |
| `panel-walkthrough`| Type A | WebP & PNG | 1600x900 | `[ AUTOREGRESSIVE GENERATION · TOP-K DISTRIBUTION ]` |
| `panel-debugger` | Type A | WebP & PNG | 1600x900 | `[ ACTIVATION ABLATION · CAUSAL TRACING · LOGIT LENS ]` |
| `panel-architecture`| Type A | WebP & PNG | 1600x900 | `[ 290 TENSORS · SAFETENSORS · ZERO-FAKE-DATA HARNESS ]` |
| `panel-space` | Type A | WebP & PNG | 1600x900 | `[ HUGGING FACE SPACES · ZEROGPU DYNAMIC SLICING · GRADIO ]` |
| `panel-matrix` | Type A | WebP & PNG | 1600x900 | `[ 6-STAGE VERIFICATION GATEWAY · COMPATIBILITY REGISTRY ]` |
| `panel-api` | Type A | WebP & PNG | 1600x900 | `[ FASTAPI OPENAPI 3.1.0 · WEBSOCKET STREAMING ENGINE ]` |

---

## 4. Verification & Quality Assurance Results

### 1. Static Export Build (`npm run build`)
- **Status**: PASSED (`exit code 0`).
- **Target Mode**: Next.js 15 App Router static export (`output: "export"`).
- **Prerendered Routes**: 46 total static pages generated into `frontend/out/`.
- **First Load JS**: Shared bundle `104 kB` (extremely lean, zero unnecessary client runtime bloat).
- **Data Integrity**: `npm run verify-data` confirmed zero `Math.random` in application code.

### 2. Zero Emoji Compliance
- **Scan Scope**: All `.ts`, `.tsx`, `.json`, and `.md` files in `frontend/app/docs`, `frontend/components/docs`, and `frontend/lib/docsNav.ts`.
- **Method**: Unicode regex range check (`[\U0001F600-\U0001F64F]`, `[\U0001F300-\U0001F5FF]`, `[\U0001F680-\U0001F6FF]`, etc.).
- **Result**: Exactly **0 emojis found**.

### 3. Visual & Cross-Device Validation
- **Validation Script**: `frontend/scripts/validate-linear-docs.cjs`
- **Output Directory**: `docs/validation/`
- **Results**:
  - `docs-home-1440-dark.png` & `docs-home-1440-light.png`: Verified 4-column popular cards and 3-column exploration cards.
  - `developers-home-1440-dark.png` & `developers-home-1440-light.png`: Verified API explorer, cURL tabs, and card grids.
  - `inspect-attention-1440-dark.png` & `inspect-attention-1440-light.png`: Verified `ImagePanel` hero render, table styling, and right rail TOC with white active indicator.
  - `docs-home-390-dark.png` & `inspect-attention-390-dark.png`: Verified mobile responsiveness, hamburger menu trigger, font scaling (H1 38px, body 16px).
  - `search-modal-open.png`: Verified command palette trigger (`Cmd+K` / `Ctrl+K`), backdrop blur, quick-links, and Escape dismiss.

### 4. Git Branch Status
- **Current Branch**: `docs/linear-style`
- **Remote Push**: Not pushed (preserved locally as requested).
- **Merge**: Not merged into `main`.

---

## 5. Artifact Citations & Evidence

- **OpenAPI Schema Contract**: [openapi.json](file:///Users/sudharsan/Downloads/NeuroScope/frontend/public/openapi.json)
- **Image Manifest**: [manifest.json](file:///Users/sudharsan/Downloads/NeuroScope/frontend/public/docs/manifest.json)
- **Image Contact Sheet**: [IMAGE_CONTACT_SHEET.png](file:///Users/sudharsan/Downloads/NeuroScope/docs/IMAGE_CONTACT_SHEET.png)
- **Validation Suite Output**: [docs/validation/](file:///Users/sudharsan/Downloads/NeuroScope/docs/validation/)
- **Live Model Backend Evidence**: `backend/app/inference/compatibility_registry.py:18` (`Qwen/Qwen2.5-0.5B-Instruct`, 24 layers, 14 heads, 290 tensors, GQA).
