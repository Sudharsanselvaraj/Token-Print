# TokenPrint Documentation Design System (Linear-Inspired Dark Portal)

**Version**: 2.0.0  
**Specification**: Dark-Only Developer Documentation Platform  
**Target Architecture**: Next.js 15 App Router, React 19, Tailwind CSS 3, Lucide Icons  

---

## 1. Design Principles

1. **Dark-Only Precision**: The documentation portal exists exclusively in dark mode. There is no light theme, no theme toggle, and no operating-system light mode fallback.
2. **Disciplined Monochrome with Deliberate Accent**: Surfaces, borders, and typography are crafted from a strict monochrome slate. The single accent token (`--docs-accent: #A78BFA`) is used sparingly for active states, badges, and focus indicators.
3. **No Unwanted Underlines**: Permanent browser-default anchor underlines are completely eliminated. Interactive text links use color contrast and underline on hover only.
4. **Authentic Product Imagery**: Screenshots and technical diagrams use `object-fit: contain` within natural-aspect containers. No synthetic AI illustrations, no blue gradient overlays, and no distorted crops.
5. **Architectural Hierarchy**: Information is organized into 8 explicit documentation pillars with clean nesting, collapsible sections, and responsive adaptation.

---

## 2. Design Tokens

Configured in `frontend/app/globals.css`:

```css
:root {
  /* Surfaces & Backgrounds */
  --docs-bg: #09090B;                /* Primary deep canvas background */
  --docs-surface: #101013;           /* Default surface for cards, code, panels */
  --docs-surface-elevated: #151519;  /* Elevated menus, modals, tooltips */
  --docs-surface-hover: #1C1C21;     /* Subtle hover highlight surface */

  /* Borders & Dividers */
  --docs-border: #27272D;            /* Standard 1px structure boundary */
  --docs-border-strong: #34343C;     /* Active borders, inputs, focus lines */

  /* Typography Colors */
  --docs-heading: #F4F4F5;          /* High-contrast off-white headings (H1-H4) */
  --docs-text: #D1D1D6;             /* Primary reading body copy */
  --docs-text-secondary: #A1A1AA;    /* Introductions, table text, metadata */
  --docs-text-muted: #777780;        /* Captions, labels, inactive nav items */

  /* Deliberate Accent */
  --docs-accent: #A78BFA;            /* Soft violet accent for active indicators */
  --docs-accent-soft: rgba(167, 139, 250, 0.12); /* Subtle pill backdrops */

  /* Semantic State Accents */
  --docs-semantic-success: #34D399;  /* Verified checks, passing badges */
  --docs-semantic-warning: #FBBF24;  /* Known limitations, caution notes */
  --docs-semantic-danger: #F87171;   /* Deprecations, fatal constraints */
  --docs-semantic-info: #60A5FA;     /* Informational callouts */
}
```

---

## 3. Typographic Hierarchy

Body typography utilizes `Inter` with fallback to `system-ui, -apple-system, sans-serif`. Code uses `JetBrains Mono, SFMono-Regular, monospace`.

| Element | Desktop Size | Mobile Size | Weight | Line Height | Tracking | Color Token |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Homepage H1** | `40px` | `32px` | `600` | `1.15` | `-0.025em` | `--docs-heading` |
| **Article H1** | `36px` | `28px` | `600` | `1.2` | `-0.02em` | `--docs-heading` |
| **Section H2** | `26px` | `22px` | `600` | `1.3` | `-0.015em` | `--docs-heading` |
| **Subsection H3** | `20px` | `18px` | `600` | `1.35` | `-0.01em` | `--docs-heading` |
| **Heading H4** | `17px` | `16px` | `600` | `1.4` | `normal` | `--docs-heading` |
| **Body Paragraph** | `15px` | `14.5px` | `400` | `1.65` | `normal` | `--docs-text` |
| **Intro Subtitle** | `16px` | `15px` | `400` | `1.6` | `normal` | `--docs-text-secondary` |
| **Sidebar Section**| `12px` | `12px` | `600` | `1.2` | `0.05em` | `--docs-text-muted` |
| **Sidebar Item** | `13px` | `13px` | `450` | `1.4` | `normal` | `--docs-text-muted` |
| **Breadcrumbs** | `12px` | `12px` | `400` | `1.2` | `normal` | `--docs-text-muted` |
| **Captions & Tags**| `12px` | `11px` | `400` | `1.4` | `normal` | `--docs-text-muted` |
| **Inline Code** | `13px` | `12.5px` | `400` | `1.5` | `normal` | `--docs-heading` |

---

## 4. Link & Interaction Rules

- **Sidebar Links**: `text-decoration: none`. Muted grey text (`#777780`). On hover: `--docs-heading` with `--docs-surface-hover` background. Active state: white text, subtle `--docs-surface-elevated` background, and left accent border pill.
- **Top Bar Links**: `text-decoration: none`. Clean icon buttons with 1px border.
- **Article Body Links**: `text-decoration: none` by default. Styled in `--docs-heading` or subtle accent with `1px underline` **on hover only**.
- **Card Anchors**: Entire card is an interactive block. Card titles and descriptions never render browser-default underlines.
- **Keyboard Focus**: Visible `2px` focus outline with `--docs-accent` on `:focus-visible`.

---

## 5. Information Architecture & Navigation

The documentation navigation is structured into 8 core sections:

