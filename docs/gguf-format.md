# GGUF parsing

TokenPrint ships a pure-TypeScript GGUF parser
(`frontend/lib/gguf/parser.ts`) that runs entirely in the browser. Dragging a
`.gguf` file reads only the **front** of the file — nothing is uploaded.

## Why only the front

A GGUF file is laid out as:

```
[ header ][ metadata key/value pairs ][ tensor-info table ][ padding ][ …tensor data… ]
```

Everything the explorer needs — architecture metadata and every tensor's name,
shape, dtype and offset — lives before the (multi-GB) tensor-data blob. The
parser reads a growing prefix via `File.slice(0, N).arrayBuffer()` (starting at
8 MiB, doubling on demand), so a 5 GB model parses in milliseconds.

## Binary layout (v2 / v3, little-endian)

```
magic         u32   'GGUF' (0x46554747)
version       u32   2 or 3
tensor_count  u64
kv_count      u64

kv × kv_count:
  key         u64 len + UTF-8
  value_type  u32                      (enum below)
  value       depends on value_type

tensor_info × tensor_count:
  name        u64 len + UTF-8
  n_dims      u32
  dims        u64 × n_dims
  ggml_type   u32
  offset      u64

pad to general.alignment (default 32) → tensor data follows (not read)
```

### Metadata value types (`value_type`)

`0` UINT8 · `1` INT8 · `2` UINT16 · `3` INT16 · `4` UINT32 · `5` INT32 ·
`6` FLOAT32 · `7` BOOL (1 byte) · `8` STRING · `9` ARRAY (elem_type u32 + count
u64 + elements) · `10` UINT64 · `11` INT64 · `12` FLOAT64.

The huge `tokenizer.ggml.tokens` string array is **skipped** (only its length is
recorded, as the vocabulary size) — the parser never `TextDecode`s 150k strings.

## Metadata → UI

| GGUF key | Shown as |
| --- | --- |
| `general.architecture` | Architecture (also selects the formula set) |
| `general.name` | Model name |
| `{arch}.block_count` | Layers |
| `{arch}.embedding_length` | Embedding |
| `{arch}.attention.head_count` / `…head_count_kv` | Attn heads / KV heads |
| `{arch}.attention.key_length` | Head dim |
| `{arch}.feed_forward_length` | FFN size |
| `{arch}.context_length` | Context |
| `{arch}.rope.freq_base` | RoPE base |
| `{arch}.expert_count` / `…expert_used_count` | Experts (MoE) |
| `tokenizer.ggml.tokens` (array length) | Vocab size |
| file size / dominant tensor type | File size / Quantization |

## Tensor types & sizes

`ggmlTypes.ts` maps each `ggml_type` to `{ name, blockSize, typeSize }`, covering
`F32/F16/BF16`, the `Q*_0/1` and K-quants (`Q2_K … Q8_K`), and `IQ*`. On-disk
byte size is `ceil(nElements / blockSize) * typeSize`; parameter count is the
product of the dims.

## Honest limitation: value inspection & dequantization approximations

The point cloud needs shapes/offsets/types only — never dequantized weights. The
tensor inspector offers **value preview for F32/F16 tensors** and client-side block dequantization for quantized formats (`lib/gguf/dequant.ts`).

> [!NOTE]
> **K-Quant Approximation Disclaimer (DOC-05):**
> Dequantization algorithms for K-quant formats (`Q4_K`, `Q5_K`, `Q8_K`) in `lib/gguf/dequant.ts` use simplified block scale reconstructions optimized for fast in-browser WebGL visualization. While sufficient for visual pointcloud sampling and histogram previews, displayed float values represent approximate reconstructions rather than bit-exact full precision values. The live-model backend source (`GET /architecture`) provides exact full-precision values.

## Verified against real files

The parser is checked against real local GGUF v3 files of different
architectures — e.g. **qwen3** (399 tensors, Q4_K) and **llama** 3.2 (255
tensors, Q4_K). The parsed tensor counts match the counts encoded in the binary
header, and each model reports its own real vocab, RoPE base, and context length.
See [verification.md](verification.md).

## Backend Execution & Optional Dependencies

To enable native local GGUF backend execution via `llama.cpp`:

```bash
pip install -r backend/requirements-gguf.txt
```

### Capability Matrix: Client Parser vs Backend Engine

| Feature / Capability | Client-Side Browser Parser (`lib/gguf/`) | Server-Side `GGUFEngine` (`llama.cpp`) |
| :--- | :---: | :---: |
| **Header & Metadata Extraction** | ✅ Full Support (v2/v3) | ✅ Full Support |
| **Tensor Info & Pointcloud Geometry** | ✅ Full Support | ✅ Full Support |
| **Weight Value Preview** | ⚠️ F32/F16 + Q4_K/Q5_K block reconstruction | ✅ Native Weight Sampling |
| **Live Quantized Token Generation** | N/A (Browser Client Only) | ✅ Real Quantized Logits & Top-K |
| **KV-Cache Position Accounting** | N/A | ✅ True Context Length |
| **Per-Layer Activation & Attention Stats** | N/A | ❌ Not Exposed by `llama.cpp` |
