# TokenPrint — Design Review & Full Roadmap

A complete, brutally honest design + engineering review of TokenPrint, turned into a
single exhaustive roadmap. Nothing from the review is dropped: every visual bug, UX
problem, Three.js issue, correctness error, comparison, and feature idea is preserved
below and given a home in the phased roadmap in §12.

> **Positioning we are building toward:** the best **visual debugger for transformer
> models** — Chrome DevTools + VS Code + Blender + Wireshark + Netron, for LLMs. Every
> pixel must represent real computation.

**Reviewer stance:** Principal Staff Engineer / Principal Designer. Assume public launch.
No niceties. Redesign anything weak.

---

## Reconciliation note (working-tree audit, 2026-07-20)

This review was written from screenshots. A subsequent audit of the working tree found
that **22 of 24 roadmap issues are already implemented and wired** ([#2–#22, #24],
closed 2026-07-20); only [#23](https://github.com/Sudharsanselvaraj/Token-Print/issues/23)
(non-Latin tokenization view) is unbuilt. So most items the review calls "missing" or
"to build" actually exist in code but are **mis-surfaced, mis-placed, or buggy** — the
work is overwhelmingly *polish, correctness, and placement*, not greenfield building.
Each roadmap row below is tagged:

- ✅ **built** — exists and works; may need surfacing
- 🔧 **polish** — built but buggy / mis-placed / mislabeled
- 🆕 **new** — genuinely not yet implemented

The single most important consequence: **TokenPrint is much closer to its vision than it
looks.** The gap is a credibility-and-framing gap, not a feature gap.

---

## Screenshot key

S1 Architecture (default) · S2 Architecture (scrolled: controls + tensor list) ·
S3 Generation layer 0 (game intro) · S4 Generation layer 4 · S5 game step 1 (layer 7) ·
S6 game answered "+25" (layer 11) · S7 game step 2 (layer 16) · S8 game step 2 answered
"+55" (layer 20) · S9 Walkthrough Overview · S10 Walkthrough Self-Attention (4× speed) ·
S11 Walkthrough Softmax & Output · S12 Walkthrough Tokenization · S13 Walkthrough Layer Norm.

---

## 0. Executive verdict

The data honesty is genuinely excellent and rare — cumulative "PARAMETERS USED 136.14M"
at op 2 (S3) is *exactly* the embedding matrix (151,936 × 896 = 136.13M), the top-10 in
S5 shows `Red` and `red` as separate real tokenizer entries, and the GQA blade clustering
encodes a real 14q/2kv fact almost no visualization bothers with. That's the soul of the
product and it's right.

Everything around that soul currently undermines it. The walkthrough ships literal
unfilled `"…"` template strings (S9, S10, S12, S13), one chapter renders a **completely
empty canvas** (S10), the sidebar renders the LOAD MODEL section **twice** (S1/S2),
RMSNorm is labeled "Layer Normalization" in a product whose entire pitch is precision
(S3–S8), and the 3D scene is a monochrome grey kebab occluded by four floating overlays.
Right now it looks like a tech demo with research-grade data. The gap between "every
number is real" and "half my labels are ellipses" is the credibility gap to close before
anything else.

---

## 1. Scorecards

| Shot | UI | UX | Prof. | DevEx | Learn | Sci.Acc | Hierarchy | Density | Orig. | **Overall** |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 Arch | 4 | 4 | 4 | 5 | 5 | 8 | 3 | 4 | 6 | **4.5** |
| S2 Arch scrolled | 4 | 4 | 3 | 5 | 4 | 8 | 3 | 4 | 6 | **4** |
| S3 Gen L0 | 5 | 4 | 5 | 5 | 6 | 6 | 4 | 5 | 8 | **5** |
| S4 Gen L4 | 5 | 4 | 5 | 5 | 6 | 6 | 4 | 5 | 8 | **5** |
| S5 Game step 1 | 6 | 6 | 5 | 4 | 8 | 7 | 5 | 6 | 8 | **6** |
| S6 Game +25 | 6 | 6 | 5 | 4 | 8 | 7 | 5 | 6 | 8 | **6** |
| S7 Game step 2 | 5 | 5 | 4 | 4 | 7 | 6 | 5 | 6 | 8 | **5.5** |
| S8 Game +55 | 5 | 5 | 4 | 4 | 7 | 6 | 5 | 6 | 8 | **5.5** |
| S9 WT Overview | 3 | 3 | 2 | 3 | 3 | 5 | 3 | 3 | 5 | **3.5** |
| S10 WT Self-Attn | 2 | 2 | 2 | 2 | 2 | 3 | 2 | 2 | 4 | **2.5** |
| S11 WT Softmax | 4 | 4 | 3 | 3 | 4 | 6 | 4 | 3 | 5 | **4** |
| S12 WT Tokenization | 3 | 3 | 2 | 3 | 3 | 5 | 3 | 3 | 5 | **3** |
| S13 WT Layer Norm | 4 | 4 | 3 | 3 | 5 | 5 | 4 | 4 | 6 | **4.5** |

Generation is the strongest surface (real-data originality shows). Walkthrough is the
weakest — and it's the one a first-time visitor judges you by.

---

## 2. Visual problems

**Bugs that read as broken (fix before any redesign):**

1. **Duplicate LOAD MODEL section** (S1, S2) — 🔧. Two identical drop zones, two "Use
   live Qwen model / Load trace" rows in one sidebar scroll. Rendering bug in
   `frontend/components/ui/Sidebar.tsx` (likely `ModelLoader` plus the `CheckpointLoader`
   block both rendering the drop-zone group). Nothing says "unmaintained" faster.
2. **Literal `…` placeholders in walkthrough prose** (S9 "The example sentence is '…'",
   S10 "There are ... heads per layer", S12 "'…' becomes … real tokens:", S13 "flows
   straight down all ... layers") — 🔧. Chapter templates render before `/analyze`
   resolves and interpolate `undefined → ellipsis`. For "every number is real," shipping
   *no number at all* is the worst failure mode. Gate chapters on data (skeleton), or
   refuse to render a chapter with missing slots.
3. **Empty canvas in Self-Attention chapter** (S10) — 🔧. At 4× the camera flew to the
   attention district but geometry depends on `/analyze` data that hasn't arrived —
   literally nothing on screen. Gate autoplay on data readiness, not wall-clock.
4. **"Loading the real example forward pass…" forever** (S9–S13, right panel) — 🔧. Same
   stuck string in five shots. Needs spinner, elapsed time, retry. A debugger never
   leaves an unexplained stalled state.
5. **Blank rows in the top-10 list** (S7, S8) — 🔧. Whitespace/newline tokens render as
   empty bars. Escape them — `␣`, `\n`, `<0x0A>` — like every tokenizer playground.
6. **Clipped strings everywhere** — 🔧: "L…onfig metadata from HuggingFace" (S1);
   tensor names truncated at the *distinguishing* suffix ("model.embed_tokens.weig…" —
   truncate the middle: `model.…s.0.self_attn.q_proj.weight`); "Em…" embedding label cut
   by the playback cluster (S3); token strip and "drag to orbit" hint half-off-canvas
   (S3–S8).
7. **The floating "N" button** (S1, S2, bottom-left) — 🔧. Overlaps the tensor list and
   controls. Whatever it is, it can't overlap content.

**Hierarchy and redundancy:**

8. **Model stats render three times simultaneously** (S1) — 🔧: top bar
   (`24 layers · 14 heads · 290 tensors`), left sidebar ARCHITECTURE block, right panel
   stat grid. ~40% of chrome wasted; signals no authoritative panel. Pick one home (top
   bar), delete the rest.
9. **Uppercase micro-labels everywhere** (LAYERS, ATTN HEADS, ROPE BASE…) — 🔧 with
   identical weight/size — nothing dominates, so scanning is O(n). One dominant element
   per panel (the number), one secondary (the label), title clearly above.
10. **Monochrome grey-on-black** (S3, S4, S9–S13) — 🔧. Attention, MLP, norm, embedding
    all the same material. Color is the cheapest semantic channel and it's spent on
    nothing. (The point cloud's layer-depth gradient, S1, is the one place color works.)
11. **Empty space** — 🔧: S1's right panel ~60% void below the stat card; S1's canvas
    ~85% black with the point cloud smudged into the top edge and clipped. Composition
    should make the *data* the hero.

---

## 3. UX problems

1. **Floating overlays occlude the subject** (S3–S8) — 🔧. Playback cluster covers the
   embedding slab; prediction-game modal covers the stack; token strip covers the bottom.
   You built a 3D scene and hid it behind four HUDs. Debuggers dock; they don't float.
2. **Ablation panel is in the wrong mode with invisible inputs** (S9–S13) — 🔧. Appears
   in *Walkthrough* (learner mode) with dark-on-dark inputs and a cryptic `Run (0h + 0l)`
   button. It's the v0.5 crown jewel presented like a debug leftover. Belongs in a Debug
   context with visible inputs, placeholder examples (`14:7`), and a plain-language result
   ("output changed at token 3: 'Red' → 'The'"). (Currently rendered in walkthrough per
   `AppShell.tsx`.)
3. **Autoplay outruns comprehension and data** (S10 at 4×) — 🔧. Speed controls that can
   outrun the backend are a bug, not a feature.
4. **The prediction game blocks instead of coexisting** (S5–S8) — 🔧. Best learning
   interaction you have — but it's a modal covering the scene it should comment on. Dock
   it in the right panel; let the 3D stay visible and advance behind it. Also "Start Game
   (2 rounds)" — why 2? Rounds should equal tokens remaining; the score ("+25 pts" — of
   what?) needs a visible scale.
5. **No keyboard model** — 🆕. For "Chrome DevTools of transformers" there is no F10
   (step op), F5 (continue), J/K (prev/next token), `.` (pause). A debugger identity is a
   keyboard identity.
6. **Discoverability of inspection is near zero** — 🔧. "Hover or click any cluster"
   (S1) is one grey sentence. Nothing glows on hover; nothing invites clicking. First-run
   should pulse one cluster and pre-open the inspector on it.
7. **Load-model flow doesn't state consequences** (S1) — 🔧. "Use live Qwen model" vs
   "Load trace" vs "Load checkpoint" — three inputs, no explanation. One sentence under
   each ("runs a real forward pass on your machine" / "replays a recorded run — no GPU
   needed") sets the mental model.
8. **What should appear first** — 🔧: on fresh load, the strongest asset — a *live,
   already-running* generation or a bundled trace mid-replay — not an empty black canvas
   with a corner smudge (S1). Show motion in the first two seconds; explain in the next ten.

---

## 4. Three.js / scene problems

1. **The kebab problem** (S9, S13) — 🆕. 24 layers stacked vertically = each layer is
   ~20px of grey mush, or you scroll forever. Fixes by ambition: (a) **semantic LOD** —
   collapse non-focused layers to thin slabs, expand the focused layer to full per-op
   geometry (the per-op catalog already exists to drive it); (b) fisheye vertical
   distortion around the active layer; (c) optional horizontal "timeline" orientation.
2. **Flat lighting, no depth cues** (S3, S4, S11) — 🆕. No AO, no shadows, no fog — discs
   float ambiguously, hourglasses read as flat sprites. One directional light + soft AO +
   subtle depth fog triples legibility at zero data cost.
3. **Default camera framing is broken** (S1) — 🔧. Point cloud clipped at the top edge,
   ~10% of canvas. Frame the bounding box on load (`camera.fit(bbox)`), always.
4. **Materials carry no meaning** — 🆕. Component type, activation magnitude, active-op
   state all the same grey. Encode: hue = component class, emissive = executing op,
   saturation = activation-stat magnitude. The per-layer stats already stream.
5. **Selection/hover states absent** — 🆕. Raycast hover → outline + tooltip (name/shape);
   click → inspector. Without this the 3D is a picture, not an instrument.
6. **Head blades unreadable** (S3) — 🔧. White slivers at grazing angle. When a layer is
   focused, blades should fan out (explode transform) and be individually hoverable —
   your BertViz-killer interaction, currently invisible.
7. **Scale honesty** — 🆕. Blade count and funnel belly are data-driven (good — 5.4× FFN
   ratio visible), but nothing communicates the *embedding* slab is 27% of all params.
   Volume should be proportional to parameter count everywhere or nowhere.

---

## 5. LLM correctness

1. **"Layer Normalization" is the wrong name** (S3–S8 right panel, S13 chapter, TOC) —
   🔧. Qwen2.5 uses **RMSNorm** — the formula card shows x/√(1/d·Σx²+ε)⊙γ and the top bar
   says `RMSNorm · RoPE · SwiGLU · GQA`. The panel title contradicts the chip above it.
   Rename to "RMSNorm"; distinguish `input_layernorm` vs `post_attention_layernorm` (both
   tensors are in the catalog).
2. **The identical formula renders twice** in the right panel (S3–S8) — 🔧. Show it once,
   in the op card, where it has context.
3. **The residual stream is topologically wrong — the big one** — 🆕. The scene renders
   components as *stations on a pipe*: embedding → norm → attention → MLP, sequentially.
   The defining feature of a transformer is that attention and MLP are **branches**: the
   stream flows *past*, each block reads a normalized copy and **adds** its delta back.
   The README says exactly this. Geometry should show a bright spine with side-loops
   merging back at visible "+" junctions. bbycroft gets this right; you currently teach
   the wrong architecture at first glance — and it makes v0.5 ablation harder to explain
   (ablating a branch visibly severs a loop; ablating a "pipe segment" implies the stream
   stops).
4. **The hourglass is the wrong metaphor for norm** (S3, S13) — 🆕. An hourglass says
   "dimensionality reduction"; RMSNorm preserves 896 → 896 and *rescales*. A ring/collar
   that changes radius (magnitude) on a constant-width stream teaches the right thing.
5. **SwiGLU is drawn as one funnel** (S3, S11) — 🆕 but it's `gate_proj` ∥ `up_proj` → ⊙
   → `down_proj`: two parallel inflows and an elementwise gate. Twin intake cones merging
   would be more correct and more distinctive.
6. **Missing/mis-surfaced** — mixed:
   - RoPE — 🆕 (should appear as a twist applied to Q/K, even iconographically).
   - KV-cache as a *spatial* object — 🔧 (`KvCacheTimeline.tsx` exists; surface it in the
     scene, drawing the cache growing, from real `cache_len`).
   - Attention arcs from focused head to token strip — 🆕 (the single most explanatory
     attention visual, currently absent).
   - Logit lens — 🔧 (`LogitLensPanel.tsx` exists but isn't surfaced in the screenshots;
     it should be the spine of the right panel, on every screen).
7. **Already correct and rare — say it louder in the UI** — ✅: pre-fill vs decode as a
   real phase (S3 "39 prompt tokens computed"), GQA clustering (14→2), true op ordering
   (op N/243), cumulative parameter accounting, case-sensitive token identities (S5
   `Red`/`red`). Each deserves a hover-tooltip explaining *why* it proves the data is real.

---

## 6. Comparisons

| Tool | Does better than TokenPrint today | TokenPrint does better |
|---|---|---|
| **bbycroft llm-viz** | Composition, camera choreography; residual branching drawn correctly; every element labeled in-scene; guided zoom never shows an empty frame | Real weights, real prompts, real generation; bbycroft's live model sorts A/B/C — yours answers questions |
| **Transformer Explainer** | Zero-install; immaculate loading states; tight visual-to-concept mapping; nothing occludes | Arbitrary(-ish) models, streaming multi-token generation, 3D tensor-level inspection, ablation |
| **BertViz** | Head-level attention *content* (who attends to whom) — you show head *existence* | Product UX, no notebook, live generation, geometry |
| **Netron** | Instant load, perfect text truncation, search, flawless hierarchy for 300+ nodes | Execution. Netron ends at the graph; you run it |
| **Neuronpedia** | Polished panels, empty states, feature-level interventions with visible diffs | Local, private, any model, no pre-trained artifacts |
| **InTraVisTo** | Logit-lens heatmap + Sankey information flow | Product-polish potential, 3D, streaming, GGUF |
| **TensorBoard** | Dockable multi-pane layout, run comparison, export | Live per-op granularity, interactivity |
| **Chrome DevTools** | Docked panels, keyboard model, pause-on-breakpoint mental model, empty/error states | Nothing yet — this is the bar for the debugger |
| **Blender** | Viewport gizmos, hover/selection outlines, N-panel context properties | n/a — steal its viewport conventions |
| **VS Code** | Command palette, consistent typography scale, panel discipline | n/a — steal its layout system |

---

## 7. TokenPrint v2 — the redesign

One shell, DevTools-style, for all three modes. Kill every floating overlay.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⬢ TokenPrint   [Explore] [Debug] [Learn]        Qwen2.5-0.5B · 494M · f32 ▾ │ ← one stat home
├───────────┬──────────────────────────────────────────────┬───────────────────┤
│ NAVIGATOR │                3D VIEWPORT                   │ INSPECTOR         │
│ ▸ Embed   │   (framed, lit, color-coded, LOD;           │ ┌───────────────┐ │
│ ▾ L14 ●   │    focused layer expanded, others slabs;    │ │ RMSNorm · L14 │ │
│   ·attn   │    residual spine + branch loops;           │ │ op 142/243    │ │
│   ·mlp    │    attention arcs → token strip)            │ │ formula (1×)  │ │
│ ▸ L15     │                                              │ │ histogram     │ │
│ …         │                                              │ │ [export .npz] │ │
│ TENSORS   │                                              │ ├───────────────┤ │
│ [filter]  │                                              │ │ LOGIT LENS    │ │
│ q_proj …  │                                              │ │ L: cat→animal │ │
├───────────┴──────────────────────────────────────────────┤ │    →tiger ▓▓▓ │ │
│ ▶ ⏸ ⏭op ⏭tok │ tok 7/12 · op 142/243 │ decode · KV 46/32768 │ 1× │ ⌨ F10   │ ← docked timeline
│ TOKENS  The cat sat on the [mat] ▁and …   (arcs land here)                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Navigator (left)** replaces the static ARCHITECTURE dump: a collapsible layer/op tree
  that *is* the breakpoint gutter — click a gutter dot to set a breakpoint, exactly like
  VS Code. Tensor filter beneath it (S2's list, middle-truncated).
- **Viewport (center)**: residual spine with branch loops (§5.3), semantic LOD (§4.1),
  hue by component class, emissive = executing op, hover outlines. Camera presets per
  mode; never an unframed or empty state — if data is loading, show the architecture
  skeleton with a shimmer, not blackness (fixes S10 permanently).
- **Inspector (right)**: Blender's N-panel pattern. Top: context card for the selected op
  (formula once, real stats, export). Bottom: the **logit-lens strip, always visible** —
  the product's heartbeat, answering "what is my model thinking *right now*" on every
  screen. The prediction game docks here as an overlay *on the lens strip*, never on the
  viewport.
- **Timeline (bottom)**: transport controls, scrubber over ops×tokens, phase + KV readout
  (`KvCacheTimeline` slots exactly here), token strip with attention arcs landing on it.
  Keyboard: Space pause, F10 step-op, F11 step-layer, J/K token, B breakpoint.
- **Learn mode** = same shell, Navigator → chapter TOC, Inspector top card → prose.
  Chapters gate on data (§2.2), speed caps at data availability, ablation is *not here*.

---

## 8. The internal-debugger thought experiment

If building this inside a lab for daily use, the panels would be: **Run manager** (every
forward pass a named, diffable artifact — your traces are exactly this); **Prompt lab**
(prompt + chat-template view, token ids visible — you already render `<|im_start|>`
honestly in S5, keep it); **Layer table** (one row/layer: residual norm, attn-delta norm,
MLP-delta norm, entropy, ms — sparklines, sortable; your streamed stats already contain
most columns); **Head grid** (24×14 small-multiples of attention entropy/pattern class,
click-through to full heatmap — `HeadInspector` + fingerprinting); **Logit-lens matrix**
(layers × positions, InTraVisTo-style); **Intervention console** (ablate/scale/patch any
module, queued jobs, auto-diffed results); **Anomaly sentinels** (NaN/Inf/explosion
watchdogs that pause like `pause on exceptions`); **Profiler** (per-op ms + memory,
flame-graph over the op catalog). Your issue set already covers ~70% of this. The internal
tool would have *worse* graphics and *better* keyboard/diff ergonomics — which tells you
where the effort ratio should shift.

---

## 9. 100 feature ideas, ranked

Scores: **E**du / **R**esearch / en**G**ineering / **C**ommunity / **N**ovelty / **W**ow,
1–5. **D**ifficulty S/M/L/XL. Status vs. working tree in the last column.

**Core debugger (the identity)**

| # | Feature | E | R | G | C | N | W | D | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Layer/op breakpoints (#13) | 3 | 5 | 5 | 4 | 4 | 4 | L | ✅ `debug.py` |
| 2 | Pause-and-inspect tensors (#14) | 3 | 5 | 5 | 4 | 4 | 4 | M | ✅ `DebugInspector.tsx` |
| 3 | Step-op/layer/token keyboard model | 3 | 4 | 5 | 3 | 3 | 3 | S | 🆕 |
| 4 | Watch expressions ("pause when residual norm > x") | 2 | 5 | 5 | 3 | 5 | 4 | M | 🆕 |
| 5 | NaN/Inf sentinels with auto-pause | 2 | 4 | 5 | 3 | 4 | 3 | S | 🆕 |
| 6 | Conditional breakpoints (token == "…") | 2 | 4 | 4 | 3 | 4 | 3 | M | 🆕 |
| 7 | Call-stack analogue: op provenance for any number | 4 | 4 | 4 | 3 | 5 | 4 | M | 🆕 |
| 8 | Per-op flame graph (#18 extended) | 2 | 3 | 5 | 3 | 3 | 3 | M | 🔧 `TimingReadout.tsx` |
| 9 | "Pause on anomaly" profiles (perplexity spike) | 2 | 5 | 4 | 3 | 5 | 4 | L | 🆕 |
| 10 | Command palette (⌘K) | 2 | 2 | 4 | 3 | 2 | 2 | S | 🆕 |

**Traces & sharing (distribution)**

| # | Feature | E | R | G | C | N | W | D | Status |
|---|---|---|---|---|---|---|---|---|---|
| 11 | Trace record/replay (#2,#3) | 4 | 4 | 5 | 5 | 4 | 4 | M | ✅ `trace.py`, `store.ts` |
| 12 | Hosted zero-install trace demo (#4) | 5 | 2 | 3 | 5 | 3 | 5 | M | 🔧 `DemoData.tsx` (needs deploy) |
| 13 | Snapshot URLs (#5) | 4 | 3 | 3 | 5 | 3 | 3 | S | ✅ `useSnapshotUrl.ts` |
| 14 | Trace diff view (#19) | 3 | 5 | 5 | 4 | 4 | 4 | M | ✅ `ConfigDiff.tsx` |
| 15 | Trace attachments as GitHub issue artifacts | 2 | 4 | 4 | 5 | 4 | 3 | S | 🆕 |
| 16 | Embeddable read-only trace player (iframe) | 5 | 2 | 2 | 5 | 4 | 4 | M | 🆕 |
| 17 | Trace gallery (community runs) | 4 | 3 | 2 | 5 | 4 | 4 | M | 🆕 |
| 18 | Annotated traces (timestamped comments) | 4 | 3 | 3 | 4 | 4 | 3 | M | 🆕 |
| 19 | Trace → GIF/MP4 export | 4 | 1 | 2 | 5 | 3 | 4 | M | 🆕 |
| 20 | Classroom mode (instructor drives, students follow) | 5 | 1 | 1 | 4 | 4 | 4 | L | 🆕 |

**Interpretability (the depth)**

| # | Feature | E | R | G | C | N | W | D | Status |
|---|---|---|---|---|---|---|---|---|---|
| 21 | Logit-lens heatmap (#9,#10) | 5 | 5 | 4 | 4 | 4 | 5 | M | 🔧 `LogitLensPanel.tsx` (surface it) |
| 22 | Token evolution timeline (#11) | 5 | 4 | 3 | 4 | 4 | 5 | M | ✅ `EvolutionTimeline.tsx` |
| 23 | Per-head attention heatmaps (#15) | 4 | 5 | 4 | 4 | 3 | 4 | M | ✅ `HeadInspector.tsx` |
| 24 | Head fingerprinting (#16) | 4 | 5 | 4 | 4 | 5 | 4 | M | ✅ `HeadInspector.tsx` |
| 25 | Head/block ablation (#20,#21) | 4 | 5 | 5 | 4 | 5 | 5 | L | 🔧 `ablation.py`/`AblationPanel.tsx` (re-place) |
| 26 | Attention arcs onto token strip in 3D | 5 | 3 | 3 | 4 | 4 | 5 | M | 🆕 |
| 27 | Activation patching between two prompts | 3 | 5 | 4 | 3 | 4 | 4 | L | 🆕 |
| 28 | Attention entropy per head over time | 3 | 4 | 4 | 3 | 3 | 3 | S | 🆕 |
| 29 | Residual contribution widths (attn vs MLP/layer) | 5 | 4 | 3 | 3 | 5 | 4 | M | 🆕 |
| 30 | Neuron activation top-k examples (local) | 3 | 5 | 3 | 3 | 3 | 3 | L | 🆕 |
| 31 | Tuned-lens optional probe mode (parked, labeled) | 3 | 4 | 3 | 2 | 2 | 3 | L | 🆕 (parked) |
| 32 | Embedding-space PCA/UMAP flythrough | 4 | 3 | 2 | 3 | 3 | 4 | M | 🔧 (PCA exists in `/analyze`) |
| 33 | Induction-head lab (prompt battery + verdicts) | 4 | 5 | 3 | 3 | 5 | 4 | M | 🆕 |
| 34 | Attention pattern search | 2 | 5 | 4 | 3 | 5 | 3 | L | 🆕 |
| 35 | Layer-skip counterfactual (route around layer N) | 4 | 4 | 4 | 3 | 4 | 4 | M | 🔧 (ablation extends to this) |

**GGUF / quantization (the local-LLM audience)**

| # | Feature | E | R | G | C | N | W | D | Status |
|---|---|---|---|---|---|---|---|---|---|
| 36 | Scoped dequantization (#6) | 3 | 3 | 5 | 5 | 4 | 3 | M | ✅ `gguf/dequant.ts` |
| 37 | Dual-GGUF histogram diff (#7) | 3 | 4 | 5 | 5 | 5 | 4 | M | ✅ `ComparePanel.tsx` |
| 38 | Quant hot-spot ranking (#8) | 2 | 4 | 5 | 5 | 4 | 3 | S | ✅ `ComparePanel.tsx` |
| 39 | GGUF metadata diff (any fields) | 2 | 2 | 4 | 4 | 3 | 2 | S | 🆕 |
| 40 | Quant-format explainer overlay (Q4_K block structure) | 5 | 2 | 3 | 4 | 5 | 4 | M | 🆕 |
| 41 | Real quantized inference via llama.cpp (parked) | 3 | 4 | 5 | 5 | 4 | 4 | XL | 🆕 (parked) |
| 42 | Import safetensors alongside GGUF | 2 | 3 | 4 | 4 | 2 | 2 | M | 🆕 |
| 43 | LoRA delta visualization (base vs merged) | 3 | 4 | 5 | 4 | 5 | 4 | M | 🆕 |
| 44 | Tokenizer diff between two models | 4 | 3 | 3 | 4 | 4 | 3 | S | 🆕 |
| 45 | VRAM fit estimator from real tensor sizes | 2 | 1 | 4 | 5 | 2 | 2 | S | 🆕 |

**Learning (the funnel)**

| # | Feature | E | R | G | C | N | W | D | Status |
|---|---|---|---|---|---|---|---|---|---|
| 46 | Prediction game, docked + n-round (refine) | 5 | 1 | 1 | 4 | 4 | 4 | S | 🔧 `PredictionGame.tsx` (dock it) |
| 47 | Guess-the-layer logit-lens game (#12) | 5 | 1 | 1 | 4 | 4 | 4 | S | ✅ `PredictionGame.tsx` |
| 48 | Non-Latin tokenization chapter (#23) | 5 | 2 | 2 | 4 | 4 | 3 | S | 🆕 **(only unbuilt issue)** |
| 49 | "Why did it pick this token?" explainer chain | 5 | 3 | 3 | 4 | 5 | 5 | L | 🆕 |
| 50 | Temperature/top-p playground (live distribution morph) | 5 | 2 | 3 | 4 | 3 | 4 | M | 🆕 |
| 51 | Glossary hover-cards on every term | 5 | 1 | 2 | 4 | 2 | 2 | S | 🆕 |
| 52 | Progressive-disclosure "depth dial" (learner→engineer) | 5 | 2 | 3 | 3 | 4 | 3 | M | 🆕 |
| 53 | Chapter quizzes with real-number answers | 5 | 1 | 1 | 3 | 3 | 2 | S | 🆕 |
| 54 | Sandbox prompts with guaranteed-interesting behavior | 4 | 2 | 1 | 4 | 3 | 3 | S | 🆕 |
| 55 | Narrated audio walkthrough option | 4 | 1 | 1 | 3 | 3 | 3 | M | 🆕 |

**Scene/UX platform**

| # | Feature | E | R | G | C | N | W | D | Status |
|---|---|---|---|---|---|---|---|---|---|
| 56 | Docked panel shell (§7) | 3 | 3 | 5 | 4 | 2 | 3 | L | 🆕 |
| 57 | Semantic LOD stack | 4 | 3 | 4 | 3 | 4 | 4 | L | 🆕 |
| 58 | Residual-branch topology fix | 5 | 3 | 3 | 3 | 4 | 4 | M | 🆕 |
| 59 | Component-class color system | 4 | 2 | 3 | 3 | 2 | 3 | S | 🆕 |
| 60 | Hover/selection outlines + tooltips | 4 | 3 | 4 | 3 | 2 | 3 | S | 🆕 |
| 61 | Camera bookmarks + auto-framing | 3 | 2 | 4 | 3 | 2 | 2 | S | 🔧 (fit-on-load part) |
| 62 | 2D fallback mode parity (finish it) | 3 | 3 | 4 | 4 | 2 | 2 | M | 🔧 (toggle exists) |
| 63 | Light mode for classrooms/projectors | 4 | 1 | 2 | 4 | 1 | 1 | S | 🆕 |
| 64 | A11y: full keyboard nav + reduced-motion | 3 | 2 | 3 | 4 | 2 | 1 | M | 🆕 |
| 65 | Localization (the Tamil-speaking half of the audience) | 4 | 1 | 1 | 5 | 2 | 2 | M | 🆕 |

**Engineering surface**

| # | Feature | E | R | G | C | N | W | D | Status |
|---|---|---|---|---|---|---|---|---|---|
| 66 | Local checkpoint loading (#22) | 2 | 4 | 5 | 5 | 2 | 2 | S | ✅ `CheckpointLoader.tsx` |
| 67 | Raw .npz/.csv export (#17) | 2 | 5 | 5 | 4 | 2 | 2 | S | ✅ `DataExport.tsx` |
| 68 | Per-layer ms HUD (#18) | 2 | 3 | 5 | 3 | 2 | 2 | S | ✅ `TimingReadout.tsx` |
| 69 | KV-cache spatial growth viz (#24 + scene) | 5 | 3 | 4 | 4 | 5 | 4 | M | 🔧 `KvCacheTimeline.tsx` (into scene) |
| 70 | Config-diff runs (#19) | 3 | 4 | 5 | 4 | 3 | 3 | M | ✅ `ConfigDiff.tsx` |
| 71 | REST API for headless trace capture (CI) | 1 | 4 | 5 | 4 | 4 | 2 | M | 🔧 (`/trace` exists) |
| 72 | Python client (`tokenprint.capture(model, prompt)`) | 2 | 5 | 5 | 5 | 4 | 3 | M | 🆕 |
| 73 | Batch prompt sweeps with aggregate stats | 1 | 5 | 4 | 3 | 3 | 2 | M | 🆕 |
| 74 | Regression guard: trace-diff in CI on model update | 1 | 4 | 5 | 4 | 5 | 3 | L | 🆕 |
| 75 | Context-length stress view (attention cost growth) | 4 | 3 | 4 | 4 | 4 | 3 | M | 🆕 |

**Model coverage**

| # | Feature | E | R | G | C | N | W | D | Status |
|---|---|---|---|---|---|---|---|---|---|
| 76 | GPT-2 local live (formula set already wired) | 4 | 3 | 3 | 4 | 2 | 2 | M | 🔧 (formulas ready, no local run) |
| 77 | Llama 3.x family | 3 | 3 | 4 | 5 | 1 | 2 | S | 🔧 (checkpoint loader covers it) |
| 78 | MoE routing visualization (expert lanes) | 5 | 5 | 4 | 5 | 5 | 5 | XL | 🆕 |
| 79 | Vision transformer mode (patches as tokens) | 4 | 4 | 3 | 4 | 4 | 4 | XL | 🆕 |
| 80 | Embedding-model mode (bi-encoder similarity) | 3 | 3 | 3 | 3 | 3 | 2 | L | 🆕 |
| 81 | Speculative-decoding viz (draft vs target) | 4 | 4 | 4 | 4 | 5 | 5 | XL | 🆕 |
| 82 | Cross-model trace comparison (two traces) | 4 | 5 | 4 | 4 | 4 | 4 | M | 🔧 (trace-diff generalizes) |
| 83 | Sliding-window attention visualization | 4 | 3 | 3 | 3 | 4 | 3 | M | 🆕 |
| 84 | Multi-token prediction heads | 3 | 4 | 3 | 2 | 4 | 3 | L | 🆕 |
| 85 | Long-context "needle" experiment mode | 4 | 4 | 3 | 4 | 4 | 4 | L | 🆕 |

**Community / platform**

| # | Feature | E | R | G | C | N | W | D | Status |
|---|---|---|---|---|---|---|---|---|---|
| 86 | Good-first-issue bot linking roadmap→issues | 1 | 1 | 2 | 5 | 2 | 1 | S | 🔧 (done manually) |
| 87 | Plugin/panel API (parked — post-traction) | 2 | 4 | 4 | 5 | 3 | 3 | XL | 🆕 (parked) |
| 88 | Preset "lab notebooks" (experiment recipes) | 4 | 4 | 3 | 4 | 4 | 3 | M | 🆕 |
| 89 | Model-of-the-week curated trace drops | 3 | 2 | 1 | 5 | 3 | 3 | S | 🆕 |
| 90 | Landscape-watch label + doc (keep current) | 1 | 2 | 1 | 4 | 1 | 1 | S | ✅ (ROADMAP §6) |
| 91 | Launch from LM Studio/Ollama model list | 2 | 2 | 4 | 5 | 4 | 3 | L | 🆕 |
| 92 | HF Space one-click deploy of trace player | 4 | 2 | 2 | 5 | 3 | 3 | M | 🆕 |
| 93 | Conference/teaching license page (it's MIT) | 2 | 1 | 1 | 4 | 1 | 1 | S | 🆕 |
| 94 | "Verified real" badge spec others can adopt | 2 | 3 | 2 | 4 | 5 | 2 | S | 🆕 |
| 95 | Public benchmark: time-to-first-insight vs others | 2 | 2 | 2 | 4 | 4 | 2 | M | 🆕 |

**Wildcards**

| # | Feature | E | R | G | C | N | W | D | Status |
|---|---|---|---|---|---|---|---|---|---|
| 96 | VR/AR walkthrough of the stack | 3 | 1 | 1 | 3 | 4 | 5 | XL | 🆕 |
| 97 | Sonification of activations (hear an anomaly) | 3 | 2 | 2 | 3 | 5 | 4 | M | 🆕 |
| 98 | "Time-travel" scrubbing with ghost trails | 4 | 3 | 3 | 3 | 4 | 4 | L | 🔧 (playback scrub exists) |
| 99 | Live collab cursors on a shared trace | 3 | 2 | 2 | 4 | 4 | 4 | XL | 🆕 |
| 100 | Model "health report" PDF from a prompt battery | 2 | 3 | 4 | 4 | 4 | 3 | M | 🆕 |

---

## 10. Top 20 features no existing tool provides

1. Trace record/replay as shareable files (real forward passes, no GPU to view) — ✅
2. Zero-install demo that replays *real* — not canned-synthetic — computation — 🔧 (deploy)
3. Breakpoint-and-step execution on a live local model — ✅ backend, 🆕 keyboard
4. Raw-component ablation on any dropped-in model, zero pre-trained artifacts — 🔧 (re-place)
5. Dual-GGUF quantization histogram diff on the user's own files — ✅
6. Attention-head fingerprinting with plain-language verdicts — ✅ (add verdicts)
7. 3D residual stream with true branch topology + per-layer contribution widths — 🆕
8. GQA rendered as visible head-group geometry — ✅
9. Live cumulative parameter accounting per op during generation — ✅
10. KV-cache as a spatial object growing through pre-fill/decode — 🔧
11. Prediction game on the model's real top-k (learning-by-betting) — ✅
12. Snapshot URLs to an exact op/layer/token moment — ✅
13. Cross-quant trace diff (Q4 vs F16, divergence highlighted) — 🔧 (generalize ConfigDiff)
14. Number provenance: click any value → the op chain that produced it — 🆕
15. Flame-graph profiling mapped onto the 3D architecture — 🔧 (timings exist)
16. Full-precision `.npz` export of anything on screen — ✅
17. Tokenizer byte-fallback fragmentation shown geometrically (multilingual) — 🆕 (#23)
18. Induction-head lab: one-click diagnostic battery on *your* model — 🆕 (fingerprints exist)
19. Trace-diff as a CI regression gate for model updates — 🆕
20. Continuous semantic zoom: model → layer → head → tensor in one camera move — 🆕

**Read this list twice:** 9 of the 20 hardest-to-copy moat features are *already built*.
The competitive moat is mostly a surfacing-and-polish problem, not a build problem.

---

## 11. The one-sentence version

**Your numbers are already the best in the field; your frame around them is the worst part
of the product — fix the seven credibility bugs this week, dock the UI, correct the
residual topology, and ship the hosted trace demo, and TokenPrint stops being a demo and
becomes the instrument the roadmap promises.**

---

## 12. Full roadmap — nothing left out

Every finding above is placed below. Legend: ✅ built · 🔧 polish · 🆕 new. Issue refs
point to [the tracker](https://github.com/Sudharsanselvaraj/Token-Print/issues).

### Phase 0 — Credibility triage (1–2 days) — *ship this week*

The launch-blockers. All are 🔧 and all are in files we know. None add features; they stop
the product looking broken.

| # | Fix | Where | Why |
|---|---|---|---|
| 0.1 | Remove duplicate LOAD MODEL block | `frontend/components/ui/Sidebar.tsx` | (§2.1) A duplicated panel reads as unmaintained |
| 0.2 | Gate walkthrough chapters on `/analyze`; no `…` placeholders | `frontend/components/ui/WalkthroughPane.tsx` | (§2.2) "No number at all" is the worst failure for "every number is real" |
| 0.3 | Never render an empty canvas; show skeleton/shimmer while loading | scene loader | (§2.3, §4-loading) S10 shows literally nothing |
| 0.4 | Loading state: spinner + elapsed + retry (replace stuck "Loading…") | walkthrough right panel | (§2.4) A debugger never stalls silently |
| 0.5 | Cap autoplay speed to data availability | `PlaybackEngine.tsx` / walkthrough | (§3.3) Speed must not outrun the backend |
| 0.6 | Rename "Layer Normalization" → "RMSNorm"; split input vs post-attn | op card + chapter + TOC | (§5.1) The title contradicts the chip above it |
| 0.7 | Render the norm formula once (op card only) | right panel | (§5.2) Duplicate formula = clutter |
| 0.8 | Escape whitespace/newline tokens (`␣`, `\n`, `<0x0A>`) | top-k list, token strip | (§2.5) Blank bars look broken |
| 0.9 | Middle-truncate tensor names; un-clip helper strings & token strip | sidebar, HUD | (§2.6) The suffix is the identifying part |
| 0.10 | Move/remove the floating "N" button off content | shell | (§2.7) It overlaps the tensor list |
| 0.11 | Frame the point cloud on load (`camera.fit(bbox)`) | Architecture scene | (§4.3) S1 clips the data to 10% of canvas |
| 0.12 | Escape/label `<im_end>`-type tokens consistently | token strip | (§5.7) Keep the honest chat-template display legible |

**Phase 0 exit:** a first-time visitor never sees an ellipsis, an empty canvas, a stuck
spinner, a duplicated panel, or a wrong component name.

### Phase 1 — Instrument, not picture (1–2 weeks)

Turn the existing pile of panels into one coherent, docked instrument. Mostly 🔧
(re-placement of already-built components) plus a few high-leverage 🆕 scene upgrades.

| # | Work | Type | Where | Why |
|---|---|---|---|---|
| 1.1 | Build the docked shell (Navigator · Viewport · Inspector · Timeline) | 🆕 | `AppShell.tsx` (§7) | Kills floating overlays; the DevTools identity |
| 1.2 | Dock playback into the bottom Timeline | 🔧 | `GenerationTopControls.tsx` | (§3.1) Stop occluding the embedding slab |
| 1.3 | Dock the prediction game into the right panel (over the logit-lens strip) | 🔧 | `PredictionGame.tsx` | (§3.4) Let the 3D stay visible; game = commentary |
| 1.4 | Rounds = tokens remaining; show score scale | 🔧 | `PredictionGame.tsx` | (§3.4) "2 rounds / +25 of what?" is unexplained |
| 1.5 | Move ablation OUT of Walkthrough into a Debug context; visible inputs; plain-language result | 🔧 | `AblationPanel.tsx`, `AppShell.tsx:71` | (§3.2) Crown jewel presented as a leftover |
| 1.6 | Surface the logit-lens strip permanently in the Inspector | 🔧 | `LogitLensPanel.tsx` | (§5.6) The product's heartbeat, currently hidden |
| 1.7 | Keyboard model: Space/F10/F11/J/K/B | 🆕 | shell | (§3.5) A debugger identity is a keyboard identity |
| 1.8 | Hover outlines + click-to-inspect + first-run pulse | 🆕 | scene | (§3.6, §4.5) Make the 3D an instrument, not a picture |
| 1.9 | Component-class color system (hue = attn/MLP/norm/embed) | 🆕 | scene materials | (§2.10, §4.4) Cheapest semantic channel, currently wasted |
| 1.10 | One directional light + soft AO + depth fog | 🆕 | scene | (§4.2) Triples legibility at zero data cost |
| 1.11 | Collapse triple-redundant stats to the top bar only | 🔧 | top bar / sidebar / right panel | (§2.8) ~40% chrome reclaimed |
| 1.12 | Establish a type scale + one dominant number per panel | 🔧 | globals.css | (§2.9) O(n) scanning → O(1) |
| 1.13 | Load-model flow: one consequence sentence under each option | 🔧 | `ModelLoader.tsx`, `CheckpointLoader.tsx` | (§3.7) Sets the mental model |
| 1.14 | First-load shows motion (a bundled trace mid-replay) | 🔧 | `DemoData.tsx` + boot | (§3.8) Don't open on a black canvas |

**Phase 1 exit:** one docked shell, no floating overlays, keyboard-drivable, color-coded,
lit, with the logit lens always visible.

### Phase 2 — Correct the science + ship distribution (2–4 weeks)

Fix what the visualization *teaches*, and put the zero-install demo online. This is the
Show HN moment.

| # | Work | Type | Where | Why |
|---|---|---|---|---|
| 2.1 | Residual-stream branch topology (spine + side-loops + "+" junctions) | 🆕 | `components/scenes/TransformerStack.tsx` | (§5.3) You currently teach the wrong architecture |
| 2.2 | RMSNorm as a rescaling collar (not an hourglass) | 🆕 | scene | (§5.4) Hourglass falsely implies dim reduction |
| 2.3 | SwiGLU as twin intake cones + gate (not one funnel) | 🆕 | scene | (§5.5) `gate ∥ up → ⊙ → down` is the truth |
| 2.4 | Attention arcs from focused head → token strip | 🆕 | scene + Timeline | (§5.6) The single most explanatory attention visual |
| 2.5 | KV-cache as a spatial object growing in-scene | 🔧 | `KvCacheTimeline.tsx` → scene | (§5.6) You have `cache_len`; draw it |
| 2.6 | RoPE as an iconographic twist on Q/K | 🆕 | scene | (§5.6) Currently invisible |
| 2.7 | Deploy the hosted trace demo (static export + bundled traces) | 🔧 | `DemoData.tsx`, CI | (§9-#12) Removes the install wall; the launch lever |
| 2.8 | Snapshot-URL share button prominent; verify restore | ✅→🔧 | `useSnapshotUrl.ts`, `TopBar.tsx` | (§9-#13) Every moment becomes shareable |
| 2.9 | "Why is this real?" hover-tooltips on the honest facts | 🔧 | HUD | (§5.7) Market the moat in-product |
| 2.10 | Head-fingerprint plain-language verdicts ("previous-token 0.92") | 🔧 | `HeadInspector.tsx` | (§10-#6, #18) Turns a heatmap into an answer |

**Phase 2 exit:** the scene is architecturally honest, and a stranger can watch a real
forward pass from a link with no install.

### Phase 3 — The debugger, complete (1–2 months)

Take the already-built backend debug/ablation machinery and make it a real debugger.

| # | Work | Type | Where | Why |
|---|---|---|---|---|
| 3.1 | Semantic LOD stack (focused layer expands, others collapse) | 🆕 | scene | (§4.1) Solves the 24-layer kebab |
| 3.2 | Breakpoint gutter in the Navigator tree | 🔧 | Navigator + `debug.py` | (§7) VS Code-style set-breakpoint |
| 3.3 | Tensor inspector on pause: stats + histogram + heatmap + export | ✅→🔧 | `DebugInspector.tsx`, `DataExport.tsx` | (§8) Already built; wire to breakpoints |
| 3.4 | Ablation A/B diff view (original vs ablated, side by side) | 🔧 | `AblationPanel.tsx` + `ConfigDiff.tsx` | (§9-#25) The "no SAE required" pitch |
| 3.5 | Config-/trace-diff generalized to cross-quant and cross-model | 🔧 | `ConfigDiff.tsx` | (§10-#13, §9-#82) One diff engine, many uses |
| 3.6 | Per-op flame graph over the op catalog | 🔧 | `TimingReadout.tsx` | (§8, §9-#8) Profiler panel |
| 3.7 | NaN/Inf anomaly sentinels (pause-on-exception analogue) | 🆕 | `debug.py` | (§8, §9-#5) Watchdog that pauses execution |
| 3.8 | Watch expressions ("pause when residual norm > x") | 🆕 | `debug.py` + Navigator | (§9-#4) Conditional debugging |
| 3.9 | Number provenance ("call stack" for any displayed value) | 🆕 | inspector | (§9-#7, §10-#14) Click a number → the ops that made it |
| 3.10 | Layer-table panel (norms/entropy/ms sparklines, sortable) | 🆕 | new panel | (§8) The engineer's home screen |
| 3.11 | Head grid (24×14 small-multiples → click-through) | 🔧 | `HeadInspector.tsx` | (§8) Overview-first attention |

**Phase 3 exit:** you can set a breakpoint on layer 14, hit it, inspect head 7's heatmap,
ablate it, resume, and diff the result — like stepping through code.

### Phase 4 — Depth & audience expansion (2–4 months)

| # | Work | Type | Why |
|---|---|---|---|
| 4.1 | Non-Latin tokenization view/chapter (#23) | 🆕 | The only unbuilt issue; high learner value; serves the Tamil/CJK audience |
| 4.2 | Quant-format explainer overlay (Q4_K block structure drawn) | 🆕 | Pairs with the dual-GGUF diff already built; unique to the local-LLM crowd |
| 4.3 | LoRA delta visualization (base vs merged) | 🆕 | Directly serves fine-tuners; leverages the compare engine |
| 4.4 | Induction-head lab (prompt battery + verdicts) | 🆕 | Research value; fingerprints already exist |
| 4.5 | Activation patching between two prompts | 🆕 | Core mech-interp move; extends ablation hooks |
| 4.6 | Residual contribution widths (attn vs MLP per layer) | 🆕 | Highest-novelty educational visual |
| 4.7 | Temperature/top-p live playground | 🆕 | Learner funnel; distribution morph |
| 4.8 | "Why did it pick this token?" one-click explainer chain | 🆕 | The killer learner feature; composes lens + attention + provenance |
| 4.9 | Python client + headless `/trace` capture for CI | 🔧/🆕 | Research + engineering adoption; `/trace` exists |
| 4.10 | Trace-diff as a CI regression gate | 🆕 | Turns TokenPrint into infrastructure |
| 4.11 | Glossary hover-cards; progressive "depth dial"; light mode; a11y | 🆕 | Broadens the funnel and accessibility |
| 4.12 | GPT-2 local live; confirm Llama 3.x via checkpoint loader | 🔧 | Formula sets already wired; close the "no local GPT-2" gap |

### Phase 5 — Platform & flagship visuals (6+ months)

| # | Work | Type | Why |
|---|---|---|---|
| 5.1 | MoE routing visualization (expert lanes lighting up) | 🆕 | Highest wow/novelty; almost nobody does it well |
| 5.2 | In-browser WebGPU/ONNX inference | 🆕 | Fuses the demo and the product; TS GGUF parser is the seed |
| 5.3 | Real quantized GGUF execution (llama.cpp) | 🆕 | Closes the honesty gap: generation still runs on full-precision PyTorch |
| 5.4 | Speculative-decoding, sliding-window, long-context "needle" modes | 🆕 | Research depth; distinct flagship visuals |
| 5.5 | Vision-transformer & embedding-model modes | 🆕 | Audience expansion beyond causal LMs |
| 5.6 | Trace gallery, embeddable player, classroom mode, annotations | 🆕 | Community/distribution flywheel |
| 5.7 | Plugin/panel API | 🆕 | Only once external contributors want it |
| 5.8 | Wildcards: sonification, VR walkthrough, collab cursors, health-report PDF | 🆕 | Opportunistic; high novelty, low priority |

### Parked (deliberately) — carried from ROADMAP.md §5

- Tuned-Lens-by-default (needs a per-model probe — violates "no auxiliary artifacts";
  ship as a labeled optional upgrade).
- SAE/feature browsing & steering (Neuronpedia's core competency; we differentiate on
  raw-component ablation instead).
- Full byte-level memory profiler (per-op ms lands in Phase 3; the byte profiler is a
  different product).

---

## 13. What is already excellent (don't touch)

- **The parameter honesty** — cumulative "PARAMETERS USED" per op is *exactly* right and
  is the single best trust signal in the product. Market it harder; never regress it.
- **Case-sensitive real token identities** (`Red` vs `red`) — most tools silently collapse
  these; you show the truth.
- **GQA blade clustering** (14 → 2) — a real architectural fact almost no visualization
  bothers to encode.
- **Real op ordering** (op N/243 from the true catalog) and **pre-fill vs decode as a real
  phase** — genuine, rare, correct.
- **The prediction game concept** — the best learning interaction in the category; it just
  needs docking, not redesigning.

Keep these as fixed points. Everything else in this document bends around protecting them.