1. **GETTING STARTED**
   - Start Guide (`/docs/introduction`)
   - Concepts (`/docs/concepts/tokens`)
   - Installation (`/docs/installation`)
   - Quick Start (`/docs/quick-start`)
   - First Trace (`/docs/your-first-trace`)
   - Interface (`/docs/understanding-the-interface`)

2. **INSPECT**
   - Attention Mechanism (`/docs/concepts/attention`)
     - Q / K / V (`/docs/concepts/qkv`)
     - Grouped Query Attention (`/docs/concepts/gqa`)
     - RoPE Positional Encoding (`/docs/concepts/rope`)
     - Softmax Probabilities (`/docs/concepts/softmax`)
   - Hidden States & Residuals (`/docs/concepts/residual-streams`)
     - RMSNorm (`/docs/concepts/rmsnorm`)
     - MLP & SwiGLU (`/docs/concepts/mlp-swiglu`)
   - Logit Lens (`/docs/concepts/logits`)

3. **EXPERIMENT**
   - Transformer Debugger (`/docs/using/debugger`)
   - Activation Patching (`/docs/using/experiments`)
   - Trace Schema (`/docs/trace-schema`)

4. **MODEL ECOSYSTEM**
   - Model Explorer (`/docs/using/model-explorer`)
   - Supported Models (`/docs/loading-a-model`)
   - Compatibility Matrix (`/docs/compatibility-matrix`)
   - Browser GPT-2 (`/docs/using/browser-inference`)
   - Configuration (`/docs/configuration`)

5. **GENERATION**
   - Walkthrough Mode (`/docs/using/walkthrough`)
   - Streaming Generation (`/docs/using/generation`)
   - Decoding Strategies (`/docs/concepts/decoding`)
   - KV Cache Volume (`/docs/concepts/kv-cache`)
   - Tokenization (`/docs/concepts/tokens`)

6. **INTEGRATIONS**
   - Hugging Face Spaces (`/docs/architecture`)
   - Verification Suite (`/docs/verification`)
   - Local PyTorch Engine (`/docs/installation`)

7. **DEVELOPERS**
   - Developers Overview (`/docs/developers`)
   - System Architecture (`/docs/architecture`)
   - API Reference (`/docs/api-reference`)
   - Contributing Guide (`/docs/contributing`)

8. **RESOURCES**
   - Research & Citations (`/docs/research`)
   - Keyboard Shortcuts (`/docs/keyboard-shortcuts`)
   - 3D Camera System (`/docs/using/camera-system`)
   - Changelog (`/docs/changelog`)

---

## 6. Layout Specifications

### Desktop (Viewport ≥ 1280px)
- **Left Sidebar**: `260px` fixed width, border-right `1px solid var(--docs-border)`, independently scrollable.
- **Top Bar**: `56px` sticky height, border-bottom `1px solid var(--docs-border)`.
  - Left: TokenPrint logo + "Docs" brand label.
  - Center: Hierarchical breadcrumbs (`Group / Page`).
  - Right: Search button with `⌘K` badge, Copy page dropdown, Open App link.
- **Main Reading Column**: Centered with max-width `740px` (or `1200px` on overview pages), padding `36px 32px 96px`.
- **Right Table of Contents**: `200px` fixed width, sticky at `top: 72px`.

### Responsive Breakpoints
- **1024px – 1279px (Tablet Landscape)**: Right TOC hides gracefully; reading column expands to fill remaining space.
- **768px – 1023px (Tablet Portrait)**: Left sidebar collapses into a slide-over drawer triggered by a menu button in the top bar.
- **< 768px (Mobile)**: Single-column layout; search accessible via header icon; font sizes adapt to mobile scale (H1 `28px`, body `14.5px`).

---

## 7. Component Guidelines

### ImagePanel (Technical Visuals)
- Container: Background `var(--docs-surface)` (`#101013`), border `1px solid var(--docs-border)`, border-radius `12px`.
- Images: `object-fit: contain`, preserving native aspect ratio without artificial stretching or blue tint overlays.
- Monospace Annotation: `[ LAYER_COUNT · HEADS · DIMENSIONS ]` displayed cleanly above or below the graphic in `11.5px` muted font.

### DocCard (Feature Cards)
- Height: Flexible auto-fit (~`260px` total height), eliminating oversized empty space.
- Thumbnail: Upper 16:9 container (~`140px`), `object-fit: cover` with subtle rounded top corners.
- Content: Compact title (`15px`, weight 600), short description (`13px`, muted), no permanent underlines.

### Code Blocks
- Background: `var(--docs-surface)` (`#101013`), border `1px solid var(--docs-border)`, border-radius `8px`.
- Language label top-left, copy button top-right with copied checkmark feedback.
- Monospace font size `13px`, line-height `1.6`.

### Callouts
- Compact padding `14px 16px`, border-radius `8px`.
- Variants:
  - `note`: border `var(--docs-border)`, icon `Info`.
  - `tip`: border `rgba(52, 211, 153, 0.3)`, text accent `var(--docs-semantic-success)`, icon `CheckCircle2`.
  - `warning`: border `rgba(251, 191, 36, 0.3)`, text accent `var(--docs-semantic-warning)`, icon `AlertTriangle`.
  - `danger`: border `rgba(248, 113, 113, 0.3)`, text accent `var(--docs-semantic-danger)`, icon `AlertOctagon`.
