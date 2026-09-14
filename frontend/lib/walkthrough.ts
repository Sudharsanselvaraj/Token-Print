import type { AnalyzeResponse } from "./types";

// Chaptered walkthrough. Each chapter's body is built from a REAL forward pass
// (the /analyze response) so every number shown is genuine, and each chapter
// drives which 3D visual is shown (lockstep).

export type SceneKey =
  | "overview"
  | "tokenizer"
  | "embedding"
  | "norm"
  | "attention"
  | "mlp"
  | "softmax";

export interface Chapter {
  id: string;
  title: string;
  scene: SceneKey;
  /** Camera composition for this chapter. */
  camera: { position: [number, number, number]; target: [number, number, number]; fov: number };
  /** Current operation name shown in the playback bar. */
  operation: (d: AnalyzeResponse | null, meta: ArchMeta | null) => string;
  /** Mathematical equation (LaTeX-ish plain text) for the inspector. */
  equation: (d: AnalyzeResponse | null, meta: ArchMeta | null) => string | null;
  /** Structured inspector content. */
  inspector: (d: AnalyzeResponse | null, meta: ArchMeta | null) => InspectorContent;
  /** Body text (legacy, kept for transition). */
  build: (d: AnalyzeResponse | null) => string[];
}

export interface InspectorContent {
  explanation: string[];
  inputShape: string | null;
  outputShape: string | null;
  dimensions: Record<string, string>;
  whyItMatters: string;
}

export interface ArchMeta {
  hidden_size: number;
  num_heads: number;
  num_kv_heads: number;
  head_dim: number;
  ffn_size: number;
  vocab_size: number;
  num_layers: number;
}

const tokList = (d: AnalyzeResponse | null) =>
  d ? d.tokens.map((t) => t.text.trim() || "␣").join(" · ") : "…";

function topAttention(d: AnalyzeResponse | null): string {
  if (!d) return "…";
  const mat = d.attention?.[0]?.[0];
  if (!mat) return "…";
  let best = { from: 0, to: 0, w: 0 };
  for (let f = 0; f < mat.length; f++)
    for (let t = 0; t < f; t++)
      if (mat[f][t] > best.w) best = { from: f, to: t, w: mat[f][t] };
  const F = d.tokens[best.from]?.text.trim() || "?";
  const T = d.tokens[best.to]?.text.trim() || "?";
  return `"${F}" → "${T}" with weight ${best.w.toFixed(3)}`;
}

// Default camera compositions per scene key. These are computed at component
// level with real nLayers/GAP; the config provides fallback initial values.
export const DEFAULT_CAMERA: Record<string, { position: [number, number, number]; target: [number, number, number]; fov: number }> = {
  overview:   { position: [30, -40, 100], target: [0, -40, 0], fov: 50 },
  tokenizer:  { position: [0, 2, 18], target: [0, 0, 0], fov: 55 },
  embedding:  { position: [0, 3, 28], target: [0, 0, 0], fov: 55 },
  norm:       { position: [8, -40, 11], target: [0, -40, 0], fov: 45 },
  attention:  { position: [0, 1, 24], target: [0, 0, 0], fov: 55 },
  mlp:        { position: [8, -40, 11], target: [0, -40, 0], fov: 45 },
  softmax:    { position: [8, -80, 11], target: [0, -80, 0], fov: 45 },
};

