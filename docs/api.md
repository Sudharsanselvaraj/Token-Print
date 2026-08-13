# API reference

Base URL (dev): `http://localhost:8000`. All responses are JSON. CORS is
restricted to `http://localhost:3000`.

---

## `GET /health`

Liveness + whether the model is loaded.

```json
{ "status": "ok", "model_loaded": true }
```

## `GET /model-info`

```json
{
  "model": "Qwen/Qwen2.5-0.5B-Instruct",
  "device": "mps",
  "num_layers": 24,
  "num_heads": 14,
  "hidden_size": 896,
  "attn_implementation": "eager",
  "max_tokens": 40,
  "ready": true
}
```

## `GET /architecture`

Real architecture metadata + tensor list from the loaded model
(`named_parameters()` + `config`). No forward pass.

```jsonc
{
  "source": "model",
  "model": "Qwen/Qwen2.5-0.5B-Instruct",
  "device": "mps",
  "metadata": {
    "architecture": "qwen2",
    "total_params": 494032768,
    "num_layers": 24, "hidden_size": 896,
    "num_heads": 14, "num_kv_heads": 2, "head_dim": 64,
    "ffn_size": 4864, "vocab_size": 151936,
    "context_length": 32768, "rope_theta": 1000000.0,
    "tie_word_embeddings": true, "torch_dtype": "float32"
  },
  "tensor_count": 290,
  "tensors": [
    { "name": "model.embed_tokens.weight", "shape": [151936, 896],
      "dtype": "float32", "n_params": 136134656 }
    // …
  ]
}
```

The GGUF drag-and-drop path (client-side) produces the **same shape** with
`"source": "gguf"` and extra metadata (`quantization`, `gguf_version`,
`file_size`, `expert_count`).

## `POST /analyze`

Body: `{ "sentence": "The cat sat on the mat." }` (capped ~40 tokens; returns
`400` if longer).

```jsonc
{
  "sentence": "The cat sat on the mat.",
  "model": "Qwen/Qwen2.5-0.5B-Instruct", "device": "mps",
  "num_layers": 24, "num_heads": 14, "hidden_size": 896,
  "tokens": [ { "index": 0, "text": "The", "piece": "The", "id": 785, "is_special": false } ],
  // real softmax attention, rounded to 3 dp, sub-0.01 zeroed:
  "attention": [ /* [layer][head][from][to] */ ],
  // PCA projections of real hidden states:
  "embeddings_3d": [ [x, y, z] ],
  "hidden_states_3d": { "0": [[x,y,z]], "1": [[x,y,z]] /* … */ },
  "embedding_norms": [ 0.53 ],
  "projection": { "method": "PCA", "note": "3D projection; distances approximate",
                  "embedding_explained_variance": [0.36, 0.24, 0.18] }
}
```

## `POST /rag/analyze`

RAG attribution reduction on top of the existing real attention tensor from
`ModelEngine.analyze()`. The backend composes:

```
Context:
<chunk id=...>...</chunk>
...
<query>...</query>
```

and maps chunk/query text spans to token spans using tokenizer offset mappings.

**Body:**

```json
{
  "query": "What year was the company founded?",
  "chunks": [
    { "id": "0", "text": "The company was founded in 2018 in Chennai." },
    { "id": "1", "text": "Its first product launched in 2020." }
  ],
  "reduction_mode": "both",
  "ungrounded_threshold": 0.1
}
```

**Response additions (on top of `/analyze`):**

```jsonc
{
  "query": "What year was the company founded?",
  "chunk_spans": { "0": [12, 20], "1": [24, 31] },
  "query_span": [36, 45],
  "attribution_chunk_ids": ["0", "1"],
  "attribution": [ [0.42, 0.08], [0.45, 0.07] ],
  "attribution_all_layers_mean": [ [0.42, 0.08], [0.45, 0.07] ],
  "attribution_last_layer": [ [0.51, 0.04], [0.48, 0.05] ],
  "query_self_attribution": [0.31, 0.29],
  "ungrounded": [false, false]
}
```

`attribution` shape is `[query_token][chunk_id]`. Values are attention mass from
each query-token row onto each chunk span.

> **Note**
> Attention mass is a correlate of influence, not a proof of causal influence.
> TokenPrint reports it as an attribution signal, not a causality claim.

