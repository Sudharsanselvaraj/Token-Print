# TokenPrint — Model Execution & Autoregressive Inference Pipeline

**Status:** Current Production Pipeline  
**Execution Engine:** PyTorch CausalLM / Hugging Face Transformers  
**Inference Modalities:** Causal LM, Speculative Decoding, Sliding-Window Attention, GGUF  

---

## 1. Inference Engine Lifecycle

TokenPrint's `ModelEngine` manages the resident machine learning model, weights memory allocation, forward pass hook attachment, and real-time generation loop.

```mermaid
stateDiagram-v2
    [*] --> Unloaded
    Unloaded --> Loading: Model ID Requested
    Loading --> Loaded: Weights & Tokenizer Cached
    Loading --> LoadFailed: OOM / Model Not Found

    state Loaded {
        [*] --> Idle
        Idle --> ForwardPass: POST /analyze
        ForwardPass --> Idle: Tensors Captured & Reduced
        Idle --> StreamGeneration: WS /ws/generate
        StreamGeneration --> StreamGeneration: Yield Token Frame
        StreamGeneration --> Idle: EOS / max_tokens Reached
        Idle --> AblatedForward: POST /ablate/analyze
        AblatedForward --> Idle: Hooks Cleaned Up
        Idle --> PatchedForward: POST /patch/analyze
        PatchedForward --> Idle: Hooks Cleaned Up
    }

    Loaded --> Unloaded: Model Unload / Process Exit
    LoadFailed --> Unloaded: Retry
```

---

## 2. Autoregressive Streaming & KV Cache Tracking

Autoregressive generation is exposed over WebSocket (`/ws/generate`), yielding rich frame-by-frame diagnostic metadata:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Browser Client
    participant WS as WebSocket Handler (/ws/generate)
    participant Engine as ModelEngine (PyTorch)
    participant Model as Resident Transformer
    participant KVCache as Past Key/Value Cache

    Client->>WS: Connect & Send GenerationConfig (prompt, max_tokens, temp, top_k)
    WS->>Engine: Initialize GenerationState
    Engine->>Model: Prefill Pass (Full prompt tokens)
    Model->>KVCache: Store Prompt Key/Value Tensors
    Model-->>Engine: Logits & Hidden States
    Engine-->>WS: Yield Prefill Frame (Tokens, Attn Focus, Timing)
    WS-->>Client: Stream Frame 0

    loop Decode Steps (1 .. max_new_tokens)
        Engine->>Model: Decode Pass (Single next token + KVCache)
        Model->>KVCache: Append New Key/Value Pair
        alt Sliding Window Enabled
            KVCache->>KVCache: Trim Cache to Window Size (n_positions)
        end
        Model-->>Engine: Next Token Logits & Attention Weights
        Engine->>Engine: Sample Token (Greedy / Top-P / Temperature)
        Engine-->>WS: Yield Decode Frame (token_id, logits, cache_trimmed)
        WS-->>Client: Stream Next Frame
    end
    WS->>Client: Stream Completion Message & Close
```

---

## 3. Speculative Decoding Instrumentation

TokenPrint natively instruments speculative decoding runs:
- **Draft Proposals**: Identifies speculative token sequences emitted by a draft model.
- **Verification Pass**: Tracks parallel target model verification across draft positions.
- **Acceptance Rate**: Calculates $\alpha = \frac{N_{\text{accepted}}}{N_{\text{draft}}}$ per generation batch.
- **Styling Annotations**: Emits `.tok.gen.draft` and `.tok.gen.target` styling markers for 3D and DOM visualization.

---

## 4. Execution Pipeline Capability Inventory

| Capability | Status | Implementation Details |
| :--- | :--- | :--- |
| **Prefill Pass** | `IMPLEMENTED` | Full prompt ingested in parallel; captures prompt attention matrix. |
| **Decode Pass** | `IMPLEMENTED` | Sequential next-token sampling with KV cache reuse. |
| **Sliding Window** | `IMPLEMENTED` | FIFO key/value eviction when sequence exceeds `window_size`. |
| **Needle-in-Haystack** | `IMPLEMENTED` | Tracks specific fact tokens to observe eviction from sliding cache. |
| **Speculative Verification** | `IMPLEMENTED` | Draft vs target token categorization with acceptance metrics. |
| **Dynamic Quantization** | `EXPERIMENTAL` | GGUF quantization via `llama-cpp-python` (metadata verified). |
| **Batched Multi-User** | `PARTIALLY IMPLEMENTED`| Single-request concurrency supported; multi-request queued via locks. |
