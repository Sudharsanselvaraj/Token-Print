# TokenPrint — API Deployment Reference

**Base URL (Production):** `https://sudharsan112321-tokenprint-backend.hf.space`  
**WebSocket Base URL:** `wss://sudharsan112321-tokenprint-backend.hf.space`  
**Local Development Base URL:** `http://localhost:8000`  
**Documentation:** `https://sudharsan112321-tokenprint-backend.hf.space/docs`  

---

## 1. System & Health Endpoints

### `GET /health`
Returns backend liveness status and engine readiness.
- **Request:** None
- **Response `200 OK`:**
  ```json
  {
    "status": "ok",
    "model_loaded": true,
    "mode": "causal_lm",
    "model_type": "qwen2",
    "gguf_engine_available": false
  }
  ```

### `GET /model-info`
Returns architectural metadata for the resident model.
- **Request:** None
- **Response `200 OK`:**
  ```json
  {
    "model_id": "Qwen/Qwen2.5-0.5B-Instruct",
    "num_layers": 24,
    "num_heads": 14,
    "hidden_size": 896,
    "vocab_size": 151936,
    "device": "cpu",
    "mode": "causal_lm",
    "model_type": "qwen2"
  }
  ```

---

## 2. Model Architecture & Exploration Endpoints

### `GET /architecture`
Fetches complete layer and tensor specifications for the 3D Model Explorer.
- **Query Parameters:**
  - `model_id` (optional, string): If supplied, downloads and returns the config-only metadata for any Hugging Face model without downloading full weights.
- **Response `200 OK`:**
  ```json
  {
    "model_id": "Qwen/Qwen2.5-0.5B-Instruct",
    "num_layers": 24,
    "num_heads": 14,
    "hidden_size": 896,
    "tensors": [
      {
        "name": "model.embed_tokens.weight",
        "shape": [151936, 896],
        "dtype": "torch.float32",
        "role": "embedding"
      }
    ],
    "layer_bounds": [...]
  }
  ```

### `GET /api/model/capabilities`
Returns mechanistic interpretability capabilities for the resident model.
- **Response `200 OK`:**
  ```json
  {
    "can_capture_attention": true,
    "can_capture_hidden_states": true,
    "can_ablate": true,
    "can_patch": true,
    "supports_vision": false,
    "supports_streaming": true
  }
  ```

### `GET /api/hf/curated`
Returns the verified list of curated models supported by TokenPrint.
- **Response `200 OK`:**
  ```json
  {
    "models": [
      {
        "id": "Qwen/Qwen2.5-0.5B-Instruct",
        "name": "Qwen 2.5 0.5B Instruct",
        "architecture": "Qwen2ForCausalLM",
        "parameters": "0.49B"
      }
    ]
  }
  ```

### `GET /api/hf/search`
Searches Hugging Face Hub for text generation models.
- **Query Parameters:**
  - `query` (string, max 200 chars): Search term.
  - `limit` (int, default 10, max 25): Result limit.
- **Response `200 OK`:** `HFSearchResponse`

### `GET /api/hf/inspect`
Inspects a remote Hugging Face model repository and computes an effective capabilities matrix.
- **Query Parameters:**
  - `model_id` (string, required): e.g., `meta-llama/Llama-3.2-1B`.
- **Response `200 OK`:** `HFInspectResponse`

---

## 3. Forward Pass & Interpretability Endpoints

### `POST /analyze`
Runs a forward pass and extracts exact tokens, logits, and multi-head attention weights.
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "sentence": "The transformer processes text in parallel."
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "tokens": ["The", "Ġtransformer", "Ġprocesses", "Ġtext", "Ġin", "Ġparallel", "."],
    "attention": [[[[0.12, 0.88, ...]]]],
    "hidden_states": {"0": [[0.01, -0.04, 0.12], ...]},
    "device": "cpu"
  }
  ```

### `POST /rag/analyze`
Extracts attention and computes chunk attribution scores for RAG inspection.
- **Request Body:**
  ```json
  {
    "query": "What is attention?",
    "chunks": [
      {"id": "c1", "text": "Attention allows tokens to focus on relevant context."}
    ],
    "reduction_mode": "all_layers_mean",
    "ungrounded_threshold": 0.15
  }
  ```
- **Response `200 OK`:** `RagAnalyzeResponse`

### `POST /debug/analyze`
Executes forward pass with intermediate module output sampling.
- **Request Body:**
  ```json
  {
    "sentence": "Input text for debug inspection."
  }
  ```
- **Response `200 OK`:** Full dictionary of sampled tensors per module path.

### `POST /ablate/analyze`
Executes forward pass with specified attention heads or layers zeroed out.
- **Request Body:**
  ```json
  {
    "sentence": "Test sentence",
    "zero_heads": [[0, 3], [1, 5]],
    "zero_layers": [0]
  }
  ```
- **Response `200 OK`:** Ablated attention and logits.

### `POST /patch/analyze`
Activation patching comparing clean, source, and patched representations.
- **Request Body:**
  ```json
  {
    "sentence": "Target sentence to inspect",
    "source_sentence": "Source sentence providing patch activations",
    "patch_layers": [6, 7, 8]
  }
  ```
- **Response `200 OK`:** Clean, source, and patched forward pass activations.

---

## 4. Real-time Streaming & Collaboration Endpoints

### `WS /ws/generate`
Bidirectional WebSocket streaming causal token generation.
- **Handshake:** `wss://sudharsan112321-tokenprint-backend.hf.space/ws/generate`
- **Initial Client Message:**
  ```json
  {
    "prompt": "Explain transformers in simple terms:",
    "max_new_tokens": 30,
    "temperature": 0.7,
    "top_k": 10,
    "record_trace": true
  }
  ```
- **Server Stream Frames:**
  1. `meta`: Session metadata, prompt token count, model ID.
  2. `token`: Generated token string, token ID, step index, logits, active attention focus.
  3. `done`: Final generation statistics and status.

### `WS /ws/collab/{room_id}`
Multi-viewer shared presence, pointer coordinates, and presenter sync.
- **Handshake:** `wss://sudharsan112321-tokenprint-backend.hf.space/ws/collab/<room_id>?user_id=<uid>&name=<name>&color=<hex>&role=<role>`
- **Message Types:**
  - `presence`: List of active connected peers and presenter state.
  - `cursor`: Pointer X/Y coordinates and focused layer.
  - `selection`: Selected tensor, operation, or token.
  - `step`: Presenter-driven chapter or frame transition.

---

## 5. Trace Management Endpoints

### `GET /trace`
Downloads the last recorded forward pass as a serialized trace JSON file.
- **Response `200 OK`:** File download `tokenprint-trace.json`.

### `POST /trace/replay`
Validates an uploaded JSON trace and parses it for browser playback.
- **Request Body:** Serialized trace object.
- **Response `200 OK`:** Validated parsed trace structure.
