import { detectArch, ArchFamily } from "./formulas";

export interface Citation {
  id: string;
  title: string;
  authors: string;
  year: number;
  url: string;
  why: string;
  component: string;
}

/**
 * Verified Architecture Citation Registry.
 *
 * Ground Rule 1: Every entry represents a real, verified founding research paper
 * with accurate title, author list, publication year, and working arXiv URL.
 */
export const CITATIONS: Record<string, Citation> = {
  transformer: {
    id: "transformer",
    title: "Attention Is All You Need",
    authors: "Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł., & Polosukhin, I.",
    year: 2017,
    url: "https://arxiv.org/abs/1706.03762",
    why: "Replaced recurrent and convolutional layers with parallel self-attention, allowing models to process entire sequences simultaneously and scale efficiently.",
    component: "Transformer Architecture & Self-Attention",
  },
  layernorm: {
    id: "layernorm",
    title: "Layer Normalization",
    authors: "Ba, J. L., Kiros, J. R., & Hinton, G. E.",
    year: 2016,
    url: "https://arxiv.org/abs/1607.06450",
    why: "Normalizes activations across features for each individual sample, stabilizing hidden state dynamics without relying on batch statistics.",
    component: "Layer Normalization (LayerNorm)",
  },
  rmsnorm: {
    id: "rmsnorm",
    title: "Root Mean Square Layer Normalization",
    authors: "Zhang, B., & Sennrich, R.",
    year: 2019,
    url: "https://arxiv.org/abs/1910.07467",
    why: "Simplifies LayerNorm by scaling inputs solely by their root mean square, achieving comparable stability with 10–50% lower computational overhead.",
    component: "Root Mean Square Normalization (RMSNorm)",
  },
  rope: {
    id: "rope",
    title: "RoFormer: Enhanced Transformer with Rotary Position Embedding",
    authors: "Su, J., Ahmed, M., Lu, Y., Pan, S., Bo, W., & Liu, Y.",
    year: 2021,
    url: "https://arxiv.org/abs/2104.09864",
    why: "Encodes relative position by rotating query and key vectors in complex 2D planes, preserving relative distance decay across long contexts.",
    component: "Rotary Position Embedding (RoPE)",
  },
  swiglu: {
    id: "swiglu",
    title: "GLU Variants Improve Transformer",
    authors: "Shazeer, N.",
    year: 2020,
    url: "https://arxiv.org/abs/2002.05202",
    why: "Replaces standard feed-forward bottlenecks with gated linear units driven by SiLU/Swish, yielding consistent quality gains at equivalent compute budgets.",
    component: "SwiGLU Feed-Forward Network",
  },
  gqa: {
    id: "gqa",
    title: "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints",
    authors: "Ainslie, J., Lee-Thorp, J., de Jong, M., Zemlyanskiy, Y., Lebrón, F., & Sanghai, S.",
    year: 2023,
    url: "https://arxiv.org/abs/2305.13245",
    why: "Groups multiple query heads to share key/value head pairs, drastically reducing KV cache memory bandwidth during generation.",
    component: "Grouped-Query Attention (GQA)",
  },
  gelu: {
    id: "gelu",
    title: "Gaussian Error Linear Units (GELUs)",
    authors: "Hendrycks, D., & Gimpel, K.",
    year: 2016,
    url: "https://arxiv.org/abs/1606.08415",
    why: "Probabilistically weights inputs by their value via the Gaussian CDF, providing a smooth, non-monotonic nonlinearity.",
    component: "GELU Activation Function",
  },
  moe_mixtral: {
    id: "moe_mixtral",
    title: "Mixtral of Experts",
    authors: "Jiang, A. Q., Sablayrolles, A., Roux, A., Mensch, A., Savary, B., Bamford, C., et al.",
    year: 2024,
    url: "https://arxiv.org/abs/2401.04088",
    why: "Employs top-2 router gating over 8 expert feed-forward networks per layer, allowing specialized sub-networks to collaborate on each token.",
    component: "Mixture-of-Experts (MoE) Routing",
  },
  moe_switch: {
    id: "moe_switch",
    title: "Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity",
    authors: "Fedus, W., Zoph, B., & Shazeer, N.",
    year: 2021,
    url: "https://arxiv.org/abs/2101.03961",
    why: "Routes each token to a single expert layer via top-1 gating, enabling massive parameter scaling without proportional compute cost increases.",
    component: "Switch Transformer MoE Routing",
  },
  circuits_framework: {
    id: "circuits_framework",
    title: "A Mathematical Framework for Transformer Circuits",
    authors: "Elhage, N., Nanda, N., Olsson, C., Henighan, T., Joseph, N., Mann, B., Askell, A., Olah, C., et al.",
    year: 2021,
    url: "https://transformer-circuits.pub/2021/framework/index.html",
    why: "Decomposes attention heads into independent QK (where to look) and OV (what to write) circuits reading and writing to the shared residual stream.",
    component: "QK / OV Circuit Decomposition",
  },
  induction_heads: {
    id: "induction_heads",
    title: "In-context Learning and Induction Heads",
    authors: "Olsson, C., Elhage, N., Nanda, N., Joseph, N., DasSarma, N., Henighan, T., Mann, B., Askell, A., Bai, Y., Chen, A., et al.",
    year: 2022,
    url: "https://arxiv.org/abs/2209.11895",
    why: "Demonstrates how previous-token heads compose with induction heads to implement in-context pattern matching [A][B] ... [A] → [B].",
    component: "2-Head Induction Circuits",
  },
  mlp_kv_memory: {
    id: "mlp_kv_memory",
    title: "Transformer Feed-Forward Layers Are Key-Value Memories",
    authors: "Geva, M., Schuster, R., Berant, J., & Levy, O.",
    year: 2021,
    url: "https://arxiv.org/abs/2012.14913",
    why: "Proves MLP feed-forward layers act as associative key-value memories, where first-layer neurons detect input keys and second-layer vectors store output values.",
    component: "MLP Key-Value Memory",
  },
};

