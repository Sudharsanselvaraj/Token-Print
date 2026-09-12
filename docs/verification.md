# Verification — proving the data is real

TokenPrint's core claim is that **every number is real**. Here's how that's
checked, with the actual numbers observed on the reference model
(`Qwen/Qwen2.5-0.5B-Instruct`) and real local GGUF files.

## Architecture endpoint is self-consistent

`GET /architecture` reports `total_params = 494,032,768`, which equals the sum of
`n_params` across all **290** tensors exactly. Metadata (24 layers, 14 heads,
2 KV heads, head_dim 64, ffn 4864, vocab 151,936, context 32,768) comes straight
from the model `config` and `named_parameters()`.

## Attention matches an independent forward pass

`backend/scripts/verify_real_data.py` runs `analyze()` **and** a separate raw
forward pass, then asserts they agree:

```
Sentence: 'The cat sat on the mat.'   Tokens (7): The, cat, sat, on, the, mat, .
Attention tensor shape: (24, 14, 7, 7)
Max abs error vs independent forward pass: 0.00050        (just rounding)
Attention row sums: [1.0000, 1.0000]                      (valid softmax)
PASS: data is real.
```

## Embedding geometry is real & deterministic

`verify_geometry.py` projects real hidden states with PCA and checks
determinism + clustering. For "king queen man woman apple orange", `apple` and
`orange` land almost on top of each other at the embedding layer, and the
projection is identical across runs.

## The generation op catalog is real and correctly ordered

`verify_trace.py` builds the op catalog and asserts:

```
total ops: 243
layer-0 op order: norm, attn.q, attn.k, attn.v, attention, attn.o, norm,
                  mlp.gate, mlp.up, mlp.down
q_proj L0: op=803,712  module=803,712  in=896 out=896 bias=896
final op: Vocabulary Unembedding · cumulative params used: 630,167,424
PASS: op catalog is real, ordered, and bounded.
```

(The cumulative "parameters used" exceeds the model's unique parameter count
because the tied unembedding matrix is counted as its own operation — matching
how the reference tools present "parameters used".)

## KV-cache phases are mechanically real

The streamed trace reports the genuine pre-fill vs decode split, observed on the
prompt "Name one primary color. Answer in one word." (`prompt_len = 39`):

```
meta.uses_kv_cache = true
step 0  phase=prefill  n_positions=39  cache_len=0    → token "Red"
step 1  phase=decode   n_positions=1   cache_len=39   → token "<|im_end|>"
```

Step 0 computes the whole 39-token prompt and builds the cache; step 1 computes a
single new token and reuses the 39 cached positions — decode genuinely does less
work, because the loop threads real `past_key_values`. The UI only shows this
distinction when `uses_kv_cache` is true.

## The GGUF parser matches the binary header

Parsing real local GGUF v3 files of two different architectures:

| File | Arch | Params | Tensors | Layers | Heads / KV | Quant | Context |
| ---- | ---- | ------ | ------- | ------ | ---------- | ----- | ------- |
| qwen3 8B | qwen3 | 8.19B | **399** | 36 | 32 / 8 | Q4_K | 40,960 |
| llama 3.2 3B | llama | 3.21B | **255** | 28 | 24 / 8 | Q4_K | 131,072 |

The tensor counts (399, 255) equal the `tensor_count` encoded in each file's
header, and each model reports its own real vocab (151,936 vs 128,256) and RoPE
base (1.0M vs 500K).

## Formulas match the architecture

For a Qwen model the tensor inspector and generation panel render **RMSNorm**,
**RoPE**, **SwiGLU**, and **grouped-query attention** — never GPT-2's
LayerNorm/GELU. `detectArch()` selects the set from the parsed architecture name.

## Walkthrough numbers are read from a real pass

Every number in the walkthrough reading pane comes from one real `/analyze`. For
example, the Self-Attention chapter reports the strongest layer-0/head-0 link for
"The cat sat on the mat." as **"cat" → "The" with weight 0.864** — a genuine
value from the forward pass.

## How frontend visuals are verified

