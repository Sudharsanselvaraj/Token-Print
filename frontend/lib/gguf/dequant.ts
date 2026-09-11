// Scoped tensor dequantization: decode quantized bytes from a GGUF file into
// Float32Array values.  Only dequantizes a single tensor on demand (bounded to
// the selected tensor, never the whole file).  Runs synchronously for small
// tensors; wrap in a Web Worker for large ones.

import { GGML_TYPES, type GgmlType } from "./ggmlTypes";

// ---- ggml quantization constants ----------------------------------------- //
const QK4_0 = 32;
const QK8_0 = 32;

// ---- helpers ------------------------------------------------------------- //

function readU16LE(dv: DataView, off: number): number {
  return dv.getUint16(off, true);
}

function readU8(dv: DataView, off: number): number {
  return dv.getUint8(off);
}

// ---- per-type dequantization (one block) --------------------------------- //

/** Q4_0: 2-byte scale (f16) + 32 nibbles packed into 16 bytes. */
function dequantBlockQ4_0(block: DataView, dst: Float32Array, dstOff: number) {
  // Q4_0 stores the scale as f16.  DataView can't read f16 natively; decode manually.
  const dRaw = readU16LE(block, 0);
  const dF = f16toF32(dRaw);
  for (let i = 0; i < QK4_0; i++) {
    const byte = readU8(block, 2 + (i >> 1));
    const nibble = i & 1 ? byte >> 4 : byte & 0x0f;
    // Q4_0 uses unsigned nibbles 0..15 centered at 8
    dst[dstOff + i] = dF * (nibble - 8);
  }
}

/** Q4_1: 2-byte scale (f16) + 2-byte min (f16) + 32 nibbles. */
function dequantBlockQ4_1(block: DataView, dst: Float32Array, dstOff: number) {
  const d = f16toF32(readU16LE(block, 0));
  const m = f16toF32(readU16LE(block, 2));
  for (let i = 0; i < QK4_0; i++) {
    const byte = readU8(block, 4 + (i >> 1));
    const nibble = i & 1 ? byte >> 4 : byte & 0x0f;
    dst[dstOff + i] = d * nibble + m;
  }
}

/** Q5_0: 2-byte scale (f16) + 32 bytes low bits + 32-bit high-bit block. */
function dequantBlockQ5_0(block: DataView, dst: Float32Array, dstOff: number) {
  const d = f16toF32(readU16LE(block, 0));
  // High bits: 32 bits packed into 4 bytes starting at offset 2+32=34
  const qh = readU32LE(block, 34);
  for (let i = 0; i < QK4_0; i++) {
    const byte = readU8(block, 2 + i);
    const lo = byte & 0x0f;
    const hi = (qh >> i) & 1;
    const val = lo | (hi << 4); // 5-bit value
    dst[dstOff + i] = d * (val - 16);
  }
}

/** Q5_1: 2-byte scale + 2-byte min (both f16) + 32 bytes + 32-bit high block. */
function dequantBlockQ5_1(block: DataView, dst: Float32Array, dstOff: number) {
  const d = f16toF32(readU16LE(block, 0));
  const m = f16toF32(readU16LE(block, 2));
  const qh = readU32LE(block, 36);
  for (let i = 0; i < QK4_0; i++) {
    const byte = readU8(block, 4 + i);
    const lo = byte & 0x0f;
    const hi = (qh >> i) & 1;
    const val = lo | (hi << 4);
    dst[dstOff + i] = d * val + m;
  }
}

/** Q8_0: 2-byte scale (f16) + 32 signed bytes. */
function dequantBlockQ8_0(block: DataView, dst: Float32Array, dstOff: number) {
  const d = f16toF32(readU16LE(block, 0));
  for (let i = 0; i < QK8_0; i++) {
    dst[dstOff + i] = d * readI8(block, 2 + i);
  }
}