> **Tip**
> Set `reduction_mode: "both"` so the UI can switch between all-layer and
> last-layer views without recomputing.

## `WS /ws/generate`

A real streamed greedy generation.

**Client → server (first message):**

```json
{ "prompt": "Name one primary color.", "max_new_tokens": 40, "top_k": 10, "trace": true }
```

**Server → client frames:**

```jsonc
// 1) meta (once). With trace:true it also carries the op catalog.
{ "type": "meta", "model": "…", "architecture": "qwen2",
  "num_layers": 24, "num_layer_stats": 25, "prompt_tokens": ["…"],
  "prompt_len": 36, "max_new_tokens": 40, "top_k": 10, "decoding": "greedy",
  "uses_kv_cache": true,   // the decode loop threads real past_key_values
  "op_catalog": [
    { "index": 0, "op_key": "embedding", "label": "Token Embedding", "layer": null,
      "param_count": 136134656, "cumulative_params": 136134656,
      "in_dim": 896, "out_dim": 151936, "bias_dim": null,
      "weight_preview": [[/* up to 8×8 real weights */]] }
    // … 243 ops total for this model
  ] }

// 2) one per generated token
{ "type": "token", "step": 0,
  "chosen": { "id": 6893, "text": "Red", "logprob": -0.04 },
  "topk": [ { "id": 6893, "text": "Red", "logit": 18.4, "prob": 0.957 } ],
  "layer_stats": [ /* 25 mean |activation| values */ ],
  "eos": false,
  // real KV-cache accounting for this step:
  "phase": "prefill",   // "prefill" (step 0) | "decode" (later steps)
  "n_positions": 39,    // tokens actually computed this step (prompt_len, then 1)
  "cache_len": 0 }      // cached positions reused this step (0, then prompt_len + n)

// 3) done
{ "type": "done", "generated_text": "Red", "total_steps": 2 }
```

Payloads are bounded on purpose: the op catalog is sent **once** and token frames
reference it by index; `topk` is 8–12 entries (not the full vocab); weight
previews are ≤ 8×8 slices.

### KV-cache phase (real, not decorative)

The decode loop runs `model(..., use_cache=True)` and threads `past_key_values`
step to step, so the **pre-fill vs decode** distinction is mechanically real and
reported per frame:

- **step 0 — `prefill`**: processes the whole prompt at once (`n_positions =
  prompt_len`, `cache_len = 0`), building the cache.
- **steps ≥ 1 — `decode`**: process a single new token (`n_positions = 1`) and
  reuse the cached prefix (`cache_len = prompt_len + step − 1`).

The frontend only shows this distinction when `meta.uses_kv_cache` is true —
never faked.

---

## `GET /trace` · `POST /trace/replay`

Record & replay. When a generation request sets `record_trace: true`, the full
WebSocket stream is tee'd into an in-memory trace (prompt, model metadata, every
token/layer frame in order, timings). `GET /trace` returns the last recorded run
as a downloadable `.tokenprint.json`; `POST /trace/replay` accepts an uploaded
trace and replays it back to the caller.

The schema is **versioned from day one** (`trace_version: 1`, see
`backend/app/trace.py`) — replay code will outlive the current stream shape, and
`parse_trace()` rejects an unknown version rather than silently mis-reading it.

A trace is a real forward pass frozen to disk: replaying one is not a simulation,
it is the same numbers the model produced, re-emitted with their original pacing.
This is what lets the static demo show genuine data with no GPU and no backend.

## `GET /debug/ops` · `POST /debug/analyze`

Stepped inspection. `/debug/ops` returns the real op catalog (index, label,
`op_key`, layer, `in_dim`/`out_dim`, `param_count`) so the frontend can set
breakpoints against true op indices. `/debug/analyze` runs a prompt and returns
the per-layer state needed to inspect a paused position.

## `POST /ablate/analyze`

Interventions. Accepts a sentence plus the heads and/or layers to zero, installs
forward hooks that null those components' contribution, and re-runs a **real**
forward pass. The response has the same shape as `/analyze`, so the frontend can
diff the two logit-lens tables position by position and report exactly how many
predictions changed.

This works on **raw architectural components** — any head, any block, on whatever
model is loaded — with no sparse autoencoder, transcoder, or other pre-trained
artifact required. That is the deliberate difference from feature-level
intervention tools.
