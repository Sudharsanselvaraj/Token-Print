// Client-side GGUF (v2/v3) parser. Reads only the front of the file (header +
// metadata + tensor-info, all of which precede the aligned tensor-data blob),
// so multi-GB files parse instantly and nothing is uploaded.

import type { ArchitectureData, ArchMetadata, TensorInfo } from "../types";
import { tensorBytes, typeName } from "./ggmlTypes";

// gguf_metadata_value_type
const T_UINT8 = 0,
  T_INT8 = 1,
  T_UINT16 = 2,
  T_INT16 = 3,
  T_UINT32 = 4,
  T_INT32 = 5,
  T_FLOAT32 = 6,
  T_BOOL = 7,
  T_STRING = 8,
  T_ARRAY = 9,
  T_UINT64 = 10,
  T_INT64 = 11,
  T_FLOAT64 = 12;

class OutOfBounds extends Error {}

class Reader {
  view: DataView;
  pos = 0;
  dec = new TextDecoder("utf-8");
  constructor(buf: ArrayBuffer) {
    this.view = new DataView(buf);
  }
  private need(n: number) {
    if (this.pos + n > this.view.byteLength) throw new OutOfBounds();
  }
  u8() {
    this.need(1);
    return this.view.getUint8(this.pos++);
  }
  i8() {
    this.need(1);
    return this.view.getInt8(this.pos++);
  }
  u16() {
    this.need(2);
    const v = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return v;
  }
  i16() {
    this.need(2);
    const v = this.view.getInt16(this.pos, true);
    this.pos += 2;
    return v;
  }
  u32() {
    this.need(4);
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }
  i32() {
    this.need(4);
    const v = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }
  f32() {
    this.need(4);
    const v = this.view.getFloat32(this.pos, true);
    this.pos += 4;
    return v;
  }
  f64() {
    this.need(8);
    const v = this.view.getFloat64(this.pos, true);
    this.pos += 8;
    return v;
  }
  u64() {
    this.need(8);
    const v = this.view.getBigUint64(this.pos, true);
    this.pos += 8;
    return Number(v); // counts/offsets are < 2^53 in practice
  }
  i64() {
    this.need(8);
    const v = this.view.getBigInt64(this.pos, true);
    this.pos += 8;
    return Number(v);
  }
  skip(n: number) {
    this.need(n);
    this.pos += n;
  }
  str() {
    const len = this.u64();
    this.need(len);
    const s = this.dec.decode(
      new Uint8Array(this.view.buffer, this.pos, len),
    );
    this.pos += len;
    return s;
  }
}

const SCALAR_SIZE: Record<number, number> = {
  [T_UINT8]: 1,
  [T_INT8]: 1,
  [T_UINT16]: 2,
  [T_INT16]: 2,
  [T_UINT32]: 4,
  [T_INT32]: 4,
  [T_FLOAT32]: 4,
  [T_BOOL]: 1,
  [T_UINT64]: 8,
  [T_INT64]: 8,
  [T_FLOAT64]: 8,
};

function readScalar(r: Reader, t: number): number | boolean | string {
  switch (t) {
    case T_UINT8:
      return r.u8();
    case T_INT8:
      return r.i8();
    case T_UINT16:
      return r.u16();
    case T_INT16:
      return r.i16();
    case T_UINT32:
      return r.u32();
    case T_INT32:
      return r.i32();
    case T_FLOAT32:
      return r.f32();
    case T_BOOL:
      return r.u8() !== 0;
    case T_UINT64:
      return r.u64();
    case T_INT64:
      return r.i64();
    case T_FLOAT64:
      return r.f64();
    case T_STRING:
      return r.str();
    default:
      throw new Error(`unknown scalar type ${t}`);
  }
}

/** Skip an array's element bytes without decoding (only lengths for strings). */
function skipArray(r: Reader, elemType: number, count: number) {
  if (elemType === T_STRING) {
    for (let i = 0; i < count; i++) {
      const len = r.u64();
      r.skip(len);
    }
  } else {
    const sz = SCALAR_SIZE[elemType] ?? 0;
    r.skip(sz * count);
  }
}

interface ParsedKV {
  scalars: Map<string, number | boolean | string>;
  arrayCounts: Map<string, number>;
}

