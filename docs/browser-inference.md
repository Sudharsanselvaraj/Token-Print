# Browser GPT-2

In **Generation → Inference engine**, choose **Browser GPT-2 · WebGPU** or **Browser GPT-2 · CPU (WASM)**, enter a short prompt, and Generate. The first run downloads approximately 500 MB; progress is visible and model files are cached by the browser. Stop cancels the worker, including an in-progress download. WebGPU needs a browser/device with a working GPU adapter and a secure context (HTTPS or localhost). CPU is an explicit choice; failures never silently switch data sources.

The initial model is `Xenova/gpt2` at immutable revision `bf2c7f02e0b826c60d03af341171bde20893da66`, `model.onnx`, using Transformers.js 3.8.1. Generation is greedy, at most 32 new tokens and 128 total prompt/output tokens. This conservative limit bounds memory while full-sequence inference is used. GPT-2 is a base completion model, not an instruction/chat model.

| Capability | Browser GPT-2 | Python instrumented backend | Recorded replay |
|---|---|---|---|
| Real token IDs, final logits and probabilities | Yes | Yes | Captured values |
| Model revision and decoding settings | Pinned | Resolved commit | As recorded |
| Greedy generation | Yes | Yes | Playback only |
| Sampling / advanced decoding | No | Backend-dependent | Playback only |
| Attention / hidden states / logit lens | Not exposed by this ONNX export | Model-dependent, capability checked | Only if captured |
| Measured operation timings | No | When instrumented | Only if captured |
| KV-cache instrumentation | No; sequence recomputed | When supported | Only if captured |
| New ablations / activation patching | No | Model-dependent | No |
| GGUF inference | Not part of this browser release | Optional llama.cpp backend | Playback only |

No synthetic activation statistics or operation timings are generated. Architecture dimensions come from the pinned config; they describe the model rather than a measured execution trace. The initial release uses full precision because quantized WebGPU output did not pass the reference check.

## Verification

`node frontend/scripts/browser-reference.mjs` generates the checked-in three-prompt reference with an independent ONNX CPU session. With the frontend running:

```sh
cd frontend
TOKENPRINT_BROWSER_INFERENCE=1 npx playwright test tests/visual/browser-inference.spec.ts --project=chromium
```

This downloads and runs the real model for both devices, checks the model revision, selected and top-five token IDs, probability error below 0.0001, and absence of invented hidden/cache measurements. The tolerance covers floating-point kernel differences; it is not a claim of equality to the original unquantized model. Browser support depends on actual adapter availability, and the test intentionally fails if the selected device cannot execute.

References: [Transformers.js WebGPU](https://huggingface.co/docs/transformers.js/guides/webgpu), [pinned model files](https://huggingface.co/Xenova/gpt2/tree/bf2c7f02e0b826c60d03af341171bde20893da66).

Validated on 2026-09-20 in Chrome 153 on Apple Silicon, against the static production export: both WASM and WebGPU passed all three prompt comparisons with exact top-five IDs and probability error below `1e-4`. Other browser/GPU combinations must run the harness before being added to the verified list. The quantized candidate failed the GPU comparison and is not shipped.
