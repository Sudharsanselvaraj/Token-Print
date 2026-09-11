<a name="top"></a>
<div align="center">
  <img src="TokenPrint logo.png" alt="TokenPrint" width="360" />

  <h3>See a language model think — real internals, real forward pass, real-time 3D.</h3>

  <p>
    <a href="https://github.com/Sudharsanselvaraj/Token-Print/actions/workflows/ci.yml"><img src="https://github.com/Sudharsanselvaraj/Token-Print/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e.svg?style=flat" alt="License: MIT" /></a>
    <a href="https://github.com/Sudharsanselvaraj/Token-Print/stargazers"><img src="https://img.shields.io/github/stars/Sudharsanselvaraj/Token-Print?style=flat&color=0a0a0a&label=stars" alt="Stars" /></a>
    <a href="https://github.com/Sudharsanselvaraj/Token-Print/network/members"><img src="https://img.shields.io/github/forks/Sudharsanselvaraj/Token-Print?style=flat&color=0a0a0a&label=forks" alt="Forks" /></a>
    <a href="https://github.com/Sudharsanselvaraj/Token-Print/commits/main"><img src="https://img.shields.io/github/last-commit/Sudharsanselvaraj/Token-Print?style=flat&color=0a0a0a&label=last%20commit" alt="Last commit" /></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/data-100%25%20real%20forward%20pass-0a0a0a.svg?style=flat" alt="Real data only" />
    <img src="https://img.shields.io/badge/backend-FastAPI%20%C2%B7%20PyTorch-009688.svg?style=flat" alt="Backend: FastAPI + PyTorch" />
    <img src="https://img.shields.io/badge/frontend-Next.js%20%C2%B7%20React%20Three%20Fiber-000000.svg?style=flat" alt="Frontend: Next.js + React Three Fiber" />
    <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs Welcome" /></a>
    <a href="GOOD_FIRST_ISSUES.md"><img src="https://img.shields.io/badge/good%20first%20issues-26-orange.svg?style=flat" alt="26 good first issues" /></a>
  </p>

  <p>
    <a href="#quickstart"><b>Quickstart</b></a> ·
    <a href="docs/README.md"><b>Docs</b></a> ·
    <a href="wiki/Home.md"><b>Wiki</b></a> ·
    <a href="ROADMAP.md"><b>Roadmap</b></a> ·
    <a href="CONTRIBUTING.md"><b>Contributing</b></a> ·
    <a href="GOOD_FIRST_ISSUES.md"><b>Good First Issues</b></a>
  </p>
</div>

---

<p align="center">
  <img src=".github/assets/demo.gif" alt="TokenPrint — live demo" width="820" />
  <br />
  <sub><a href=".github/assets/demo.mp4">▶ Watch the full demo (.mp4)</a></sub>
</p>

**TokenPrint** is a browser-based 3D inspector for the internals of a language model. Load a
live model or drop in a `.gguf` file and explore its tensors, run a real greedy generation
op-by-op, or walk through the transformer step by step. Every number you see is **real** —
parsed straight from a model file or produced by an actual forward pass. Nothing is
illustrative, sampled from noise, or hardcoded.

> [!TIP]
> New here? Open the **Architecture** tab and hit **Use live Qwen model** — you'll get a
> point cloud of the real `Qwen/Qwen2.5-0.5B-Instruct` tensors (494,032,768 params, 290
> tensors) with hover-to-inspect names, shapes, and dtypes.

<details>
<summary><b>Table of contents</b></summary>