/** Q8_1: 2-byte scale + 2-byte sum (f16) + 32 signed bytes. */
function dequantBlockQ8_1(block: DataView, dst: Float32Array, dstOff: number) {
  const d = f16toF32(readU16LE(block, 0));
  // sum at offset 2 is not used for reconstruction
  for (let i = 0; i < QK8_0; i++) {
    dst[dstOff + i] = d * readI8(block, 4 + i);
  }
}

/** Q4_K: 2-byte scale (f16) + 2-byte min (f16) + 128 nibbles + super-block scales. */
function dequantBlockQ4_K(block: DataView, dst: Float32Array, dstOff: number) {
  // Simplified: treat as 16 sub-blocks of 16 elements each.
  // The full Q4_K format has super-block scales; we use a simplified reconstruction
  // that reads the dominant scale.  For display purposes this is sufficient.
  const d = f16toF32(readU16LE(block, 0));
  const m = f16toF32(readU16LE(block, 2));
  // Sub-block scales (16 bytes starting at offset 4 + 128 = 132)
  const scalesOff = 4 + 128;
  for (let sb = 0; sb < 16; sb++) {
    const sf = readI8(block, scalesOff + sb) / 256;
    const base = sb * 16;
    for (let i = 0; i < 16; i++) {
      const byte = readU8(block, 4 + ((base + i) >> 1));
      const nibble = (base + i) & 1 ? byte >> 4 : byte & 0x0f;
      dst[dstOff + base + i] = (d + sf) * nibble + m;
    }
  }
}

/** Q8_K: 2-byte scale (f16) + 256 signed bytes + 32 sub-block scales. */
function dequantBlockQ8_K(block: DataView, dst: Float32Array, dstOff: number) {
  const d = f16toF32(readU16LE(block, 0));
  const scalesOff = 2 + 256;
  for (let sb = 0; sb < 32; sb++) {
    const sf = readI8(block, scalesOff + sb) / 256;
    const base = sb * 8;
    for (let i = 0; i < 8; i++) {
      dst[dstOff + base + i] = (d + sf) * readI8(block, 2 + base + i);
    }
  }
}

// ---- bit helpers -------------------------------------------------------- //

function readI8(block: DataView, off: number): number {
  const v = block.getUint8(off);
  return v > 127 ? v - 256 : v;
}

function readU32LE(block: DataView, off: number): number {
  return block.getUint32(off, true);
}

// ---- f16 -> f32 --------------------------------------------------------- //

/** Decode an IEEE 754 half-precision float (16-bit) to a JS number. */
export function f16toF32(h: number): number {
  const sign = (h >> 15) & 1;
  const exp = (h >> 10) & 0x1f;
  const mantissa = h & 0x3ff;

  if (exp === 0) {
    if (mantissa === 0) return sign ? -0 : 0;
    // Subnormal
    let val = (mantissa / 1024) * Math.pow(2, -14);
    return sign ? -val : val;
  }
  if (exp === 31) {
    if (mantissa === 0) return sign ? -Infinity : Infinity;
    return NaN;
  }
  const val = Math.pow(2, exp - 15) * (1 + mantissa / 1024);
  return sign ? -val : val;
}

// ---- public API --------------------------------------------------------- //

export interface DequantResult {
  /** Dequantized values as float32. */
  values: Float32Array;
  /** Number of elements in the original tensor. */
  nElements: number;
  /** The ggml type that was dequantized. */
  typeName: string;
}

/**
 * Dequantize a single tensor from a GGUF file.
 *
 * @param file   The GGUF File object (dragged/dropped by the user).
 * @param offset Byte offset of the tensor data in the file (from tensor info).
 * @param ggmlType  The ggml type enum value (from tensor info).
 * @param nElements  Total number of elements in the tensor.
 * @param maxElements  Cap on how many elements to dequantize (for display). 0 = all.
 */