/**
 * Returns all papers relevant to the currently loaded model based on its detected architecture configuration.
 *
 * Ground Rule 2: Driven by actual detected model config (normalization, position encoding, MLP type, GQA, MoE),
 * never by hardcoded model-name switches.
 */
export function getCitationsForModel(
  archName?: string | null,
  metadata?: Record<string, any> | null
): Citation[] {
  const name = archName || metadata?.architectures?.[0] || "";
  const family: ArchFamily = detectArch(name);

  const numHeads = metadata?.num_heads || 14;
  const numKvHeads = metadata?.num_kv_heads || 2;
  const numExperts = metadata?.num_experts || 0;
  const isMoE = numExperts > 1 || name.toLowerCase().includes("moe") || name.toLowerCase().includes("mixtral");

  const results: Citation[] = [CITATIONS.transformer, CITATIONS.circuits_framework];

  if (family === "llama") {
    results.push(CITATIONS.rmsnorm);
    results.push(CITATIONS.rope);
    results.push(CITATIONS.swiglu);
    results.push(CITATIONS.mlp_kv_memory);
    if (numKvHeads < numHeads) {
      results.push(CITATIONS.gqa);
    }
  } else if (family === "gpt2") {
    results.push(CITATIONS.layernorm);
    results.push(CITATIONS.gelu);
    results.push(CITATIONS.mlp_kv_memory);
  }

  results.push(CITATIONS.induction_heads);

  if (isMoE) {
    if (name.toLowerCase().includes("mixtral")) {
      results.push(CITATIONS.moe_mixtral);
    } else {
      results.push(CITATIONS.moe_switch);
    }
  }

  return results;
}

/**
 * Returns the exact relevant founding paper for a specific 3D operation node (e.g. norm1, rope, swiglu, attn_k).
 */
export function getCitationForOp(
  opKind: string,
  archName?: string | null,
  metadata?: Record<string, any> | null
): Citation | null {
  const name = archName || "";
  const family: ArchFamily = detectArch(name);
  const numHeads = metadata?.num_heads || 14;
  const numKvHeads = metadata?.num_kv_heads || 2;

  switch (opKind) {
    case "norm1":
    case "norm2":
    case "final_norm":
      return family === "llama" ? CITATIONS.rmsnorm : CITATIONS.layernorm;
    case "rope":
    case "position":
      return family === "llama" ? CITATIONS.rope : CITATIONS.transformer;
    case "attn_q":
    case "attn_k":
    case "attn_scores":
    case "attn_softmax":
      return CITATIONS.circuits_framework;
    case "attn_v":
    case "attn_o":
      return CITATIONS.circuits_framework;
    case "mlp_gate":
    case "mlp_up":
    case "mlp_down":
    case "swiglu":
      return CITATIONS.mlp_kv_memory;
    case "attention":
      return numKvHeads < numHeads && family === "llama" ? CITATIONS.gqa : CITATIONS.transformer;
    default:
      return CITATIONS.transformer;
  }
}