Headless Chrome on some machines won't composite WebGL into screenshots, so the
`tools/*.mjs` scripts drive a **real** Chrome window (`puppeteer-core` +
`--headed`) to (a) read real numbers back out of the DOM and (b) capture what's
actually rendered. Rendering is additionally checked by reading three.js's own
framebuffer, independent of the screenshot path.

## The build fails on fabricated data

Everything above verifies that the *backend* produces real numbers. This check
guards the other end — that the **frontend never invents any**.

`frontend/scripts/verify-data.sh` greps `components/`, `lib/`, and `app/` for
`Math.random` and exits non-zero if it finds any, with a narrow allowlist for
genuine visual randomness (`TensorCloud.tsx` point jitter, `pointcloud.ts`
layout). It is wired into the build itself, not just CI:

```json
"build": "npm run verify-data && next build"
```

so a fabricated value cannot reach a deployed page even from a local build.

**Why this exists.** During a verification sweep in July 2026, six components
were found rendering numbers that looked authoritative but were not measured:

| Component | What it did |
| --- | --- |
| `NumberProvenance` | hardcoded `0.42` / `0.87`, rendered as `toFixed(4)` |
| `ActivationPatchCompare` | `prob + (Math.random() - 0.5) * shift` as "patched" output |
| `ResidualContributions` | `Math.random()` magnitudes, attn/MLP split by `layer % 2` |
| `LoraDeltaViz` | "weight delta" computed from a hash of the tensor **name** |

All were corrected — either wired to real data (`LoraDeltaViz` now uses the real
sampled mean-absolute-difference from the quant-diff path; `ResidualContributions`
now measures real PCA-space residual deltas) or narrowed to an honest claim
(`NumberProvenance` dropped the values and states that real ones need
`GET /debug/tensor`).

The lesson worth recording: **two rounds of human review did not catch these.**
Plausible placeholder math is invisible in a diff and indistinguishable from real
output on screen. A mechanical check is the only reliable defence, which is why
the rule is enforced by the build rather than by discipline.

### Known gaps in this guarantee

Honesty requires listing where the claim does not yet fully hold. These are
tracked bugs, not accepted behaviour:

- **`TimingReadout`** shows real per-layer `perf_counter()` deltas (`REAL MS`), but
  no device synchronize is issued, so on MPS/CUDA they are host-side times. Traces
  without timings fall back to mean |activation| per layer, badged
  `PROXY · NOT MS` and never shown in milliseconds —
  [#101](https://github.com/Sudharsanselvaraj/Token-Print/issues/101).
- **`ActivationPatchCompare`** now shows a real logit-lens trajectory, but the
  panel is still titled "Activation Patching" — a stronger causal claim than the
  experiment performed — [#75](https://github.com/Sudharsanselvaraj/Token-Print/issues/75).
- **`ResidualContributions`** measures total residual change per layer in PCA
  space, not the attention-vs-MLP decomposition; the label says so.

The guard catches fabricated *values*. It cannot catch a real value under a wrong
*label*, which is the remaining class of error above — those need a periodic
sweep of every panel title against what it actually computes.

## 3D Interactivity & Fidelity Overhaul Provenance Tags

| Visual Element / Component | Provenance Tag | Source / Derivation Method |
| --- | --- | --- |
| `DataWire` 3D Splines | `DERIVED` | Thickness and opacity mapped deterministically from real PyTorch attention weights |
| Per-Cell Wireframe Grid (`SpatialMatrixPlane`) | `REAL` / `DERIVED` | Real `rows × cols` tensor shapes and real submatrix activation values |
| `MatrixMultiplyInspector` | `DERIVED` | Live animated matrix multiplication (`X W = Y`) using real model tensor dimensions |
| `ConceptPopup` Educational Tooltips | `CONCEPTUAL` | Static hand-written educational text explaining RoPE, RMSNorm, SwiGLU, and GQA |
| PyTorch Backend Sampling (`temperature`, `top_p`) | `REAL` | Live `torch.multinomial` sampling over real logits in PyTorch autoregressive loop |

