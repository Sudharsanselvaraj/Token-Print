# Usability upgrade verification

Checks run locally on 2026-09-20:

- Production static export compiled, type-checked and built all 39 routes.
- Backend pytest suite, including a regression for seed 0, passed.
- Frontend unit checks cover trace validation, malformed probabilities, full-model camera bounds and experiment integrity; store checks cover playback, routing and producer contracts.
- Browser tests deliberately block the backend and complete all three recorded-demo steps. Recorded interventions explain their live-data requirement. HTTP 503 and network failures remain visible until a manual retry.
- Overview → Layer → Operation transitions and manual-camera preservation passed in a real browser. A throttled-CPU test with a delayed lighting download also confirms that walkthrough canvas initialization remains usable.
- A real Qwen generation passed export → import → recorded replay → re-run verification; an actual activation patch also reproduced its saved layer predictions. Modified experiment metadata failed integrity checking.
- Browser GPT-2 WASM and WebGPU passed three-prompt comparison against the checked-in independent full-precision ONNX CPU reference. See [browser validation scope](browser-inference.md).
- A separate clean copy installed Python and frontend dependencies, downloaded/reused Hugging Face model files, started both services on alternate ports, checked the complete demo, and generated real tokens with model-revision metadata using `scripts/start.py --fresh --smoke`.

The GitHub Linux CPU fresh-install workflow also passed, along with frontend build, backend smoke/lint and CodeQL checks.

Limits: Other browser/GPU combinations are unverified. Browser GPT-2 exposes final logits, not attention/hidden-state instrumentation. Experiment files are durable downloads; the recent-results list is session-only. No claim is made that different hardware/runtime versions produce bit-identical outputs.