export const CHAPTERS: Chapter[] = [
  {
    id: "overview",
    title: "Overview",
    scene: "overview",
    camera: DEFAULT_CAMERA.overview,
    operation: () => "forward pass",
    equation: () => null,
    inspector: (d, m) => ({
      explanation: [
        `This walkthrough follows one real sentence through the loaded model and reads genuine numbers at every stage. Nothing is illustrative — it all comes from a real forward pass.`,
        `The sentence is "${d?.sentence ?? "…"}". Its goal at each position is to predict the next token`,
      ],
      inputShape: null,
      outputShape: null,
      dimensions: {
        ...(m ? {
          "Layers": `${m.num_layers}`,
          "Hidden": `${m.hidden_size}`,
          "Q Heads": `${m.num_heads}`,
          "KV Heads": `${m.num_kv_heads}`,
          "Vocab": `${m.vocab_size.toLocaleString()}`,
        } : {}),
      },
      whyItMatters: "The transformer is the backbone of every modern large language model. Understanding its internals demystifies how language models work.",
    }),
    build: (d) => [
      `This walkthrough runs one real sentence through the loaded model — ${d?.model ?? "the model"} — and reads genuine numbers at every stage. Nothing here is illustrative; it all comes from a real forward pass.`,
      `The sentence is "${d?.sentence ?? "…"}". Its goal at each position is to predict the next token`,
    ],
  },
  {
    id: "tokenizer",
    title: "Tokenization",
    scene: "tokenizer",
    camera: DEFAULT_CAMERA.tokenizer,
    operation: () => "tokenizer.encode",
    equation: () => null,
    inspector: (d, m) => ({
      explanation: [
        `First the string is split into tokens — the model never sees letters, only integer IDs from its vocabulary.`,
        `"${d?.sentence ?? "…"}" becomes ${d?.tokens.length ?? "…"} real tokens.`,
      ],
      inputShape: `string (${d?.sentence?.length ?? "?"} chars)`,
      outputShape: `[${d?.tokens.length ?? "?"}] int`,
      dimensions: {
        "Tokens": `${d?.tokens.length ?? "?"}`,
        "Vocab size": `${m?.vocab_size?.toLocaleString() ?? "?"}`,
        "First token": `"${d?.tokens[0]?.text.trim() ?? "?"}" → #${d?.tokens[0]?.id ?? "?"}`,
      },
      whyItMatters: "Tokenization determines what the model can 'see'. Subword tokenization (BPE) balances vocabulary size with coverage of rare words and multilingual text.",
    }),
    build: (d) => [
      `First the string is split into tokens — the model never sees letters, only integer ids from its vocabulary.`,
      `"${d?.sentence ?? "…"}" becomes ${d?.tokens.length ?? "…"} real tokens:`,
      tokList(d),
      `Each token also carries a vocabulary id (e.g. "${d?.tokens[0]?.text.trim() ?? "?"}" = #${d?.tokens[0]?.id ?? "?"}).`,
      `For non-Latin scripts like Tamil, Hindi, or Chinese, the tokenizer falls back to byte-level encoding — each character fragments into 1–3 byte tokens.`,
    ],
  },
  {
    id: "embedding",
    title: "Embedding",
    scene: "embedding",
    camera: DEFAULT_CAMERA.embedding,
    operation: () => "embed_tokens",
    equation: (d, m) => `E = W_emb[token_id]  →  ℝ^${m?.hidden_size ?? "?"}`,
    inspector: (d, m) => ({
      explanation: [
        `Each token ID is looked up in the embedding table and becomes a vector of ${m?.hidden_size ?? "…"} numbers. Similar tokens get similar vectors, so meaning becomes geometry.`,
        `We can't draw ${m?.hidden_size ?? "…"} dimensions, so these are projected to 3D with PCA.`,
      ],
      inputShape: `[${d?.tokens.length ?? "?"}] int`,
      outputShape: `[${d?.tokens.length ?? "?"}, ${m?.hidden_size ?? "?"}]`,
      dimensions: {
        "Vocab": `${m?.vocab_size?.toLocaleString() ?? "?"}`,
        "Hidden dim": `${m?.hidden_size ?? "?"}`,
        "Lookup": `${d?.tokens.length ?? "?"} → ${m?.hidden_size ?? "?"}`,
      },
      whyItMatters: "The embedding is the bridge between discrete token symbols and continuous vector space where all computation happens.",
    }),
    build: (d) => [
      `Each token id is looked up in the embedding table and becomes a vector of ${d?.hidden_size ?? "…"} numbers. Similar tokens get similar vectors, so meaning becomes geometry.`,
      `We can't draw ${d?.hidden_size ?? "…"} dimensions, so these are projected to 3D with PCA (a faithful shadow — distances are approximate). Scrub the layer slider to watch them move.`,
    ],
  },
  {
    id: "norm",
    title: "RMSNorm",
    scene: "norm",
    camera: DEFAULT_CAMERA.norm,
    operation: () => "input_layernorm",
    equation: () => `RMSNorm(x) = x / √(mean(x²) + ε) × γ`,
    inspector: (d, m) => ({
      explanation: [
        `Before each attention and MLP block, the vector is normalized. This model uses RMSNorm: divide by the root-mean-square of its components and scale by a learned gain γ.`,
        `There are two norm sublayers per block — input_layernorm before attention and post_attention_layernorm before MLP — each with its own γ.`,
      ],
      inputShape: `[${d?.tokens.length ?? "?"}, ${m?.hidden_size ?? "?"}]`,
      outputShape: `[${d?.tokens.length ?? "?"}, ${m?.hidden_size ?? "?"}]`,
      dimensions: {
        "Hidden": `${m?.hidden_size ?? "?"}`,
        "Norms/layer": "2",
        "Epsilon": "1e-6",
      },
      whyItMatters: "RMSNorm stabilizes training by preventing activations from growing unboundedly. It's cheaper than LayerNorm (no mean centering) with comparable performance.",
    }),
    build: (d) => [
      `Before each attention and MLP block, the vector is normalized. This model uses RMSNorm: divide by the root-mean-square of its components and scale by a learned gain γ.`,
      `The residual stream flows straight down all ${d?.num_layers ?? "?"} layers; each block reads a normalized copy and adds its result back.`,
    ],
  },
  {
    id: "attention",
    title: "Self-Attention",
    scene: "attention",
    camera: DEFAULT_CAMERA.attention,
    operation: (d, m) => `attn.q_proj  (${m?.num_heads ?? "?"}×${m?.head_dim ?? "?"})`,
    equation: (d, m) => `Attn(Q,K,V) = softmax(QKᵀ/√d_k) × V`,
    inspector: (d, m) => ({
      explanation: [
        `In each layer, every token looks back at earlier tokens and mixes in their values, weighted by a softmax over query·key scores.`,
        `A real example — the strongest connection in layer 0, head 0: ${topAttention(d)}.`,
        `There are ${m?.num_heads ?? "…"} heads per layer, each attending differently. With ${m?.num_kv_heads ?? "?"} KV heads against ${m?.num_heads ?? "?"} Q heads, this is grouped-query attention.`,
      ],
      inputShape: `[${d?.tokens.length ?? "?"}, ${m?.hidden_size ?? "?"}]`,
      outputShape: `[${d?.tokens.length ?? "?"}, ${m?.hidden_size ?? "?"}]`,
      dimensions: {
        "Q heads": `${m?.num_heads ?? "?"}`,
        "KV heads": `${m?.num_kv_heads ?? "?"}`,
        "Head dim": `${m?.head_dim ?? "?"}`,
        "Projection": `${m?.hidden_size ?? "?"} → ${m?.num_heads ?? "?"}×${m?.head_dim ?? "?"}`,
      },
      whyItMatters: "Self-attention is what makes transformers 'attend' to relevant context. Each head learns different patterns — syntax, coreference, semantic similarity.",
    }),
    build: (d) => [
      `In each layer, every token looks back at earlier tokens and mixes in their values, weighted by a softmax over query·key scores.`,
      `A real example — the strongest connection in layer 0, head 0 of this sentence: ${topAttention(d)}.`,
      `There are ${d?.num_heads ?? "…"} heads per layer, each attending differently.`,
    ],
  },
  {
    id: "mlp",
    title: "MLP / SwiGLU",
    scene: "mlp",
    camera: DEFAULT_CAMERA.mlp,
    operation: (d, m) => `mlp.gate_proj  (${m?.hidden_size ?? "?"}→${m?.ffn_size ?? "?"})`,
    equation: (d, m) => `SwiGLU(x) = (xW_gate × silu(xW_up)) × W_down`,
    inspector: (d, m) => ({
      explanation: [
        `After attention, each position passes through a feed-forward MLP independently. This model uses SwiGLU: a gated projection up to a wider hidden size, then back down.`,
        `Attention moves information between tokens; the MLP transforms it within each token. Together they make one transformer block.`,
      ],
      inputShape: `[${d?.tokens.length ?? "?"}, ${m?.hidden_size ?? "?"}]`,
      outputShape: `[${d?.tokens.length ?? "?"}, ${m?.hidden_size ?? "?"}]`,
      dimensions: {
        "Hidden": `${m?.hidden_size ?? "?"}`,
        "FFN size": `${m?.ffn_size ?? "?"}`,
        "Gate/Up": `${m?.hidden_size ?? "?"} → ${m?.ffn_size ?? "?"}`,
        "Down": `${m?.ffn_size ?? "?"} → ${m?.hidden_size ?? "?"}`,
      },
      whyItMatters: "SwiGLU (gated linear unit with SiLU activation) is the dominant MLP architecture in modern LLMs, outperforming standard ReLU/GELU FFNs.",
    }),
    build: () => [
      `After attention, each position passes through a feed-forward MLP independently. This model uses a SwiGLU MLP: a gated projection up to a wider hidden size, then back down.`,
      `Attention moves information between tokens; the MLP transforms it within each token. Together they make one transformer block.`,
    ],
  },
  {
    id: "softmax",
    title: "Output & Prediction",
    scene: "softmax",
    camera: DEFAULT_CAMERA.softmax,
    operation: () => "lm_head",
    equation: (d, m) => `P(next) = softmax(logits / τ)  where logits = h × W_outᵀ`,
    inspector: (d, m) => {
      const top1 = d?.logit_lens?.[d.logit_lens.length - 1]?.[0]?.[0];
      return {
        explanation: [
          `After the final layer norm, the vector is multiplied by the unembedding matrix to produce one logit per vocabulary entry (${m?.hidden_size ?? "…"} → ${m?.vocab_size?.toLocaleString() ?? "…"}).`,
          `Softmax turns those logits into probabilities that sum to 1 — the model's prediction for the next token.`,
          top1 ? `The model predicts "${top1.text}" (token #${top1.token_id}) with probability ${(top1.prob * 100).toFixed(1)}%.` : "",
        ].filter(Boolean),
        inputShape: `[${d?.tokens.length ?? "?"}, ${m?.hidden_size ?? "?"}]`,
        outputShape: `[${d?.tokens.length ?? "?"}, ${m?.vocab_size?.toLocaleString() ?? "?"}]`,
        dimensions: {
          "Hidden": `${m?.hidden_size ?? "?"}`,
          "Vocab": `${m?.vocab_size?.toLocaleString() ?? "?"}`,
          "Top-1": top1 ? `"${top1.text}" (#${top1.token_id})` : "—",
          "Prob": top1 ? `${(top1.prob * 100).toFixed(1)}%` : "—",
        },
        whyItMatters: "The output layer is the model's 'decision' — projecting the final representation back into vocabulary space to predict what comes next.",
      };
    },
    build: (d) => {
      const top1 = d?.logit_lens?.[d.logit_lens.length - 1]?.[0]?.[0];
      return [
        `After the final layer norm, the vector is multiplied by the unembedding matrix to produce one logit per vocabulary entry (${d?.hidden_size ?? "…"} → vocab).`,
        `Softmax turns those logits into probabilities that sum to 1 — the model's prediction for the next token. Greedy decoding picks the largest.`,
        top1 ? `The model predicts "${top1.text}" (token #${top1.token_id}, ${(top1.prob * 100).toFixed(1)}% probability).` : "",
      ].filter(Boolean);
    },
  },
];

// Reference model sizes for the scale selector.
export const REF_MODELS: { id: string; label: string; params: number; layers: number }[] = [
  { id: "nano", label: "nano-gpt", params: 85_584, layers: 3 },
  { id: "gpt2", label: "GPT-2 (small)", params: 124_439_808, layers: 12 },
  { id: "qwen05", label: "Qwen2.5-0.5B", params: 494_032_768, layers: 24 },
  { id: "gpt2xl", label: "GPT-2 XL", params: 1_557_611_200, layers: 48 },
];
