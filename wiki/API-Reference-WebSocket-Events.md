# WebSocket Events

## Overview

The `WS /ws/generate` endpoint streams a greedy autoregressive generation in real-time.

## Protocol Structure

The protocol uses a strict JSON framing system. The client sends one configuration frame, and the server responds with a stream of data frames, ending with a `done` frame.

### Client -> Server: Initialization Frame

```json
{
  "prompt": "Name one primary color.",
  "max_new_tokens": 40,
  "top_k": 10,
  "trace": true,
  "record_trace": false
}
```
- `trace`: If true, includes the `op_catalog` and `layer_stats` in the response. Required for TokenPrint's UI.
- `record_trace`: If true, saves the entire stream to disk on the backend for later replay.

### Server -> Client: Meta Frame (Sent once)

```json
{
  "type": "meta",
  "model": "Qwen/Qwen2.5-0.5B-Instruct",
  "architecture": "qwen2",
  "num_layers": 24,
  "prompt_tokens": ["Name", "one", ...],
  "uses_kv_cache": true,
  "op_catalog": [
    {
      "index": 0,
      "op_key": "embedding",
      "label": "Token Embedding",
      "param_count": 136134656
    }
    // ... 219 operations
  ]
}
```

### Server -> Client: Token Frame (Sent once per generated token)

```json
{
  "type": "token",
  "step": 0,
  "phase": "prefill",
  "n_positions": 5,
  "cache_len": 0,
  "chosen": { "id": 6893, "text": "Red", "logprob": -0.04 },
  "topk": [
    { "id": 6893, "text": "Red", "prob": 0.957 },
    { "id": 124, "text": "Blue", "prob": 0.021 }
  ],
  "layer_stats": [0.45, 1.2, 0.8, ...] // Mean activation magnitude per layer
}
```

### Server -> Client: Done Frame (Sent once)

```json
{
  "type": "done",
  "generated_text": "Red",
  "total_steps": 2
}
```

## Related pages
- [REST API](API-Reference-REST-API)
- [Data Models](API-Reference-Data-Models)

## Further reading
- [WebSocket Protocol Architecture](Architecture-WebSocket-Protocol)

## Navigation
| Previous | Home | Next |
| --- | --- | --- |
| [REST API](API-Reference-REST-API) | [Home](Home) | [Data Models](API-Reference-Data-Models) |
