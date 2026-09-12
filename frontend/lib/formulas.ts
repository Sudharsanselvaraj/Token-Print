// Architecture-aware formula sets. Detect the model family from the parsed
// architecture name (GGUF general.architecture / HF config.model_type) and pick
// the correct normalization / position-encoding / MLP / attention formulas.
// We never show LayerNorm for an RMSNorm model, or learned positions for a RoPE
// model.

export type ArchFamily = "llama" | "gpt2";

export type OpKey =
  | "embedding"
  | "position"
  | "norm"
  | "attention"
  | "attn.q"
  | "attn.k"
  | "attn.v"
  | "attn.o"
  | "mlp"
  | "mlp.gate"
  | "mlp.up"
  | "mlp.down"
  | "output";

const LLAMA_LIKE = new Set([
  "llama",
  "qwen",
  "qwen2",
  "qwen3",
  "qwen2moe",
  "qwen3moe",
  "mistral",
  "mixtral",
  "gemma",
  "gemma2",
  "gemma3",
  "phi3",
]);

export function detectArch(name: string | undefined | null): ArchFamily {
  const a = (name ?? "").toLowerCase();
  if (a.startsWith("gpt2") || a === "gpt" || a === "gptj" || a === "gpt_neox")
    return "gpt2";
  if (LLAMA_LIKE.has(a)) return "llama";
  // default to the modern llama-family formulas (RMSNorm/RoPE/SwiGLU)
  return "llama";
}

interface OpFormula {
  title: string;
  latex: string[]; // one or more display lines
}

const LLAMA: Record<OpKey, OpFormula> = {
  embedding: {
    title: "Token Embedding",
    latex: [String.raw`x_0 = E[\,t\,]`],
  },
  position: {
    title: "Rotary Position (RoPE)",
    latex: [
      String.raw`\tilde{q}_m = R_{\Theta,m}\,q_m,\quad \tilde{k}_n = R_{\Theta,n}\,k_n`,
    ],
  },
  norm: {
    title: "RMS Normalization",
    latex: [
      String.raw`\bar{x} = \frac{x}{\sqrt{\tfrac{1}{d}\sum_i x_i^2 + \epsilon}}\odot \gamma`,
    ],
  },
  attention: {
    title: "Grouped-Query Attention",
    latex: [
      String.raw`\mathrm{Attn}(Q,K,V)=\mathrm{softmax}\!\left(\frac{QK^{\top}}{\sqrt{d_h}}+M\right)V`,
    ],
  },
  "attn.q": { title: "Query Projection", latex: [String.raw`Q = x\,W_Q`] },
  "attn.k": { title: "Key Projection", latex: [String.raw`K = x\,W_K`] },
  "attn.v": { title: "Value Projection", latex: [String.raw`V = x\,W_V`] },
  "attn.o": {
    title: "Output Projection",
    latex: [String.raw`O = \mathrm{Attn}\,W_O,\quad x \mathrel{+}= O`],
  },
  mlp: {
    title: "SwiGLU MLP",
    latex: [
      String.raw`\mathrm{MLP}(x)=\big(\mathrm{SiLU}(x W_{\text{gate}})\odot x W_{\text{up}}\big)W_{\text{down}}`,
    ],
  },
  "mlp.gate": {
    title: "Gate Projection",
    latex: [String.raw`g = \mathrm{SiLU}(x\,W_{\text{gate}})`],
  },
  "mlp.up": { title: "Up Projection", latex: [String.raw`u = x\,W_{\text{up}}`] },
  "mlp.down": {
    title: "Down Projection",
    latex: [String.raw`\mathrm{MLP}(x) = (g \odot u)\,W_{\text{down}}`],
  },
  output: {
    title: "Vocabulary Unembedding",
    latex: [
      String.raw`\ell = \bar{x}_{\text{final}}\,W_U`,
      String.raw`p = \mathrm{softmax}(\ell)`,
    ],
  },
};

const GPT2: Record<OpKey, OpFormula> = {
  embedding: {
    title: "Token + Position Embedding",
    latex: [String.raw`x_0 = E[\,t\,] + P[\,\text{pos}\,]`],
  },
  position: {
    title: "Learned Position Embedding",
    latex: [String.raw`x \mathrel{+}= P[\,\text{pos}\,]`],
  },
  norm: {
    title: "Layer Normalization",
    latex: [
      String.raw`x_{\text{ln}} = \frac{x-\mu}{\sqrt{\sigma^2+\epsilon}}\odot\gamma+\beta`,
    ],
  },
  attention: {
    title: "Multi-Head Self-Attention",
    latex: [
      String.raw`\mathrm{Attn}(Q,K,V)=\mathrm{softmax}\!\left(\frac{QK^{\top}}{\sqrt{d_h}}+M\right)V`,
    ],
  },
  "attn.q": { title: "Query Projection", latex: [String.raw`Q = x\,W_Q + b_Q`] },
  "attn.k": { title: "Key Projection", latex: [String.raw`K = x\,W_K + b_K`] },
  "attn.v": { title: "Value Projection", latex: [String.raw`V = x\,W_V + b_V`] },
  "attn.o": {
    title: "Output Projection",
    latex: [String.raw`O = \mathrm{Attn}\,W_O + b_O,\quad x \mathrel{+}= O`],
  },
  mlp: {
    title: "GELU MLP",
    latex: [
      String.raw`a = \mathrm{GELU}(x\,W_{\text{fc}}+b_{\text{fc}})`,
      String.raw`\mathrm{MLP}(x) = a\,W_{\text{proj}}+b_{\text{proj}}`,
    ],
  },
  "mlp.gate": { title: "—", latex: [] },
  "mlp.up": {
    title: "FC (Up) Projection",
    latex: [String.raw`a = \mathrm{GELU}(x\,W_{\text{fc}}+b_{\text{fc}})`],
  },
  "mlp.down": {
    title: "Projection (Down)",
    latex: [String.raw`\mathrm{MLP}(x) = a\,W_{\text{proj}}+b_{\text{proj}}`],
  },
  output: {
    title: "Vocabulary Unembedding",
    latex: [
      String.raw`\ell = x_{\text{final}}\,W_U`,
      String.raw`p = \mathrm{softmax}(\ell)`,
    ],
  },
};

const SETS: Record<ArchFamily, Record<OpKey, OpFormula>> = {
  llama: LLAMA,
  gpt2: GPT2,
};

/** Map a tensor role (from tensorName.ts) to a formula op key. */
export function roleToOpKey(role: string | undefined): OpKey | null {
  switch (role) {
    case "embedding":
      return "embedding";
    case "position":
      return "position";
    case "norm":
      return "norm";
    case "attn.q":
    case "attn.k":
    case "attn.v":
    case "attn.o":
      return role;
    case "mlp.gate":
    case "mlp.up":
    case "mlp.down":
      return role;
    case "output":
      return "output";
    default:
      return null;
  }
}

export function getFormula(
  family: ArchFamily,
  op: OpKey,
): { title: string; latex: string[] } {
  const familySet = SETS[family] ?? LLAMA;
  const entry = op ? familySet[op] : null;
  return entry ?? { title: "Operation Formula", latex: [] };
}


/** The high-level op that a given op key belongs to (for context). */
export function contextOp(op: OpKey): OpKey {
  if (op.startsWith("attn")) return "attention";
  if (op.startsWith("mlp")) return "mlp";
  return op;
}
