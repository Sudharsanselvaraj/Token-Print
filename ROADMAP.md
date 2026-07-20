# TokenPrint Roadmap

TokenPrint's identity going forward: **an interactive visual debugger for transformer
execution.** Not another "what is a transformer?" explainer — a tool that answers:

> **"What is *my* model doing right now, and why?"**

This document explains where that positioning comes from (the gaps in today's
ecosystem), what we are building next, in what order, and how each piece maps onto the
existing codebase.

---

## 1. The ecosystem, and the gap we occupy

Every existing tool solves one slice of the problem:

| Camp | Tools | What they answer | What they can't do |
| --- | --- | --- | --- |
| Educational visualizers | [bbycroft/llm-viz](https://github.com/bbycroft/llm-viz), [Transformer Explainer](https://poloclub.github.io/transformer-explainer/), 3Blue1Brown | *What is a transformer?* | Fixed demo models. bbycroft's only live-weight model is a tiny letter-sorting nanoGPT; Transformer Explainer is GPT-2-only and education-only. You cannot bring your own model. |
| Research notebook tools | [BertViz](https://github.com/jessevig/bertviz), [AttentionViz](https://catherinesyeh.github.io/attn-docs/), exBERT, [InTraVisTo](https://arxiv.org/abs/2507.13858) | *Where is attention? How do predictions form?* | Jupyter- or paper-bound. Researcher UX, no product experience, no generation streaming. |
| Mechanistic interpretability | TransformerLens, SAELens, CircuitsVis, [Neuronpedia](https://www.neuronpedia.org/) | *Which neurons encode which concepts?* | Aimed at interpretability researchers. Cloud-hosted or library-only; tied to pre-analyzed models, not your local file. |
| Model structure viewers | [Netron](https://github.com/lutzroeder/netron), GGUF metadata viewers | *What layers exist?* | Structure only. No forward pass, no activations, no execution. Netron ends at the graph — TokenPrint begins there. |

Put on two axes, there is an empty quadrant:

|  | Fixed demo model | Bring your own model |
| --- | --- | --- |
| **Static / canned** | bbycroft, Illustrated Transformer | Netron, GGUF viewers |
| **Real live execution** | Transformer Explainer (GPT-2 only) | **TokenPrint** |

Nobody combines **3D immersive UI + real weights + real streaming generation +
arbitrary local models**. That quadrant is ours, and every milestone below is chosen to
defend it.

Two lessons from the tools that won attention: bbycroft won on *polish of a canned
demo*, Transformer Explainer won on *zero-friction access*. Distribution beats feature
count — which is why the first milestone below is about removing our install wall, not
adding a feature.

**Honesty note (and an open gap of our own):** the GGUF parser reads real structure
and metadata, but generation currently runs through PyTorch/transformers weights — we
do not yet execute quantized GGUF inference. The README must never overclaim this,
and closing it (llama.cpp integration) is deliberately parked in § 4.

---

## 2. Design principles

1. **Every number is real.** Already the core claim (see [docs/verification.md](docs/verification.md)).
   No illustrative values, ever. Each roadmap feature must be derived from a real
   forward pass or real weights.
2. **Debugger, not slideshow.** Features should compose like DevTools panels: pause,
   inspect, intervene, resume.
3. **Local and private.** Everything runs on the user's machine. No cloud dependency,
   no telemetry. Neuronpedia's weakness (hosted, fixed models) is our feature.
4. **Ship demos, not promises.** Each milestone ends with something a stranger can see
   in ten seconds from a link.

---

## 3. Milestones

### v0.2 — Record & Replay + hosted trace demo

*The distribution milestone. Everything else is louder if people can actually see it.*

**Why.** Today a curious visitor must clone the repo, install Python deps, and download
a model before seeing anything. Most never do. Meanwhile our WebSocket generation
stream already carries everything needed to reproduce a session — one message per
token with top-k probabilities and per-layer activation stats.

**What.**

- A **trace format**: serialize the full `/analyze` + generation WS stream (prompt,
  model metadata, per-token / per-layer payloads, timings) to a single JSON file.
- **Save / load / replay** in the UI: `PlaybackEngine` already drives play, pause,
  skip-to-layer, skip-to-token and speed over live streams
  ([frontend/components/PlaybackEngine.tsx](frontend/components/PlaybackEngine.tsx),
  [frontend/components/ui/GenerationTopControls.tsx](frontend/components/ui/GenerationTopControls.tsx)) —
  replay feeds it a recorded stream instead of a socket.
- A **static hosted demo** (Vercel/GitHub Pages) shipping 3–4 curated traces. No GPU,
  no backend, still 100 % real numbers — a recorded forward pass replayed faithfully.
- Traces are **shareable artifacts**: attach one to a GitHub issue ("look what layer 14
  does on this prompt") and anyone can replay it.

**How (implementation sketch).**

- Backend: tee the WS messages in [backend/app/main.py](backend/app/main.py) into a
  trace object; `GET /trace` to download. Version the schema from day one
  (`"trace_version": 1`).
- Frontend: a `TraceSource` that implements the same interface as the live socket in
  [frontend/lib/api.ts](frontend/lib/api.ts); drag-and-drop a `.tokenprint.json` onto
  the existing drop zone.
- Demo deploy: `next build` static export + bundled traces; a "recorded trace" badge in
  the top bar so replay is never mistaken for live inference.

**Done when:** a stranger clicks a link, watches a real Qwen generation flow through
the 3D stack, scrubs it token by token, and downloads the trace — without installing
anything.

---

### v0.3 — Logit Lens + token evolution timeline

*The "wow" milestone. Watch the prediction form, layer by layer.*

**Why.** The single most compelling interpretability visual (InTraVisTo's core idea):
project every layer's residual stream through the unembedding matrix and show what the
model "would say" if it stopped there — layer 5 thinks `animal`, layer 20 has settled
on `tiger`. It converts our per-layer stats from abstract numbers into a story, and it
is cheap: the backend already holds all hidden states during a forward pass.

**What.**

- Backend returns **top-5 decoded tokens + probabilities per layer per position**
  (final-norm + unembedding projection of each layer's residual output).
- A **logit-lens panel**: heatmap grid (layers × positions), shaded by probability of
  the eventually-chosen token — painted alongside the 3D layer stack so the moment
  "the prediction locks in" is visible spatially.
- **Token evolution timeline**: for each generated token, a replayable path
  embedding → attention → MLP → … → softmax → chosen token, driven by data we already
  stream.
- Recorded into traces from v0.2 automatically, so the hosted demo gets this for free.

**How.**

- Backend: in [backend/app/model.py](backend/app/model.py), capture per-layer hidden
  states (already available via `output_hidden_states`), apply `model.norm` +
  `lm_head`, keep top-5. Guard memory: decode top-k only, never ship full-vocab logits
  (151 936 × 24 layers is not a payload).
- Frontend: new panel component beside the walkthrough pane; reuse the existing
  heatmap/colour conventions from the tensor inspector.

**Done when:** typing a prompt shows, for every layer, what the model would predict
right there — live and in replayed traces.

---

### v0.4 — The debugger proper: breakpoints, tensor inspection, attention heads

*The identity milestone. This is where "visual debugger" stops being a metaphor.*

**Why.** We already have playback controls no one else has. What separates playback
from debugging is the ability to **stop at a chosen place and inspect real state**.

**What.**

- **Layer breakpoints**: click a layer in the 3D scene → generation pauses when the
  forward pass reaches it.
- **Tensor inspector on pause**: statistics, histogram, heatmap for the tensors at the
  paused position (residual, attention pattern, MLP activations), with export.
- **Attention head inspector**: click a head → its real attention heatmap for the
  current prompt (BertViz's head view, without Jupyter). Backend starts returning
  attention matrices for the inspected layer, not just summary stats.
- **Per-layer timing readout** (lightweight profiler garnish): the backend wraps each
  layer already; surface ms-per-layer in the HUD.

**How.**

- Backend: a stepped execution mode — hooks pause the forward pass at layer *N*
  (asyncio event), expose `POST /debug/continue`, `GET /debug/tensor?layer=&kind=`.
  Attention matrices fetched lazily per request (n_heads × seq² is fine for one layer,
  never for all 24 at once).
- Frontend: breakpoint markers in the district scene
  ([frontend/components/districts](frontend/components/districts)); inspector panel
  extends the existing [TensorList](frontend/components/ui/TensorList.tsx) /
  [RightPanel](frontend/components/ui/RightPanel.tsx) patterns.

**Done when:** you can set a breakpoint on layer 14, run a prompt, hit the breakpoint,
open head 7's attention heatmap, then resume — exactly like stepping through code.

---

### v0.5 — Interventions: ablation & counterfactuals

*The bridge from "observing" to "experimenting." First step toward mech-interp territory
without the SAE research burden.*

**Why.** Nothing proves "these numbers are real" like letting users break the model.
Zero out a head, re-run, watch the output degrade. This is also the feature that makes
TokenPrint useful to researchers, not just learners — and it builds directly on v0.4's
pause/step machinery.

**What.**

- **Head/block ablation**: toggle any attention head or MLP block off; re-run the same
  prompt; side-by-side diff of outputs and logit-lens tables (original vs. ablated).
- **A/B trace comparison**: because traces exist (v0.2), "compare two runs" is a
  trace-diff view — same UI later powers cross-model comparison without needing two
  models in memory.

**How.**

- Backend: forward hooks that zero the chosen module's contribution; an
  `interventions` field on the analyze/generate request; results recorded as ordinary
  traces tagged with their intervention.
- Frontend: toggle affordance on heads/blocks in the 3D scene; diff view reuses the
  logit-lens panel with a second column.

**Done when:** a user can show that ablating a specific head breaks subject–verb
agreement on their own prompt — and share both traces as proof.

---

## 4. Parked (deliberately) — and why

| Idea | Why parked |
| --- | --- |
| **In-browser inference (WebGPU/ONNX)** | High value (Transformer Explainer proved it) but v0.2's trace replay removes the install wall much more cheaply. Revisit once traces ship; our TS GGUF parser is the natural seed. |
| **Quantization explorer** (FP16 vs Q8/Q4 side-by-side) | Requires a second inference engine (llama.cpp) and true quantized execution — a rewrite-sized dependency. Do it when we close the "real GGUF execution" gap honestly, not before. |
| **Side-by-side live model comparison** | Two resident models, doubled VRAM, synchronized streams. Trace-diff (v0.5) delivers ~80 % of the value at ~5 % of the cost first. |
| **KV-cache visualizer / memory timeline** | Good educational value; needs backend memory instrumentation that shouldn't compete with the debugger core. Natural v0.6 candidate. |
| **Neuron/SAE feature browsing & steering** | Research-heavy (training/loading SAEs per model). Ablation (v0.5) is the pragmatic first intervention; revisit with the community. |
| **Plugin system** | Premature before there are external contributors who want it. We keep panels internally modular now; public API when forks appear. |
| **Full flame-graph profiler** | Per-layer ms lands in v0.4; a DevTools-grade profiler is a different product. |

---

## 5. Sequencing logic, in one paragraph

v0.2 first because distribution beats features and it is nearly free (the data already
flows through the WebSocket). v0.3 second because logit lens is the highest
wow-per-effort feature in the ecosystem and rides on v0.2's traces. v0.4 third because
breakpoints + inspection turn our existing playback chassis into the debugger the
positioning promises. v0.5 last because interventions require the pause/step machinery
and unlock the research audience. Everything parked either depends on a second
inference engine, a second resident model, or an audience we don't have yet.

---

## 6. Contributing

Each milestone will be broken into labeled GitHub issues (`v0.2`, `good first issue`,
`backend`, `frontend`). If you want to help, the trace format (v0.2) and the logit-lens
backend projection (v0.3) are the friendliest entry points — both are well-isolated and
testable against [docs/verification.md](docs/verification.md)'s "every number is real"
rule.
