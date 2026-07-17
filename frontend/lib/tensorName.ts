import type { TensorInfo } from "./types";

// Parse a layer index and a coarse "role" from a tensor name. Handles both the
// HF naming (model.layers.22.self_attn.q_proj.weight) and the GGUF naming
// (blk.22.attn_q.weight), so the explorer treats both sources identically.

const LAYER_RE = /(?:layers?|blk|h)\.(\d+)\./;

export function parseLayer(name: string): number | null {
  const m = name.match(LAYER_RE);
  return m ? parseInt(m[1], 10) : null;
}

export function parseRole(name: string): string {
  const n = name.toLowerCase();
  if (/embed|token_embd|wte|tok_embeddings/.test(n)) return "embedding";
  if (/wpe|position/.test(n)) return "position";
  if (/(q_proj|attn_q|\.wq\.)/.test(n)) return "attn.q";
  if (/(k_proj|attn_k|\.wk\.)/.test(n)) return "attn.k";
  if (/(v_proj|attn_v|\.wv\.)/.test(n)) return "attn.v";
  if (/(o_proj|attn_output|attn_o|\.wo\.|c_proj)/.test(n)) return "attn.o";
  if (/(gate_proj|ffn_gate)/.test(n)) return "mlp.gate";
  if (/(up_proj|ffn_up|c_fc|w1)/.test(n)) return "mlp.up";
  if (/(down_proj|ffn_down|w2)/.test(n)) return "mlp.down";
  if (/(norm|ln)/.test(n)) return "norm";
  if (/(lm_head|output\.weight|unembed)/.test(n)) return "output";
  if (/bias/.test(n)) return "bias";
  return "other";
}

/** Attach parsed layer + role to each tensor (idempotent). */
export function annotateTensors(tensors: TensorInfo[]): TensorInfo[] {
  return tensors.map((t) => ({
    ...t,
    layer: parseLayer(t.name),
    role: parseRole(t.name),
  }));
}

export const ROLE_LABELS: Record<string, string> = {
  embedding: "Token Embedding",
  position: "Position Embedding",
  "attn.q": "Attention Query",
  "attn.k": "Attention Key",
  "attn.v": "Attention Value",
  "attn.o": "Attention Output",
  "mlp.gate": "MLP Gate",
  "mlp.up": "MLP Up Projection",
  "mlp.down": "MLP Down Projection",
  norm: "Normalization",
  output: "Output / Unembedding",
  bias: "Bias",
  other: "Tensor",
};

export const roleLabel = (role?: string): string =>
  ROLE_LABELS[role ?? "other"] ?? "Tensor";

// Stable-ish palette for roles (used when color-by = role).
export const ROLE_COLORS: Record<string, [number, number, number]> = {
  embedding: [0.55, 0.35, 0.95],
  position: [0.4, 0.5, 0.95],
  "attn.q": [0.2, 0.75, 1.0],
  "attn.k": [0.2, 0.9, 0.85],
  "attn.v": [0.25, 0.9, 0.55],
  "attn.o": [0.6, 0.85, 1.0],
  "mlp.gate": [1.0, 0.72, 0.28],
  "mlp.up": [1.0, 0.55, 0.3],
  "mlp.down": [0.95, 0.4, 0.45],
  norm: [0.6, 0.62, 0.7],
  output: [0.85, 0.4, 0.95],
  bias: [0.5, 0.5, 0.55],
  other: [0.5, 0.55, 0.65],
};
