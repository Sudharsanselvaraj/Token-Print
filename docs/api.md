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
  "eos": false }

// 3) done
{ "type": "done", "generated_text": "Red", "total_steps": 2 }
```

Payloads are bounded on purpose: the op catalog is sent **once** and token frames
reference it by index; `topk` is 8–12 entries (not the full vocab); weight
previews are ≤ 8×8 slices.