- [Feature highlights](#feature-highlights)
- [Quickstart](#quickstart)
- [The four modes](#the-four-modes)
- [Model support and capability matrix](#model-support-and-capability-matrix)
- [Data provenance system](#data-provenance-system)
- [Architecture](#architecture)
- [Proving the data is real](#proving-the-data-is-real)
- [Documentation](#documentation)
- [Roadmap](#roadmap)
- [Honest limitations](#honest-limitations)
- [Engineering & community infrastructure](#-engineering--community-infrastructure)
- [Contributing](#contributing)
- [Creator and contributors](#creator-and-contributors)
- [License](#license)
- [Star history](#star-history)

</details>

---

## Feature highlights

- **Zero fabricated data** — every number on screen is parsed from a real model file or produced by an actual forward pass. A build-time guard fails `npm run build` the moment `Math.random` shows up in application code.
- **Four inspection modes** — Architecture, Generation, Walkthrough, and Debugger, each driven by its own real backend endpoint: a tensor list, a streamed generation, a full analysis pass, and a stepped debug session.
- **Real-time 3D, not diagrams** — React Three Fiber renders the actual residual stream, one blade per real attention head (grouped for GQA), and a SwiGLU funnel sized by the model's real FFN ratio.
- **Broad model support** — Qwen, Llama 2/3/3.2, Gemma/Gemma 2, DeepSeek/MoE, Mistral/Mixtral, GPT-2/Pythia, plus any local `.gguf` file, parsed client-side with nothing uploaded.
- **Provable, not just claimed** — five independent verification scripts and a CI regression gate back up every "real data" claim. See [Proving the data is real](#proving-the-data-is-real).
- **Honest about limitations** — known gaps are documented in this README, not buried in an issue tracker. See [Honest limitations](#honest-limitations).

## Quickstart

```bash
# 1. Backend — loads Qwen2.5-0.5B-Instruct once (Apple MPS / CPU fallback)
cd backend
python3 -m venv .venv --system-site-packages
source .venv/bin/activate && pip install -r requirements.txt
python -m uvicorn app.main:app --app-dir . --port 8000
```

```bash
# 2. Frontend — Next.js + React Three Fiber
cd frontend
npm install
npm run dev            # http://localhost:3000
```

Open **http://localhost:3000** and pick a mode from the top bar. No model file is required
for the live-model view; drag any local `.gguf` onto the drop zone to inspect it instead
(the file is parsed in-browser — nothing is uploaded).

### Optional GGUF backend support

```bash
# To enable native local GGUF backend execution:
pip install llama-cpp-python
```

## The four modes

| Mode | What it shows | Where the data comes from |
| ---- | ------------- | ------------------------- |
| **Architecture** | A 3D point cloud of every real tensor (layers as depth-colored panels), a searchable tensor list with hover/click inspection, and a real-data **model overview card** (params, layers, attn/KV heads, hidden, FFN, vocab, context) shown until a tensor is selected. Also a **2D tile grid** (tensors grouped by role, searchable), an SVG **topology view**, a **model info pane**, and a **quantization compare** panel that dequantizes a selected tensor from two GGUFs and diffs the real value distributions. | `GET /architecture` (live Qwen `named_parameters()`) **or** a client-side `.gguf` binary parser + `lib/gguf/dequant.ts`. |
| **Generation** | A real greedy generation streamed over WebSocket that **autoplays** token-by-token, layer-by-layer. The stack renders **distinctive per-operation geometry** — one blade per real attention head (clustered into KV groups for GQA), a SwiGLU funnel sized by the real FFN ratio, and RMSNorm waists — with a follow-mode camera, speed multiplier, skip-to-layer/token, and a live **pre-fill vs decode** KV-cache readout. The right panel shows the architecture-correct LaTeX formula, param count, weight preview, and optional raw dev values; a real **top-k probability skyline** sits at the output. | `WS /ws/generate` with `trace:true` — a real per-op catalog + per-token top-k, phase, and per-layer activation stats. |
| **Walkthrough** | A chaptered explanation (Overview → Tokenization → Embedding → RMSNorm → Self-Attention → MLP → Softmax) that **autoplays chapters**, advancing the 3D view in lockstep with eased camera moves. Chapters are **gated on real data** — they render a spinner with elapsed time rather than placeholder text. Includes the **logit lens** (what the model would predict at every layer), a **prediction game** on the real top-k, and curated multilingual prompts (Tamil, Hindi, Chinese, emoji) that make byte-fallback tokenization visible. | One real `POST /analyze` (attention + PCA geometry + per-layer logit lens). |
| **Debugger** | A tiled engineer dashboard: **breakpoints** that halt autoplay at a chosen op, a **flame graph** over the real op catalog, **anomaly sentinels** (z-score outliers in per-layer activation), **watch expressions**, a sortable **layer table**, a **head grid** (head×head attention similarity), **ablation** with a real before→after logit-lens diff, **induction-head lab**, **trace replay/branching**, and raw **`.npz`/`.csv` export**. | `POST /debug/analyze`, `POST /ablate/analyze`, `GET /debug/ops`, and the recorded trace. |

Formulas are **architecture-aware**: the family is detected from the model, so Qwen/Llama
render **RMSNorm · RoPE · SwiGLU · GQA** and GPT-2-style models render **LayerNorm · learned
positions · GELU** — never the wrong set.

**Geometry is data-driven, not decorative.** In the generation stack every proportion traces
to a real dimension: the blade count equals the real head count (14 query heads clustered into
2 KV groups — that's GQA you can see), the MLP funnel's belly is sized by the real
`ffn_size / hidden_size` ratio (≈5.4× for Qwen2.5-0.5B), and each block shows its two RMSNorm
waists. The **KV-cache phase** is real too: step 0 is a pre-fill over the whole prompt
(39 positions), every later step is a single-token decode reusing the cached prefix — the
UI labels and visibly shrinks the work accordingly. Autoplay pacing is normalized (never
fabricated in-between frames); a dropped WebGL context recovers automatically and falls back
to a readable message rather than a broken canvas.

## Model support and capability matrix

TokenPrint recognizes many transformer model families. Broad loading support does not imply identical instrumentation depth across all architectures:

| Model Family | Load / Parse | Real Forward Pass | Attention Visualization | Logit Lens | Head Ablation | Activation Patching | GGUF Dequant |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Qwen / Qwen2.5** | ✅ | ✅ (Live) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Llama 2 / 3 / 3.2** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Gemma / Gemma 2** | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ |
| **DeepSeek / MoE** | ✅ | ✅ (MoE Router) | ✅ | ✅ | ⚠️ | ⚠️ | ✅ |
| **Mistral / Mixtral**| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **GPT-2 / Pythia** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A |

## Data provenance system

TokenPrint follows a strict transparency standard. Every value displayed in the UI is tagged with its provenance level:

* **`REAL`** — Captured directly from live model execution, `named_parameters()`, or `.gguf` file headers.
* **`DERIVED`** — Computed deterministically from real model data (e.g. PCA, layer norms, entropy).
* **`CONCEPTUAL`** — Visual 3D geometry representing real model dimensions (e.g., GQA head grouping, SwiGLU funnel ratio).
* **`SIMULATION`** — Educational fallback data or proxy values (explicitly flagged with `SIMULATION` badge).

## Architecture

- **Backend** (`backend/`) — FastAPI. `GET /architecture` (real tensors + config, no forward
  pass), `POST /analyze` (real attention + PCA geometry + per-layer logit lens),
  `WS /ws/generate` (streamed greedy generation; `trace:true` adds the real per-op catalog,
  `record_trace:true` tees the stream into a downloadable trace), `GET /trace` +
  `POST /trace/replay` (record & replay), `GET /debug/ops` + `POST /debug/analyze`
  (stepped inspection), `POST /ablate/analyze` (zero heads/layers and re-run). Modules:
  `model.py`, `trace.py`, `debug.py`, `ablation.py`, `reduce.py`, `schemas.py`. Loads
  `Qwen/Qwen2.5-0.5B-Instruct` once on Apple **MPS** (`attn_implementation="eager"`, float32 —
  eager is mandatory for real attention data).
- **Frontend** (`frontend/`) — Next.js (app-router, TS) + React Three Fiber. `AppShell` is a
  **docked shell** (CSS grid: `"top top top" / "side canvas right" / "bot bot bot"`) — no
  floating overlays. `lib/gguf/` client-side GGUF parser + `dequant.ts`;
  `lib/formulas.ts` KaTeX formula sets; `lib/pointcloud.ts` tensor→points;
  `lib/playback.ts` (layer/op mapping + KV phase); `lib/sceneColors.ts` (component-class
  colors); `lib/useKeyboard.ts` (Space / F10 / F11 / J / K / B); `lib/useSnapshotUrl.ts`
  (shareable moment URLs); `lib/prompts.ts` (multilingual tokenization presets);
  `components/PlaybackEngine.tsx` (the single autoplay ticker, gated on data readiness);
  `SceneLoader.tsx` (WebGL context-loss recovery + fallback); scenes under
  `components/scenes/` (`TransformerStack`, `GenerationScene`, `WalkthroughScene`,
  `TensorCloud`, `KvCacheVolume`).

**The geometry is architecturally honest.** The residual stream renders as a continuous spine
with attention and MLP as **branches** that read a normalized copy and add their delta back at
visible merge nodes — not as sequential stations on a pipe. RMSNorm is a rescaling collar (896
→ 896, magnitude changes, width doesn't), SwiGLU shows its twin `gate_proj`/`up_proj` prongs
meeting at an element-wise multiply, RoPE appears as a helical twist on Q/K, and the KV cache
is a real spatial object that grows through pre-fill and decode.

> [!NOTE]
> The point cloud uses `THREE.Points` (one draw call), not instanced meshes — the right tool
> for hundreds of thousands of points on an integrated GPU. The GGUF parser reads only the
> file **header** (`File.slice`), so multi-GB models parse instantly and nothing is uploaded.

## Proving the data is real

TokenPrint's whole claim is that **every number is real**. It's checked, not asserted:

- **`GET /architecture`** — qwen2 reports **494,032,768** params, exactly the sum of all
  **290** tensors.
- **GGUF parser** — verified against real local GGUF v3 files: **qwen3** (399 tensors, Q4_K,
  8.19B) and **llama 3.2** (255 tensors, Q4_K, 3.21B). Tensor counts match the binary header;
  each shows its own real vocab / RoPE base / context.
- **`backend/scripts/verify_trace.py`** — the op catalog is real: **243 ops** in true forward
  order, `q_proj` L0 = **803,712** params (matches the module), cumulative "parameters used" =
  **630M**.
- **`backend/scripts/verify_real_data.py`** / **`verify_geometry.py`** — attention and PCA
  geometry match an independent forward pass; deterministic across runs.
- **`frontend/scripts/verify-data.sh`** — a **build-time guard**: `npm run build` fails if
  `Math.random` appears anywhere in application code (`components/`, `lib/`, `app/`), with a
  narrow allowlist for genuine visual jitter (point-cloud scale, layout). The "no fabricated
  numbers" rule is enforced mechanically, not by reviewer discipline.
- **`scripts/trace_diff.py`** — CI regression gate: diffs two recorded traces with a
  `--tolerance` and `--fail-on-diff`, comparing tokens, probabilities, and layer stats.

See [`docs/verification.md`](docs/verification.md) for the full evidence with exact numbers.

## Documentation

| Doc | What's inside |
| --- | ------------- |
| [Architecture](docs/architecture.md) | How the backend, frontend, and data flow fit together |
| [API reference](docs/api.md) | The REST + WebSocket endpoints |
| [Visual mapping](docs/visual-mapping.md) | Real model properties → rendered geometry, colour, motion |
| [GGUF format](docs/gguf-format.md) | Exactly what the client-side parser reads |
| [Development](docs/development.md) | Setup and where things live |
| [Deployment](docs/deployment.md) | Hosting the frontend + backend |
| [Verification](docs/verification.md) | How "the data is real" is proven |
| [Roadmap](ROADMAP.md) | Where TokenPrint is headed — the ecosystem gaps and the next four milestones |
| [Design review](docs/design-review.md) | Full design + engineering audit and the phased "visual debugger" roadmap |
| [Wiki](wiki/Home.md) | Deep-dive pages: architecture, every supported model family, transformer concepts, developer guides |

## Roadmap

TokenPrint is an **interactive visual debugger for transformer execution** — the tool that
answers *"what is my model doing right now, and why?"*. The full plan, including an analysis
of the gaps in today's visualizer ecosystem, lives in [ROADMAP.md](ROADMAP.md); the phased
design/engineering audit is in [docs/design-review.md](docs/design-review.md).

**Shipped** — real quantized GGUF execution via native `llama.cpp` backend, record & replay traces + snapshot URLs, quantization diff on two GGUFs, logit lens, breakpoint debugger, raw-component ablation with before→after diffs, local checkpoint loading, multilingual tokenization, clean minimal UI design system, and the honest-geometry scene rebuild.

**Next** — real per-layer timings, true activation patching, cross-quant trace diffing, MoE routing, and in-browser WebGPU inference.

## Honest limitations

We would rather under-claim than overstate. Known gaps, stated plainly:

- **Quantized GGUF Backend Instrumentation:** Real quantized GGUF inference is supported via `llama.cpp` (`llama-cpp-python`). When executing via GGUF, tokens and top-k probabilities come directly from the quantized model; per-layer internal activations are not exposed by `llama.cpp`, so layer lighting is cleanly disabled to maintain data honesty.
- The **live PyTorch model is Qwen** (real, loaded); GPT-2's formula set is wired and
  selected by architecture but not run locally.
- **`TimingReadout` does not report real time.** It currently derives a proxy from PCA-space
  hidden-state magnitudes and labels it in milliseconds — this is a known bug
  ([#18](https://github.com/Sudharsanselvaraj/Token-Print/issues/18)), not a measurement.
- **`ActivationPatchCompare` shows a logit-lens trajectory, not activation patching.** The
  numbers are real; the panel title overstates the method
  ([#75](https://github.com/Sudharsanselvaraj/Token-Print/issues/75)).
- `ResidualContributions` measures total residual change per layer in **PCA space**, not the
  attention-vs-MLP decomposition (that needs per-sub-block forward hooks).
- The walkthrough's **model-scale selector** rescales the 3D using each reference model's real
  published parameter count; all worked numbers come from the loaded Qwen forward pass.

## 🛡️ Engineering & Community Infrastructure

TokenPrint maintains a production-grade automated pipeline for code quality, data provenance verification, security, and contributor onboarding:

- **✓ Gemini AI PR Review & Triage** — Reviews PRs against TokenPrint's data-provenance guidelines and triages incoming issues.
- **✓ Contributor Pathfinder Bot** — Guides first-time contributors with component files, test commands, and architectural docs.
- **✓ Real-Model Nightly Verification** — Runs PyTorch forward passes nightly on `Qwen2.5-0.5B` and opens severity-ranked issues (`P0`–`P3`) on regression.
- **✓ Playwright Visual Regression** — Captures 3D canvas snapshots on scene updates to detect rendering regressions.
- **✓ CodeQL & Dependabot** — Automated SAST security scanning and weekly grouped dependency updates.
- **✓ Conventional Commits & Release Please** — Automated multi-package versioning, changelogs, and GitHub Releases.
- **✓ Stale Cleanup & Auto-Labeling** — Manages issue lifecycles and automatically tags PRs by component (`frontend`, `backend`, `3d-scene`).
- **✓ Wiki Auto-Sync** — Automatically syncs repository documentation in `docs/` with the GitHub Wiki.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). Not sure where to start? [GOOD_FIRST_ISSUES.md](GOOD_FIRST_ISSUES.md)
has **26 curated issues** across four difficulty tiers — 🟢 Easy, 🟡 Intermediate, 🔴 Advanced,
🔬 Research — each with the files to touch and how to verify the fix. For a broader list of
what needs doing, see [docs/contributing-ideas.md](docs/contributing-ideas.md).

Found a wrong number? That's a top-priority bug — TokenPrint's entire premise rests on every
displayed value being real.

Security issues: see [SECURITY.md](SECURITY.md) (report privately, not via public issues).

## Creator and contributors

### Creator

<table>
<tr>
<td align="center" width="160">
  <a href="https://github.com/Sudharsanselvaraj">
    <img src="https://github.com/Sudharsanselvaraj.png" width="96" alt="Sudharsan Selvaraj" />
  </a>
  <br />
  <a href="https://github.com/Sudharsanselvaraj"><b>Sudharsan Selvaraj</b></a>
  <br />
  <sub>👑 Creator &amp; Maintainer</sub>
</td>
<td valign="middle">

TokenPrint was designed and built from the ground up by **[Sudharsan Selvaraj](https://github.com/Sudharsanselvaraj)** — the architecture, the data-provenance system, the verification scripts, and the 3D visualization engine all started as one answer to a single question: *"what is my model actually doing right now?"* As creator and maintainer, Sudharsan owns the roadmap, reviews incoming pull requests, and is the final word on the project's non-negotiable rule — every number shown must be real.

[![GitHub](https://img.shields.io/badge/GitHub-%40Sudharsanselvaraj-181717?style=flat&logo=github)](https://github.com/Sudharsanselvaraj)

</td>
</tr>
</table>

### Contributors

Everyone below has a merged pull request in TokenPrint — code, docs, bug fixes, or design. This grid updates automatically as new contributions land.

<p align="left">
  <a href="https://github.com/Sudharsanselvaraj/Token-Print/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=Sudharsanselvaraj/Token-Print" alt="TokenPrint contributors" />
  </a>
</p>

Want to be in that grid? Grab one of the **26 curated issues** in [GOOD_FIRST_ISSUES.md](GOOD_FIRST_ISSUES.md),
read [CONTRIBUTING.md](CONTRIBUTING.md) to get set up, and open a PR. First-time open-source
contributors are very welcome.

## License

[MIT](LICENSE) © Sudharsan Selvaraj.

## Star history

<div align="center">

<a href="https://star-history.com/#Sudharsanselvaraj/Token-Print&Date">
  <img src="https://api.star-history.com/svg?repos=Sudharsanselvaraj/Token-Print&type=Date" alt="Star History Chart" width="640" />
</a>

<br /><br />

If TokenPrint helped you understand what a transformer is actually doing, consider **starring the repo** ⭐ — it's the easiest way to help other people find it.

<sub><a href="#top">Back to top ↑</a></sub>

</div>