function parseFrom(buf: ArrayBuffer, fileSize: number): ArchitectureData {
  const r = new Reader(buf);
  const magic = r.u32(); // 0x46554747 = "GGUF" little-endian
  if (magic !== 0x46554747) throw new Error("Not a GGUF file (bad magic)");
  const version = r.u32();
  const tensorCount = r.u64();
  const kvCount = r.u64();

  const kv: ParsedKV = { scalars: new Map(), arrayCounts: new Map() };
  for (let i = 0; i < kvCount; i++) {
    const key = r.str();
    const vtype = r.u32();
    if (vtype === T_ARRAY) {
      const elemType = r.u32();
      const count = r.u64();
      kv.arrayCounts.set(key, count);
      skipArray(r, elemType, count);
    } else {
      kv.scalars.set(key, readScalar(r, vtype));
    }
  }

  // Tensor info table.
  const tensors: TensorInfo[] = [];
  const typeHistogram = new Map<number, number>();
  let totalParams = 0;
  for (let i = 0; i < tensorCount; i++) {
    const name = r.str();
    const nDims = r.u32();
    const dims: number[] = [];
    for (let d = 0; d < nDims; d++) dims.push(r.u64());
    const ggmlType = r.u32();
    const offset = r.u64();
    const nElements = dims.reduce((a, b) => a * b, 1);
    totalParams += nElements;
    typeHistogram.set(ggmlType, (typeHistogram.get(ggmlType) ?? 0) + 1);
    // Reverse dims to the [out, in] convention shown by PyTorch-style tools.
    tensors.push({
      name,
      shape: [...dims].reverse(),
      dtype: typeName(ggmlType),
      n_params: nElements,
      offset,
    });
  }

  // Dominant non-F32 quant type -> quantization label.
  let domType = -1;
  let domCount = -1;
  for (const [t, c] of typeHistogram) {
    if (t === 0) continue; // ignore F32 (norms/biases)
    if (c > domCount) {
      domCount = c;
      domType = t;
    }
  }
  const quantization =
    domType >= 0 ? typeName(domType) : typeName([...typeHistogram.keys()][0] ?? 0);

  const arch = String(kv.scalars.get("general.architecture") ?? "unknown");
  const g = (suffix: string) => kv.scalars.get(`${arch}.${suffix}`);
  const num = (v: unknown): number | null =>
    typeof v === "number" ? v : null;

  const num_heads = num(g("attention.head_count")) ?? 0;
  const hidden = num(g("embedding_length")) ?? 0;
  const vocab =
    kv.arrayCounts.get("tokenizer.ggml.tokens") ??
    num(kv.scalars.get(`${arch}.vocab_size`)) ??
    0;

  const metadata: ArchMetadata = {
    architecture: arch,
    name: String(kv.scalars.get("general.name") ?? arch),
    total_params: totalParams,
    num_layers: num(g("block_count")) ?? 0,
    hidden_size: hidden,
    num_heads,
    num_kv_heads: num(g("attention.head_count_kv")) ?? num_heads,
    head_dim:
      num(g("attention.key_length")) ??
      (num_heads ? Math.floor(hidden / num_heads) : 0),
    ffn_size: num(g("feed_forward_length")),
    vocab_size: vocab,
    context_length: num(g("context_length")),
    rope_theta: num(g("rope.freq_base")),
    quantization,
    gguf_version: version,
    file_size: fileSize,
    expert_count: num(g("expert_count")),
    expert_used_count: num(g("expert_used_count")),
  };

  return {
    source: "gguf",
    metadata,
    tensor_count: tensors.length,
    tensors,
  };
}

/**
 * Parse a dragged .gguf File. Reads a growing prefix until the tensor-info
 * table fits (header+metadata+tensor_info are always at the front).
 */
export async function parseGgufFile(file: File): Promise<ArchitectureData> {
  let size = 8 * 1024 * 1024; // 8 MiB
  const max = Math.min(file.size, 256 * 1024 * 1024);
  for (;;) {
    const buf = await file.slice(0, Math.min(size, file.size)).arrayBuffer();
    try {
      return parseFrom(buf, file.size);
    } catch (e) {
      if (e instanceof OutOfBounds && size < max) {
        size *= 2;
        continue;
      }
      throw e;
    }
  }
}
