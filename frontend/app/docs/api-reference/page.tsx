import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCode from "@/components/docs/DocsCode";
import DocsCallout from "@/components/docs/DocsCallout";

export const metadata: Metadata = {
  title: "API Reference",
  description: "Complete HTTP and WebSocket API reference for the TokenPrint backend.",
};

export default function ApiReferencePage() {
  return (
    <>
      <DocsBreadcrumb slug="api-reference" title="API Reference" />
      <h1>API Reference</h1>
      <p className="docs-meta">Reference</p>

      <p>
        Base URL (dev): <code>http://localhost:8000</code>. All responses are JSON. CORS is
        restricted to the local dev origin (<code>http://localhost:3000</code>, configurable via{" "}
        <code>TOKENPRINT_FRONTEND_PORT</code>) and the deployed frontend origins (
        <code>sudharsanselvaraj.github.io</code>, <code>tokenprint.in</code>).
      </p>

      <hr />

      <h2 id="get-health"><code>GET /health</code></h2>
      <p>Liveness check — whether the backend is running and the model is loaded.</p>
      <DocsCode lang="json" code={`{ "status": "ok", "model_loaded": true }`} />

      <hr />

      <h2 id="get-model-info"><code>GET /model-info</code></h2>
      <p>Real model metadata from the loaded PyTorch model.</p>
      <DocsCode lang="json" code={`{
  "model": "Qwen/Qwen2.5-0.5B-Instruct",
  "device": "mps",
  "num_layers": 24,
  "num_heads": 14,
  "hidden_size": 896,
  "attn_implementation": "eager",
  "max_tokens": 40,
  "ready": true
}`} />

      <hr />

      <h2 id="get-architecture"><code>GET /architecture</code></h2>
      <p>
        Real architecture metadata and tensor list from <code>named_parameters()</code> and{" "}
        <code>config</code>. No forward pass required.
      </p>
      <DocsCode lang="json" code={`{
  "source": "model",
  "model": "Qwen/Qwen2.5-0.5B-Instruct",
  "metadata": {
    "architecture": "qwen2",
    "total_params": 494032768,
    "num_layers": 24,
    "num_heads": 14,
    "num_kv_heads": 2,
    "head_dim": 64,
    "ffn_size": 4864,
    "vocab_size": 151936,
    "context_length": 32768,
    "rope_theta": 1000000.0
  },
  "tensor_count": 290,
  "tensors": [
    {
      "name": "model.embed_tokens.weight",
      "shape": [151936, 896],
      "dtype": "float32",
      "n_params": 136134656
    }
  ]
}`} />

      <hr />

      <h2 id="post-analyze"><code>POST /analyze</code></h2>
      <p>
        Runs a real forward pass and returns attention weights, token embeddings, PCA projections,
        and the logit lens for the given sentence. Capped at approximately 40 tokens.
      </p>
      <DocsCode lang="json" filename="request body" code={`{ "sentence": "The cat sat on the mat." }`} />
      <DocsCode lang="json" filename="response (abbreviated)" code={`{
  "sentence": "The cat sat on the mat.",
  "num_layers": 24,
  "num_heads": 14,
  "tokens": [
    { "index": 0, "text": "The", "id": 785, "is_special": false }
  ],
  "attention": [ /* [layer][head][from][to] — shape [24, 14, 7, 7] */ ],
  "embeddings_3d": [ [x, y, z] ],
  "logit_lens": [ /* [layer][position] -> [{text, id, prob}] */ ]
}`} />

      <hr />

      <h2 id="ws-generate"><code>WS /ws/generate</code></h2>
      <p>Real streamed greedy generation over a WebSocket connection.</p>

      <DocsCode lang="json" filename="client → server" code={`{
  "prompt": "Name one primary color.",
  "max_new_tokens": 40,
  "top_k": 10,
  "trace": true
}`} />

      <p>The server sends three frame types:</p>

      <DocsCode lang="json" filename="frame: meta (once)" code={`{
  "type": "meta",
  "model": "Qwen/Qwen2.5-0.5B-Instruct",
  "num_layers": 24,
  "prompt_len": 36,
  "uses_kv_cache": true,
  "op_catalog": [
    {
      "index": 0,
      "op_key": "embedding",
      "label": "Token Embedding",
      "layer": null,
      "param_count": 136134656,
      "cumulative_params": 136134656,
      "in_dim": 896,
      "out_dim": 151936
    }
    // 243 ops total
  ]
}`} />

      <DocsCode lang="json" filename="frame: token (per generated token)" code={`{
  "type": "token",
  "step": 0,
  "chosen": { "id": 6893, "text": "Red", "logprob": -0.04 },
  "topk": [
    { "id": 6893, "text": "Red", "logit": 18.4, "prob": 0.957 }
  ],
  "phase": "prefill",
  "n_positions": 39,
  "cache_len": 0,
  "eos": false
}`} />

      <DocsCode lang="json" filename="frame: done" code={`{
  "type": "done",
  "generated_text": "Red",
  "total_steps": 2
}`} />

      <hr />

      <h2 id="post-ablate"><code>POST /ablate/analyze</code></h2>
      <p>
        Zeroes selected heads or layers via forward hooks and runs a real forward pass. Response
        has the same shape as <code>/analyze</code> — diff the two logit-lens tables to measure
        the effect of the ablation.
      </p>

      <DocsCallout variant="note">
        <p>
          Ablation operates on raw architectural components — any head, any block, on whatever
          model is loaded. No pre-trained sparse autoencoder or transcoder required.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="get-trace"><code>GET /trace</code> · <code>POST /trace/replay</code></h2>
      <p>
        Record and replay. When <code>record_trace: true</code> is set on a generation request,
        the full WebSocket stream is saved. <code>GET /trace</code> returns the last recorded run
        as a downloadable <code>.tokenprint.json</code>. <code>POST /trace/replay</code> accepts
        an uploaded trace and replays it back.
      </p>

      <DocsCallout variant="important">
        <p>
          Traces are versioned (<code>trace_version: 1</code>). Replay code rejects unknown
          versions rather than silently mis-reading them.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="api-hf-inspect"><code>GET /api/hf/inspect</code></h2>
      <p>
        Returns metadata for a Hugging Face model by ID, fetched at the model&apos;s pinned
        revision (the resolved commit SHA) rather than a hardcoded <code>main</code>. Returns
        architecture, parameter count, VRAM estimate, and a capability/compatibility report.
      </p>

      <DocsCode lang="json" code={`{
  "model_id": "Qwen/Qwen2.5-0.5B-Instruct",
  "revision": "<resolved commit sha>",
  "architecture": "qwen2",
  "parameter_count": 494032768,
  "estimated_vram_gb": 2.0,
  "compatibility_level": "full",
  "capabilities": { /* attention, hidden states, ablation, patching flags */ }
}`} />

      <hr />

      <h2 id="api-model-capabilities"><code>GET /api/model/capabilities</code></h2>
      <p>
        Effective capabilities of the currently loaded model — whether attention capture, hidden
        states, ablation, and patching are actually available on this hardware/device.
      </p>

      <hr />

      <h2 id="gguf-engine">GGUF engine (<code>/gguf/*</code>)</h2>
      <p>
        Dedicated server-side execution engine for quantized llama.cpp models, held in an{" "}
        <strong>LRU cache</strong> so resident models are reused without leaking memory. Requires{" "}
        <code>pip install -r backend/requirements-gguf.txt</code> (<code>llama-cpp-python</code>);
        without it <code>engine_available</code> is <code>false</code> and <code>/gguf/open</code>{" "}
        returns 400.
      </p>

      <DocsCode lang="bash" code={`# Uploaded/resident GGUF files live in backend/data/gguf
curl http://localhost:8000/gguf/list`} />

      <table>
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>GET /gguf/list</code></td>
            <td>
              Lists server-side <code>.gguf</code> files: name, size, quantization guess, and
              whether each is currently resident.
            </td>
          </tr>
          <tr>
            <td><code>POST /gguf/upload</code></td>
            <td>
              Streams a <code>.gguf</code> upload into <code>data/gguf</code> (8 MB chunks, 10 GB
              limit, extension-validated).
            </td>
          </tr>
          <tr>
            <td><code>POST /gguf/open</code></td>
            <td>
              Loads (or returns from the LRU cache) a resident model. Body:{" "}
              <code>{`{ "path": "model.gguf" }`}</code>.
            </td>
          </tr>
          <tr>
            <td><code>POST /gguf/unload</code></td>
            <td>
              Explicitly unloads a resident engine and releases its memory. Body:{" "}
              <code>{`{ "path": "model.gguf" }`}</code> →{" "}
              <code>{`{ "ok": true, "name": ..., "unloaded": true }`}</code>.
            </td>
          </tr>
          <tr>
            <td><code>GET /gguf/cache</code></td>
            <td>
              Resident cache statistics and limits:{" "}
              <code>{`{ "resident_count": ..., "max_engines": ..., "resident_paths": [...] }`}</code>.
            </td>
          </tr>
        </tbody>
      </table>

      <DocsCallout variant="note">
        <p>
          The LRU cache holds at most <code>MAX_GGUF_ENGINES</code> engines (default 2, min 1).
          Eviction closes the least-recently-used engine and runs garbage collection before
          inserting a new one, so repeated loads are fast without leaking memory.
        </p>
      </DocsCallout>

      <DocsPrevNext slug="api-reference" />
    </>
  );
}
