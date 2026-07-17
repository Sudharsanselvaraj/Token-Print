// ggml tensor type table: enum value -> { name, blockSize, typeSize }.
// On-disk bytes for a tensor = (nElements / blockSize) * typeSize.
// Verified against the ggml GGUF spec.

export interface GgmlType {
  name: string;
  blockSize: number;
  typeSize: number;
}

export const GGML_TYPES: Record<number, GgmlType> = {
  0: { name: "F32", blockSize: 1, typeSize: 4 },
  1: { name: "F16", blockSize: 1, typeSize: 2 },
  2: { name: "Q4_0", blockSize: 32, typeSize: 18 },
  3: { name: "Q4_1", blockSize: 32, typeSize: 20 },
  6: { name: "Q5_0", blockSize: 32, typeSize: 22 },
  7: { name: "Q5_1", blockSize: 32, typeSize: 24 },
  8: { name: "Q8_0", blockSize: 32, typeSize: 34 },
  9: { name: "Q8_1", blockSize: 32, typeSize: 36 },
  10: { name: "Q2_K", blockSize: 256, typeSize: 84 },
  11: { name: "Q3_K", blockSize: 256, typeSize: 110 },
  12: { name: "Q4_K", blockSize: 256, typeSize: 144 },
  13: { name: "Q5_K", blockSize: 256, typeSize: 176 },
  14: { name: "Q6_K", blockSize: 256, typeSize: 210 },
  15: { name: "Q8_K", blockSize: 256, typeSize: 292 },
  16: { name: "IQ2_XXS", blockSize: 256, typeSize: 66 },
  17: { name: "IQ2_XS", blockSize: 256, typeSize: 74 },
  18: { name: "IQ3_XXS", blockSize: 256, typeSize: 98 },
  19: { name: "IQ1_S", blockSize: 256, typeSize: 50 },
  20: { name: "IQ4_NL", blockSize: 32, typeSize: 18 },
  21: { name: "IQ3_S", blockSize: 256, typeSize: 110 },
  22: { name: "IQ2_S", blockSize: 256, typeSize: 82 },
  23: { name: "IQ4_XS", blockSize: 256, typeSize: 136 },
  24: { name: "I8", blockSize: 1, typeSize: 1 },
  25: { name: "I16", blockSize: 1, typeSize: 2 },
  26: { name: "I32", blockSize: 1, typeSize: 4 },
  27: { name: "I64", blockSize: 1, typeSize: 8 },
  28: { name: "F64", blockSize: 1, typeSize: 8 },
  29: { name: "IQ1_M", blockSize: 256, typeSize: 56 },
  30: { name: "BF16", blockSize: 1, typeSize: 2 },
};

export function typeName(t: number): string {
  return GGML_TYPES[t]?.name ?? `TYPE_${t}`;
}

export function tensorBytes(t: number, nElements: number): number | null {
  const info = GGML_TYPES[t];
  if (!info || info.typeSize === 0) return null;
  return Math.ceil(nElements / info.blockSize) * info.typeSize;
}
