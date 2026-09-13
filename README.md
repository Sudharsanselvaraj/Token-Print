<a name="top"></a>
<div align="center">
  <img src="TokenPrint logo.png" alt="TokenPrint" width="360" />

  <h3>Stop reading architecture diagrams. Watch your model think.</h3>
  <p><b>A real 3D inspector wired into a real forward pass — not an illustration of one.</b></p>

  <p>
    <a href="https://github.com/Sudharsanselvaraj/Token-Print/actions/workflows/ci.yml"><img src="https://github.com/Sudharsanselvaraj/Token-Print/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e.svg?style=flat" alt="License: MIT" /></a>
    <a href="https://github.com/Sudharsanselvaraj/Token-Print/stargazers"><img src="https://img.shields.io/github/stars/Sudharsanselvaraj/Token-Print?style=flat&color=0a0a0a&label=stars" alt="Stars" /></a>
    <a href="https://github.com/Sudharsanselvaraj/Token-Print/commits/main"><img src="https://img.shields.io/github/last-commit/Sudharsanselvaraj/Token-Print?style=flat&color=0a0a0a&label=last%20commit" alt="Last commit" /></a>
    <img src="https://img.shields.io/badge/data-100%25%20real%20forward%20pass-0a0a0a.svg?style=flat" alt="Real data only" />
    <a href="GOOD_FIRST_ISSUES.md"><img src="https://img.shields.io/badge/good%20first%20issues-26-orange.svg?style=flat" alt="26 good first issues" /></a>
  </p>

  <p>
    <a href="#quickstart"><b>Quickstart</b></a> ·
    <a href="docs/README.md"><b>Docs</b></a> ·
    <a href="wiki/Home.md"><b>Wiki</b></a> ·
    <a href="ROADMAP.md"><b>Roadmap</b></a> ·
    <a href="CONTRIBUTING.md"><b>Contributing</b></a>
  </p>
</div>

---

<p align="center">
  <img src=".github/assets/demo.gif" alt="TokenPrint — live demo" width="820" />
  <br />
  <sub><a href=".github/assets/demo.mp4">▶ full demo (.mp4)</a></sub>
</p>

Every other LLM visualizer gives you one of two things: a static architecture diagram, or a
"visualization" quietly running on fake numbers. **TokenPrint does neither.** Load
`Qwen2.5-0.5B-Instruct` live or drop in any local `.gguf`, and watch attention heads, RoPE
rotations, and the residual stream move in real 3D — every value traced back to
`named_parameters()`, a real forward pass, or the GGUF binary header itself.

## Why it hits different

-  **Every number is real.** No `Math.random`, no placeholder tensors — a build-time script
  fails CI outright if one sneaks into app code.
-  **GQA you can actually see.** 14 query heads, 2 KV groups — rendered as real geometry
  clustered exactly that way, not a diagram claiming it.
-  **Four modes, one engine.** Architecture, Generation, Walkthrough, Debugger — pick your
  depth, from "just show me the model" to breakpoints and activation ablation.
-  **Footnoted like a paper.** Click RoPE, SwiGLU, RMSNorm, GQA, or an induction-head pair
  and get the real citation — Vaswani, Su, Shazeer, Ainslie, Anthropic's transformer-circuits
  work — not a vibes-based tooltip.
-  **Broad model support.** Qwen, Llama 2/3/3.2, Gemma, Mistral/Mixtral, DeepSeek/MoE,
  GPT-2/Pythia, or any local `.gguf` — parsed client-side, nothing uploaded.
