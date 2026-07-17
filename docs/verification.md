# Verification — proving the data is real

LLMStudio's core claim is that **every number is real**. Here's how that's
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
