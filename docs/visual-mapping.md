# Visual mapping — real data → geometry

The renderer is a scientific instrument, not an animation: **every shape, size,
count, colour, and motion traces to something real** in the loaded model or its
forward pass. This doc is the explicit contract between model properties and what
you see. Nothing here is a fixed template — each value is read from the real
`config` / `named_parameters()` (via `GET /architecture`) or the real streamed
trace.

## The generation stack (`components/scenes/TransformerStack.tsx`)

One faithful Qwen2 decoder block, repeated per real layer, wrapped by a
continuous residual line: **pre-RMSNorm → self-attention (GQA) → post-RMSNorm →
SwiGLU MLP**.

| Element | Geometry | Real dimension it encodes | Qwen2.5-0.5B value |
| ------- | -------- | ------------------------- | ------------------ |
| **Attention** | one blade **per query head**, angularly clustered into KV groups | count = `num_heads`; groups = `num_kv_heads`; thickness ∝ `head_dim` | 14 blades in 2 groups of 7 (GQA), thickness from dim 64 |
| **MLP** | SwiGLU funnel: gate + up prongs → wide belly → down-projection | belly radius ∝ `ffn_size / hidden_size` | 4864 / 896 ≈ **5.4×** |
| **LayerNorm** | two thin pinched **waists** per block (input + post-attention) | the block's two real RMSNorm ops | ε = 1e-6 |
| **Embedding** | a volume block | width ∝ `log2(vocab_size)`, depth ∝ `hidden_size` | vocab 151,936 |
| **Residual** | one continuous through-line down the stack | the residual stream (one real tensor through all layers) | 24 layers |
| **Output** | converging funnel toward the vocabulary | the unembedding / softmax step | tied to embeddings |
| **Top-k skyline** | a bar per candidate at the output | bar height **and** brightness = the real streamed `prob` | `topk` from each step |

If a model advertises different numbers, the geometry changes with them — load a
32-head model and you get 32 blades. That is the single falsifiable test that the
mapping is real, not coincidental.

## Colour

The entire UI chrome is monochrome. The **one** deliberate colour signal is the
layer-depth / per-op gradient inside the 3D canvas, because it encodes a real
property (layer index, op type, activation magnitude). No second colour scheme is
introduced anywhere — probability in the skyline, for instance, is encoded in
grayscale brightness, not a new hue.

## Highlight & motion

- The **active op** lights up in its op colour; the specific sub-form (blades /
  funnel / waist) is chosen from the real `op_key`.
- Active-block brightness scales with the **real per-layer activation magnitude**
  (`layer_stats`) for the token being replayed — a lighting cue from real data,
  never altered data.
- Camera glides between layers/chapters are eased; free-roam orbit is untouched.
- A very slight idle drift keeps the scene alive but is never mistaken for a
  computation update.

## KV-cache phase

The stack also reflects **pre-fill vs decode**: step 0 computes the
whole prompt (a wide "new activity" band), every later step computes a single
token beside the dim cached prefix. This is shown only when the backend actually
threads a KV cache (`meta.uses_kv_cache`). See
[verification.md](verification.md) for the observed numbers.

## Walkthrough reuse

The structural chapters (Overview, Layer Norm, MLP, Softmax) reuse this exact
geometry, highlighting the chapter's component. The Tokenizer, Embedding, and
Self-Attention chapters keep their dedicated districts because those render
**genuinely computed per-token data** (real PCA of hidden states, real attention
weights) — richer than generic geometry, and not something to replace with it.

## Causality Warning

> [!WARNING]
> **Attention Mass ≠ Causal Attribution**
> Attention weights describe how attention mass is mathematically distributed during a forward pass — they do **not** constitute causal proof of model reasoning or token necessity. A token receiving high attention mass may be strongly attended to without being causally required for the model's final output. Conversely, a token with lower attention mass may still affect output states through residual stream interventions.
>
> Visual attention lines shown in TokenPrint describe attention distribution, but should not be interpreted as direct causal attribution.