-  **Honest about its own gaps.** See [below](#the-parts-we-havent-faked-but-havent-solved-either) — known limitations stated plainly, not buried in an issue tracker.

## Quickstart

```bash
# backend — loads Qwen2.5-0.5B-Instruct once (Apple MPS / CPU fallback)
cd backend && python3 -m venv .venv --system-site-packages
source .venv/bin/activate && pip install -r requirements.txt
python -m uvicorn app.main:app --app-dir . --port 8000
```

```bash
# frontend
cd frontend && npm install && npm run dev   # → http://localhost:3000
```

No model file needed for the live view. Want native GGUF execution instead?
`pip install -r backend/requirements-gguf.txt`.

## Receipts, not vibes

- `GET /architecture` reports **494,032,768** params on live Qwen — the exact sum of all
  **290** real tensors, every time.
- The op catalog is real: **243 ops** in true forward order, matching the actual module graph.
- Provenance is tagged on everything you see — `REAL` / `DERIVED` / `CONCEPTUAL` /
  `SIMULATION` — so you always know whether a number came from the model or from us filling a
  gap.

Full evidence, five independent verification scripts, and the CI regression gate:
[`docs/verification.md`](docs/verification.md).

## The parts we haven't faked, but haven't solved either

- Quantized GGUF inference is real, but `llama.cpp` doesn't expose per-layer activations —
  layer lighting is disabled there rather than faked.
- Attention weight ≠ causal proof. High attention mass is a signal, not evidence the model
  *needed* that token ([docs/visual-mapping.md](docs/visual-mapping.md#causality-warning)).
- Per-layer timings are real wall-clock, but unsynchronized on MPS/CUDA — treated as a rough
  signal, badged `PROXY · NOT MS` when we can't back it, never dressed up as precise ms.

Found a number that's wrong? That's not a low-priority bug — the entire project stands or
falls on that not happening.

## Contributing

[**26 curated issues**](GOOD_FIRST_ISSUES.md) across 🟢 Easy → 🔬 Research, each with the
files to touch and how to verify your fix. Read [CONTRIBUTING.md](CONTRIBUTING.md), pick one,
send a PR. First-timers genuinely welcome.

## Creator & contributors

<table>
<tr>
<td align="center" width="140">
  <a href="https://github.com/Sudharsanselvaraj">
    <img src="https://github.com/Sudharsanselvaraj.png" width="88" alt="Sudharsan Selvaraj" />
  </a>
  <br /><b>Sudharsan Selvaraj</b><br /><sub>👑 Creator &amp; Maintainer</sub>
</td>
<td valign="middle">Built from scratch as one answer to "what is my model actually doing right now?" Owns the roadmap, reviews every PR, and is the last word on the one rule this whole repo runs on: every number shown must be real.</td>
</tr>
</table>

<div align="center">
<a href="https://github.com/Sudharsanselvaraj"><img src="https://github.com/Sudharsanselvaraj.png?size=96" width="48" height="48" alt="Sudharsanselvaraj" /></a>
<a href="https://github.com/ManoShruthiS"><img src="https://github.com/ManoShruthiS.png?size=96" width="48" height="48" alt="ManoShruthiS" /></a>
<a href="https://github.com/Sew-a"><img src="https://github.com/Sew-a.png?size=96" width="48" height="48" alt="Sew-a" /></a>
<a href="https://github.com/Shivamyadav1312"><img src="https://github.com/Shivamyadav1312.png?size=96" width="48" height="48" alt="Shivamyadav1312" /></a>
<a href="https://github.com/ris422"><img src="https://github.com/ris422.png?size=96" width="48" height="48" alt="ris422" /></a>
<a href="https://github.com/Sriram-Selvaperumal"><img src="https://github.com/Sriram-Selvaperumal.png?size=96" width="48" height="48" alt="Sriram-Selvaperumal" /></a>
<a href="https://github.com/challenge456"><img src="https://github.com/challenge456.png?size=96" width="48" height="48" alt="challenge456" /></a>
</div>

## Everything else

[Architecture](docs/architecture.md) · [API](docs/api.md) · [Roadmap](ROADMAP.md) ·
[Development](docs/development.md) · [Wiki](wiki/Home.md) — every supported model family,
transformer concepts, deep dives.

## License

[MIT](LICENSE) © Sudharsan Selvaraj.

<div align="center">

<a href="https://star-history.com/#Sudharsanselvaraj/Token-Print&Date">
  <img src="https://api.star-history.com/svg?repos=Sudharsanselvaraj/Token-Print&type=Date" alt="Star History Chart" width="600" />
</a>

If this helped you actually understand a transformer, **star it** ⭐ — that's how the next
person finds it.

<sub><a href="#top">Back to top ↑</a></sub>

</div>