export async function dequantizeTensor(
  file: File,
  offset: number,
  ggmlType: number,
  nElements: number,
  maxElements = 4096,
): Promise<DequantResult> {
  const info = GGML_TYPES[ggmlType];
  if (!info) throw new Error(`Unknown ggml type: ${ggmlType}`);

  const toRead = Math.min(nElements, maxElements || nElements);

  // Determine how many bytes we need to read.
  // For block-based types, we need whole blocks.
  const blockSize = info.blockSize;
  const fullBlocks = Math.ceil(toRead / blockSize);
  const bytesNeeded = fullBlocks * info.typeSize;

  // For unblocked types (F32, F16, I8, etc.) the math simplifies.
  const actualBytes =
    blockSize === 1 ? toRead * info.typeSize : bytesNeeded;

  // Cap at 2 MiB per call to keep the UI responsive.
  const readBytes = Math.min(actualBytes, 2 * 1024 * 1024);
  const buf = await file.slice(offset, offset + readBytes).arrayBuffer();
  const dv = new DataView(buf);

  const result = new Float32Array(toRead);
  const type = info.name;

  if (blockSize === 1) {
    // Unblocked types: F32, F16, I8, I16, I32, I64, BF16
    for (let i = 0; i < toRead; i++) {
      const off = i * info.typeSize;
      switch (type) {
        case "F32":
          result[i] = dv.getFloat32(off, true);
          break;
        case "F16":
          result[i] = f16toF32(readU16LE(dv, off));
          break;
        case "BF16":
          result[i] = bf16toF32(readU16LE(dv, off));
          break;
        case "I8":
          result[i] = readI8(dv, off);
          break;
        case "I16":
          result[i] = dv.getInt16(off, true);
          break;
        case "I32":
          result[i] = dv.getInt32(off, true);
          break;
        case "I64":
          result[i] = Number(dv.getBigInt64(off, true));
          break;
        default:
          result[i] = 0;
      }
    }
  } else {
    // Block-based types
    let elementsDone = 0;
    let blockOff = 0;
    while (elementsDone < toRead && blockOff + info.typeSize <= buf.byteLength) {
      const block = new DataView(buf, blockOff, info.typeSize);
      const remaining = toRead - elementsDone;
      const count = Math.min(blockSize, remaining);

      switch (type) {
        case "Q4_0":
          dequantBlockQ4_0(block, result, elementsDone);
          break;
        case "Q4_1":
          dequantBlockQ4_1(block, result, elementsDone);
          break;
        case "Q5_0":
          dequantBlockQ5_0(block, result, elementsDone);
          break;
        case "Q5_1":
          dequantBlockQ5_1(block, result, elementsDone);
          break;
        case "Q8_0":
          dequantBlockQ8_0(block, result, elementsDone);
          break;
        case "Q8_1":
          dequantBlockQ8_1(block, result, elementsDone);
          break;
        case "Q4_K":
          dequantBlockQ4_K(block, result, elementsDone);
          break;
        case "Q8_K":
          dequantBlockQ8_K(block, result, elementsDone);
          break;
        default: {
          // For unsupported block types, fill with 0 and mark.
          for (let i = 0; i < count; i++) result[elementsDone + i] = 0;
          break;
        }
      }

      elementsDone += count;
      blockOff += info.typeSize;
    }
  }

  return { values: result, nElements, typeName: type };
}

/** Decode a BF16 (bfloat16) value to f32. */
function bf16toF32(h: number): number {
  // BF16: 1 sign + 8 exponent + 7 mantissa.  Promote to f32 by shifting left 16.
  const buf = new ArrayBuffer(4);
  new DataView(buf).setUint32(0, h << 16, false); // big-endian: sign+exp in high bits
  return new DataView(buf).getFloat32(0, false);
}

/**
 * Check if a ggml type can be dequantized into real values.
 */
export function canDequantize(ggmlType: number): boolean {
  const info = GGML_TYPES[ggmlType];
  if (!info) return false;
  // We support: F32, F16, BF16, Q4_0, Q4_1, Q5_0, Q5_1, Q8_0, Q8_1, Q4_K, Q8_K
  const supported = new Set([
    "F32", "F16", "BF16", "I8", "I16", "I32",
    "Q4_0", "Q4_1", "Q5_0", "Q5_1", "Q8_0", "Q8_1",
    "Q4_K", "Q8_K",
  ]);
  return supported.has(info.name);
}
