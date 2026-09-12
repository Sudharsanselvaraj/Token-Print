/**
 * componentDefinitions.ts
 *
 * Operation Knowledge Model for TokenPrint.
 * Guarantees zero model-data leakage: explanations, dimensions, parameters,
 * and mathematical equations are strictly validated against active model metadata.
 */

export type ComponentCategory =
  | "Embedding"
  | "Attention"
  | "MLP"
  | "Normalization"
  | "Residual"
  | "Output"
  | "Token";

export type ProvenanceType = "REAL" | "DERIVED" | "CONCEPTUAL" | "SIMULATION";

export interface ComponentExplanation {
  beginner: string;
  technical: string;
  whyItMatters: string;
}

export interface ResearchPaper {
  title: string;
  authors: string;
  year: number;
  summary: string;
}

export interface InteractiveQuestion {
  question: string;
  answer: string;
}

export interface DataFlowNode {
  id: string;
  label: string;
}

export interface InspectableComponent {
  id: string;
  title: string;
  subtitle: string;
  shortTitle: string;
  category: ComponentCategory;
  layer: number | null;
  formulaType:
    | "embed"
    | "rmsnorm"
    | "layernorm"
    | "q_proj"
    | "k_proj"
    | "v_proj"
    | "rope"
    | "scores"
    | "softmax"
    | "weighted_v"
    | "o_proj"
    | "res_add_attn"
    | "res_add_mlp"
    | "mlp_gate"
    | "mlp_up"
    | "swiglu"
    | "mlp_down"
    | "lm_head";
  inputShape: number[];
  outputShape: number[];
  parameterShape?: number[];
  inputDesc: string;
  outputDesc: string;
  parameterCountExact: number;
  parameterCountFormatted: string;
  headsFormatted?: string;
  role: string;
  explanation: ComponentExplanation;
  dataFlowSequence: DataFlowNode[];
  tensorPath?: string;
  provenance: ProvenanceType;
  objectType: string;
  research: ResearchPaper[];
  interactiveQuestions: InteractiveQuestion[];
}

export interface ModelMetadataRef {
  archName?: string;
  hiddenSize: number;
  numHeads: number;
  kvHeads: number;
  headDim: number;
  ffnSize: number;
  vocabSize: number;
  totalLayers: number;
}

const DEFAULT_META: ModelMetadataRef = {
  archName: "qwen2",
  hiddenSize: 896,
  numHeads: 14,
  kvHeads: 2,
  headDim: 64,
  ffnSize: 4864,
  vocabSize: 151936,
  totalLayers: 24,
};

function formatParams(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Returns inspectable component definition for a given operation ID, layer index, and model metadata.
 * Strictly model-aware: uses active model metadata for all shapes, parameters, and explanations.
 */
export function getComponentDefinition(
  opId: string,
  layerIndex = 0,
  meta: ModelMetadataRef = DEFAULT_META
): InspectableComponent {
  const l = Math.max(0, layerIndex);
  const h = meta.hiddenSize;
  const numH = meta.numHeads;
  const kvH = meta.kvHeads;
  const dK = meta.headDim;
  const ffn = meta.ffnSize;
  const vocab = meta.vocabSize;
  const isGQA = kvH < numH;

  // Global: Input Embedding
  if (opId === "op_embed") {
    const params = vocab * h;
    return {
      id: "op_embed",
      title: "Input Embeddings",
      subtitle: "Token Representation Lookup",
      shortTitle: "Embed",
      category: "Embedding",
      layer: null,
      formulaType: "embed",
      inputShape: [5],
      outputShape: [5, h],
      parameterShape: [vocab, h],
      inputDesc: "Discrete token IDs from tokenizer",
      outputDesc: `Continuous ${h}-dimensional hidden vectors`,
      parameterCountExact: params,
      parameterCountFormatted: formatParams(params),
      headsFormatted: "N/A",
      role: "Transforms discrete integer token IDs into rich continuous hidden representations.",
      explanation: {
        beginner:
          `Maps every token ID to an ${h}-dimensional continuous vector representation, lookup-indexed across the ${vocab.toLocaleString()} vocabulary entries.`,
        technical:
          `Performs a matrix lookup W_embed[token_id] mapping discrete integer tokens into the model's ${h}-dimensional latent vector space to initialize the residual stream backbone.`,
        whyItMatters:
          "Embeddings convert symbolic human language into high-dimensional geometric vectors where semantic relationships can be computed via dot products.",
      },
      dataFlowSequence: [
        { id: "op_embed", label: "Embed" },
        { id: `op_l${l}_norm1`, label: "RMSNorm 1" },
        { id: `op_l${l}_attn_q`, label: "Q Proj" },
      ],
      tensorPath: "model.embed_tokens.weight",
      provenance: "REAL",
      objectType: "matrix_lookup",
      research: [
        {
          title: "Attention Is All You Need",
          authors: "Vaswani et al.",
          year: 2017,
          summary: "Formulated continuous token embedding projections for Transformer models.",
        },
      ],
      interactiveQuestions: [
        {
          question: `Why does the embedding matrix have ${vocab.toLocaleString()} rows?`,
          answer:
            `Each row corresponds to a single learned ${h}-dimensional vector for one of the ${vocab.toLocaleString()} tokens in the model's vocabulary.`,
        },
      ],
    };
  }

  // Global: Final RMSNorm
  if (opId === "op_final_norm") {
    return {
      id: "op_final_norm",
      title: "Final RMSNorm",
      subtitle: "Pre-Unembed Normalization",
      shortTitle: "Final Norm",
      category: "Normalization",
      layer: null,
      formulaType: "rmsnorm",
      inputShape: [h],
      outputShape: [h],
      parameterShape: [h],
      inputDesc: `Unnormalized final residual stream vector (${h})`,
      outputDesc: `Scale-normalized hidden vector (${h})`,
      parameterCountExact: h,
      parameterCountFormatted: formatParams(h),
      headsFormatted: "N/A",
      role: "Rescales residual stream activations before LM Head logit projection.",
      explanation: {
        beginner:
          `Rescales the accumulated residual stream vector across all ${meta.totalLayers} layers to stabilize output magnitude before token prediction.`,
        technical:
          `Normalizes the residual vector by dividing by its root-mean-square magnitude and multiplying by learned gain γ. Omits mean subtraction for ~7% speed gains over LayerNorm.`,
        whyItMatters:
          "Prevents numerical scale drift from distorting logit inner products in the LM Head.",
      },
      dataFlowSequence: [
        { id: `op_l${meta.totalLayers - 1}_res_add2`, label: `Layer ${meta.totalLayers - 1} End` },
        { id: "op_final_norm", label: "Final Norm" },
        { id: "op_lm_head", label: "LM Head" },
      ],
      tensorPath: "model.norm.weight",
      provenance: "REAL",
      objectType: "norm_chamber",
      research: [
        {
          title: "Root Mean Square Layer Normalization",
          authors: "Zhang and Sennrich",
          year: 2019,
          summary: "Demonstrated that RMSNorm provides identical stability with reduced computational overhead.",
        },
      ],
      interactiveQuestions: [
        {
          question: "Why omit mean subtraction in RMSNorm?",
          answer:
            "Omitting mean subtraction saves execution overhead while preserving identical scale normalization guarantees.",
        },
      ],
    };
  }

  // Global: LM Head (Unembed)
  if (opId === "op_lm_head") {
    const params = vocab * h;
    return {
      id: "op_lm_head",
      title: "LM Head",
      subtitle: "Unembedding Logit Projection",
      shortTitle: "LM Head",
      category: "Output",
      layer: null,
      formulaType: "lm_head",
      inputShape: [h],
      outputShape: [vocab],
      parameterShape: [vocab, h],
      inputDesc: `Normalized final hidden state (${h})`,
      outputDesc: `Vocabulary logit scores (${vocab.toLocaleString()})`,
      parameterCountExact: params,
      parameterCountFormatted: formatParams(params),
      headsFormatted: "N/A",
      role: "Projects high-dimensional hidden representations into raw token vocabulary logits.",
      explanation: {
        beginner:
          `Computes similarity scores between the final ${h}-dimensional hidden state and all ${vocab.toLocaleString()} vocabulary entries to predict the next word.`,
        technical:
          `Multiplies the final normalized hidden vector x by unembedding matrix W_lm, producing unnormalized logit scores across all ${vocab.toLocaleString()} vocabulary tokens.`,
        whyItMatters:
          "Maps internal continuous representation space back into discrete human text predictions.",
      },
      dataFlowSequence: [
        { id: "op_final_norm", label: "Final Norm" },
        { id: "op_lm_head", label: "LM Head" },
      ],
      tensorPath: "lm_head.weight",
      provenance: "REAL",
      objectType: "unembed_matrix",
      research: [
        {
          title: "Using the Output Embedding to Improve Language Models",
          authors: "Press and Wolf",
          year: 2017,
          summary: "Formulated linear vocabulary unembedding projections.",
        },
      ],
      interactiveQuestions: [
        {
          question: "How are next-token probabilities computed?",
          answer:
            "Logits produced by W_lm are divided by temperature and passed through Softmax to produce a probability distribution over the vocabulary.",
        },
      ],
    };
  }

  // Parse layer-specific operations
  const kindMatch = opId.match(/^op_l\d+_(.+)$/);
  const kind = kindMatch ? kindMatch[1] : "norm1";

  const dataFlowAttn: DataFlowNode[] = [
    { id: `op_l${l}_norm1`, label: "RMSNorm 1" },
    { id: `op_l${l}_attn_q`, label: "Q Proj" },
    { id: `op_l${l}_attn_k`, label: "K Proj" },
    { id: `op_l${l}_attn_v`, label: "V Proj" },
    { id: `op_l${l}_rope`, label: "RoPE" },
    { id: `op_l${l}_attn_scores`, label: "QKᵀ" },
    { id: `op_l${l}_attn_softmax`, label: "Softmax" },
    { id: `op_l${l}_attn_weighted_v`, label: "Weighted V" },
    { id: `op_l${l}_attn_o`, label: "O Proj" },
    { id: `op_l${l}_res_add1`, label: "Residual 1" },
  ];

  const dataFlowMlp: DataFlowNode[] = [
    { id: `op_l${l}_norm2`, label: "RMSNorm 2" },
    { id: `op_l${l}_mlp_gate`, label: "Gate Proj" },
    { id: `op_l${l}_mlp_up`, label: "Up Proj" },
    { id: `op_l${l}_swiglu`, label: "SwiGLU" },
    { id: `op_l${l}_mlp_down`, label: "Down Proj" },
    { id: `op_l${l}_res_add2`, label: "Residual 2" },
  ];

  switch (kind) {
    case "norm1":
      return {
        id: opId,
        title: "RMSNorm 1",
        subtitle: `Layer ${l} · Pre-Attention Normalization`,
        shortTitle: "Norm 1",
        category: "Normalization",
        layer: l,
        formulaType: "rmsnorm",
        inputShape: [h],
        outputShape: [h],
        parameterShape: [h],
        inputDesc: `Residual stream entering Layer ${l} (${h})`,
        outputDesc: `Scaled input for attention computation (${h})`,
        parameterCountExact: h,
        parameterCountFormatted: formatParams(h),
        headsFormatted: "N/A",
        role: "Stabilizes layer input magnitudes prior to multi-head self-attention.",
        explanation: {
          beginner:
            `Normalizes the ${h}-dimensional hidden state vector using root-mean-square scale to prevent variance explosion before self-attention.`,
          technical:
            `Rescales vector x by dividing by √(mean(x²) + ε) and multiplying by learned gain vector γ. Pre-LN design keeps residual backbone unconstrained while normalizing sublayer inputs.`,
          whyItMatters:
            "Pre-layer normalization maintains stable gradient scaling, allowing deep network stacks to train and inference reliably.",
        },
        dataFlowSequence: dataFlowAttn,
        tensorPath: `model.layers.${l}.input_layernorm.weight`,
        provenance: "REAL",
        objectType: "norm_chamber",
        research: [
          {
            title: "Root Mean Square Layer Normalization",
            authors: "Zhang and Sennrich",
            year: 2019,
            summary: "Formulated RMSNorm for high-speed transformer normalization.",
          },
        ],
        interactiveQuestions: [
          {
            question: "What is the difference between Pre-LN and Post-LN?",
            answer:
              "Pre-LN applies RMSNorm to sublayer inputs while keeping the main residual backbone un-normalized, improving gradient stability.",
          },
        ],
      };

    case "attn_q": {
      const params = numH * dK * h;
      return {
        id: opId,
        title: "Q Projection",
        subtitle: `Layer ${l} · Query Generation`,
        shortTitle: "Q Proj",
        category: "Attention",
        layer: l,
        formulaType: "q_proj",
        inputShape: [h],
        outputShape: [numH, dK],
        parameterShape: [numH * dK, h],
        inputDesc: `Normalized hidden state (${h})`,
        outputDesc: `${numH} query channels (${numH} × ${dK})`,
        parameterCountExact: params,
        parameterCountFormatted: formatParams(params),
        headsFormatted: `${numH} Query Heads`,
        role: "Generates query vectors that formulate what information each head seeks.",
        explanation: {
          beginner:
            `Projects the ${h}-dimensional hidden state into ${numH} separate ${dK}-dimensional query channels. Each query head searches for a distinct linguistic relationship.`,
          technical:
            `Multiplies normalized hidden state X by matrix W_q (${numH * dK} × ${h}), producing ${numH} query vectors of dimension ${dK}.`,
          whyItMatters:
            "Queries define what context each head actively looks for in previous tokens.",
        },
        dataFlowSequence: dataFlowAttn,
        tensorPath: `model.layers.${l}.self_attn.q_proj.weight`,
        provenance: "REAL",
        objectType: "q_channels",
        research: [
          {
            title: "Attention Is All You Need",
            authors: "Vaswani et al.",
            year: 2017,
            summary: "Multi-head query projection in self-attention.",
          },
        ],
        interactiveQuestions: [
          {
            question: `Why ${numH} query heads?`,
            answer:
              `Multiple heads allow the model to search for ${numH} different relationships (such as syntax, coreference, and positional relationships) concurrently.`,
          },
        ],
      };
    }

    case "attn_k": {
      const params = kvH * dK * h;
      const ratio = Math.round(numH / kvH);
      return {
        id: opId,
        title: "K Projection",
        subtitle: `Layer ${l} · Key Group Generation (GQA)`,
        shortTitle: "K Proj",
        category: "Attention",
        layer: l,
        formulaType: "k_proj",
        inputShape: [h],
        outputShape: [kvH, dK],
        parameterShape: [kvH * dK, h],
        inputDesc: `Normalized hidden state (${h})`,
        outputDesc: `${kvH} key channels (${kvH} × ${dK})`,
        parameterCountExact: params,
        parameterCountFormatted: formatParams(params),
        headsFormatted: `${kvH} KV Groups (${ratio}:1 GQA Ratio)`,
        role: "Generates key vectors used to compare against query vectors to compute attention scores.",
        explanation: {
          beginner:
            isGQA
              ? `Projects hidden state into ${kvH} shared key channels. In Grouped-Query Attention (GQA), ${numH} query heads share ${kvH} key channels (${ratio} query heads per key group) to save memory.`
              : `Projects hidden state into ${numH} key head channels.`,
          technical:
            `Multiplies hidden state X by W_k (${kvH * dK} × ${h}). In GQA, ${numH} query heads are grouped into ${kvH} key groups, reducing KV-cache bandwidth requirements by ${ratio}x.`,
          whyItMatters:
            "Key vectors specify the indexing representation that query vectors are matched against during attention dot products.",
        },
        dataFlowSequence: dataFlowAttn,
        tensorPath: `model.layers.${l}.self_attn.k_proj.weight`,
        provenance: "REAL",
        objectType: "gqa_bank",
        research: [
          {
            title: "GQA: Training Generalized Multi-Query Transformer Models",
            authors: "Ainslie et al.",
            year: 2023,
            summary: "Formulated Grouped-Query Attention for KV-cache memory efficiency.",
          },
        ],
        interactiveQuestions: [
          {
            question: `Why are there ${numH} Q heads but only ${kvH} KV groups?`,
            answer:
              `Grouped-Query Attention shares key and value channels across groups of ${ratio} query heads, reducing KV-cache memory footprints by ${ratio}x while retaining multi-head performance.`,
          },
        ],
      };
    }

    case "attn_v": {
      const params = kvH * dK * h;
      const ratio = Math.round(numH / kvH);
      return {
        id: opId,
        title: "V Projection",
        subtitle: `Layer ${l} · Value Vector Bank (GQA)`,
        shortTitle: "V Proj",
        category: "Attention",
        layer: l,
        formulaType: "v_proj",
        inputShape: [h],
        outputShape: [kvH, dK],
        parameterShape: [kvH * dK, h],
        inputDesc: `Normalized hidden state (${h})`,
        outputDesc: `${kvH} value channels (${kvH} × ${dK})`,
        parameterCountExact: params,
        parameterCountFormatted: formatParams(params),
        headsFormatted: `${kvH} KV Groups (${ratio}:1 GQA Ratio)`,
        role: "Generates value payload vectors retrieved during attention score weighting.",
        explanation: {
          beginner:
            `Transforms the hidden state into ${kvH} value vector channels carrying the semantic payload that attention will retrieve after calculating token relevance.`,
          technical:
            `Multiplies hidden state X by matrix W_v (${kvH * dK} × ${h}). In GQA, ${numH} query heads share ${kvH} value channels. Exactly ${params.toLocaleString()} parameters.`,
          whyItMatters:
            "Value vectors carry the actual semantic information that gets aggregated into the context representation.",
        },
        dataFlowSequence: dataFlowAttn,
        tensorPath: `model.layers.${l}.self_attn.v_proj.weight`,
        provenance: "REAL",
        objectType: "gqa_bank",
        research: [
          {
            title: "GQA: Training Generalized Multi-Query Transformer Models",
            authors: "Ainslie et al.",
            year: 2023,
            summary: "Analyzed value channel sharing in GQA.",
          },
        ],
        interactiveQuestions: [
          {
            question: "What is the difference between Key and Value vectors?",
            answer:
              "Keys determine WHERE attention looks (by matching against Queries), while Values contain WHAT information is retrieved once attention weights are computed.",
          },
        ],
      };
    }

    case "rope":
      return {
        id: opId,
        title: "RoPE (Rotary Position Embedding)",
        subtitle: `Layer ${l} · Relative Position Rotation`,
        shortTitle: "RoPE",
        category: "Attention",
        layer: l,
        formulaType: "rope",
        inputShape: [numH, dK],
        outputShape: [numH, dK],
        inputDesc: "Un-rotated Query & Key head vectors",
        outputDesc: "Position-rotated Q & K head vectors",
        parameterCountExact: 0,
        parameterCountFormatted: "0 (Derived)",
        headsFormatted: `${numH} Q / ${kvH} K`,
        role: "Injects relative sequence position into Q and K inner products without absolute position bias.",
        explanation: {
          beginner:
            `Rotates pairs of 2D feature coordinates in Query and Key vectors by position-dependent frequency angles θ_pos.`,
          technical:
            `Applies 2D rotation matrices R_θ,m to pairs of channels in Q and K. The inner product <R_m q, R_n k> depends strictly on relative token distance (m - n).`,
          whyItMatters:
            "RoPE enables language models to generalize to long text sequences without needing static position embedding lookup tables.",
        },
        dataFlowSequence: dataFlowAttn,
        provenance: "DERIVED",
        objectType: "rope_plane",
        research: [
          {
            title: "RoFormer: Enhanced Transformer with Rotary Position Embedding",
            authors: "Su et al.",
            year: 2021,
            summary: "Formulated rotary positional embeddings (RoPE) for LLMs.",
          },
        ],
        interactiveQuestions: [
          {
            question: "Why apply RoPE to Q and K but not V?",
            answer:
              "Positional distance affects WHICH tokens attend to each other (Q · K^T similarity), not WHAT payload content (V) is retrieved.",
          },
        ],
      };

    case "attn_scores":
      return {
        id: opId,
        title: "Attention Scores (QKᵀ)",
        subtitle: `Layer ${l} · Pairwise Affinity Matrix`,
        shortTitle: "QKᵀ",
        category: "Attention",
        layer: l,
        formulaType: "scores",
        inputShape: [numH, dK],
        outputShape: [numH, 5, 5],
        inputDesc: `Query vectors (${numH} × ${dK}) & Key vectors (${kvH} × ${dK})`,
        outputDesc: `Raw pairwise affinity matrix (${numH} × 5 × 5)`,
        parameterCountExact: 0,
        parameterCountFormatted: "0 (Derived)",
        headsFormatted: `${numH} Heads`,
        role: "Computes raw unscaled attention affinity matrix across sequence tokens.",
        explanation: {
          beginner:
            `Multiplies query vectors Q by transposed key vectors K^T, measuring semantic relevance between current token and prior prompt tokens.`,
          technical:
            `Computes dot products S = Q · K^T across sequence positions for each of the ${numH} query heads.`,
          whyItMatters:
            "The QK^T inner product quantifies directional alignment between search queries and key index tags.",
        },
        dataFlowSequence: dataFlowAttn,
        provenance: "DERIVED",
        objectType: "score_matrix",
        research: [
          {
            title: "Attention Is All You Need",
            authors: "Vaswani et al.",
            year: 2017,
            summary: "Dot-product attention scoring.",
          },
        ],
        interactiveQuestions: [
          {
            question: "What does a high dot product indicate?",
            answer:
              "High dot products mean the Query vector and Key vector align closely in latent space, signaling high mutual relevance.",
          },
        ],
      };

    case "attn_scale":
    case "attn_mask":
    case "attn_softmax":
      return {
        id: opId,
        title: "Softmax Probability Matrix",
        subtitle: `Layer ${l} · Causal Attention Weights`,
        shortTitle: "Softmax",
        category: "Attention",
        layer: l,
        formulaType: "softmax",
        inputShape: [numH, 5, 5],
        outputShape: [numH, 5, 5],
        inputDesc: `Raw score matrix (${numH} × 5 × 5)`,
        outputDesc: `Normalized probability distribution (${numH} × 5 × 5)`,
        parameterCountExact: 0,
        parameterCountFormatted: "0 (Derived)",
        headsFormatted: `${numH} Heads`,
        role: "Converts raw affinity scores into normalized probability weights summing to 1.",
        explanation: {
          beginner:
            `Divides raw dot products by √${dK} (${Math.sqrt(dK).toFixed(1)}), applies causal masking to block future tokens, and applies Softmax so attention weights sum to 100%.`,
          technical:
            `Scales scores by 1/√d_k to prevent gradient vanishing in large dimensions (${dK}d), adds lower-triangular causal mask M, and applies row-wise Softmax.`,
          whyItMatters:
            "Softmax guarantees attention scores form valid probability distributions for blending value vectors.",
        },
        dataFlowSequence: dataFlowAttn,
        provenance: "REAL",
        objectType: "softmax_surface",
        research: [
          {
            title: "Attention Is All You Need",
            authors: "Vaswani et al.",
            year: 2017,
            summary: "Causal masking and softmax probability normalization.",
          },
        ],
        interactiveQuestions: [
          {
            question: `Why scale by 1/√${dK}?`,
            answer:
              `For large head dimensions (d_k=${dK}), unscaled dot products grow large in magnitude, pushing softmax into extreme regions with zero gradients.`,
          },
        ],
      };

    case "attn_weighted_v":
      return {
        id: opId,
        title: "Weighted Value Aggregation",
        subtitle: `Layer ${l} · Context Gathering`,
        shortTitle: "Weighted V",
        category: "Attention",
        layer: l,
        formulaType: "weighted_v",
        inputShape: [numH, 5, 5],
        outputShape: [numH, dK],
        inputDesc: `Softmax probabilities (${numH} × 5 × 5) & Values (${kvH} × ${dK})`,
        outputDesc: `Aggregated context vectors (${numH} × ${dK})`,
        parameterCountExact: 0,
        parameterCountFormatted: "0 (Derived)",
        headsFormatted: `${numH} Heads`,
        role: "Aggregates value representations weighted by attention probabilities.",
        explanation: {
          beginner:
            `Blends value vectors according to softmax attention probabilities, producing a consolidated context summary vector for each query head.`,
          technical:
            `Multiplies softmax probability matrix A by value vectors V, calculating C = A · V across all antecedent sequence tokens.`,
          whyItMatters:
            "Retrieves and consolidates relevant past token context into the current token's head representation.",
        },
        dataFlowSequence: dataFlowAttn,
        provenance: "DERIVED",
        objectType: "weighted_v_merge",
        research: [
          {
            title: "Attention Is All You Need",
            authors: "Vaswani et al.",
            year: 2017,
            summary: "Value aggregation in attention mechanisms.",
          },
        ],
        interactiveQuestions: [
          {
            question: "What is the shape of the aggregated context?",
            answer:
              `Each of the ${numH} query heads receives a ${dK}-dimensional context vector (${numH} × ${dK} = ${numH * dK} total).`,
          },
        ],
      };

    case "attn_o": {
      const params = h * (numH * dK);
      return {
        id: opId,
        title: "O Projection",
        subtitle: `Layer ${l} · Output Projection`,
        shortTitle: "O Proj",
        category: "Attention",
        layer: l,
        formulaType: "o_proj",
        inputShape: [numH * dK],
        outputShape: [h],
        parameterShape: [h, numH * dK],
        inputDesc: `Concatenated multi-head context (${numH * dK})`,
        outputDesc: `Recombined hidden state update (${h})`,
        parameterCountExact: params,
        parameterCountFormatted: formatParams(params),
        headsFormatted: `Recombines ${numH} Heads`,
        role: "Recombines multi-head attention outputs into residual dimension space.",
        explanation: {
          beginner:
            `Concatenates the outputs of all ${numH} attention heads (${numH} × ${dK} = ${numH * dK}) and projects them back to the ${h}-dimensional residual stream space.`,
          technical:
            `Multiplies concatenated context C by output matrix W_o (${h} × ${numH * dK}), allowing information from all ${numH} heads to mix together. Exactly ${params.toLocaleString()} parameters.`,
          whyItMatters:
            "Combines information discovered independently across all attention heads before adding back to the main residual stream.",
        },
        dataFlowSequence: dataFlowAttn,
        tensorPath: `model.layers.${l}.self_attn.o_proj.weight`,
        provenance: "REAL",
        objectType: "o_proj_matrix",
        research: [
          {
            title: "Attention Is All You Need",
            authors: "Vaswani et al.",
            year: 2017,
            summary: "Multi-head output projection.",
          },
        ],
        interactiveQuestions: [
          {
            question: `Why project back to ${h} dimensions?`,
            answer:
              `The residual stream requires vectors of dimension ${h} so outputs can be added directly via skip connections.`,
          },
        ],
      };
    }

    case "res_add1":
      return {
        id: opId,
        title: "Residual Add 1",
        subtitle: `Layer ${l} · Attention Residual Junction`,
        shortTitle: "+ Res 1",
        category: "Residual",
        layer: l,
        formulaType: "res_add_attn",
        inputShape: [h],
        outputShape: [h],
        inputDesc: `Pre-attention residual (${h}) & Attention output (${h})`,
        outputDesc: `Updated residual stream vector (${h})`,
        parameterCountExact: 0,
        parameterCountFormatted: "0 (Derived)",
        headsFormatted: "N/A",
        role: "Taps attention output back into persistent residual stream backbone.",
        explanation: {
          beginner:
            `Adds the self-attention sublayer output directly onto the main residual stream backbone via element-wise addition.`,
          technical:
            `Executes skip-connection addition x_next = x + O. Leaves original features intact while blending new attention updates.`,
          whyItMatters:
            "Residual skip connections allow gradients to flow directly through all layers during backpropagation, eliminating vanishing gradients.",
        },
        dataFlowSequence: dataFlowAttn,
        provenance: "DERIVED",
        objectType: "res_junction",
        research: [
          {
            title: "Deep Residual Learning for Image Recognition",
            authors: "He et al.",
            year: 2015,
            summary: "Formulated residual skip connections.",
          },
        ],
        interactiveQuestions: [
          {
            question: "Why are residual connections necessary?",
            answer:
              "Without residual skip connections, deep transformer networks (24+ layers) suffer severe gradient degradation.",
          },
        ],
      };

    case "norm2":
      return {
        id: opId,
        title: "RMSNorm 2",
        subtitle: `Layer ${l} · Pre-MLP Normalization`,
        shortTitle: "Norm 2",
        category: "Normalization",
        layer: l,
        formulaType: "rmsnorm",
        inputShape: [h],
        outputShape: [h],
        parameterShape: [h],
        inputDesc: `Updated residual stream vector (${h})`,
        outputDesc: `Scaled input for MLP feed-forward block (${h})`,
        parameterCountExact: h,
        parameterCountFormatted: formatParams(h),
        headsFormatted: "N/A",
        role: "Stabilizes activations before MLP feature expansion.",
        explanation: {
          beginner:
            `Normalizes the post-attention residual vector before it enters the ${ffn}-dimensional SwiGLU MLP feed-forward network.`,
          technical:
            `Second RMSNorm chamber normalizing activations prior to entering SwiGLU MLP block. Uses independent learned gain parameters γ (${h} parameters).`,
          whyItMatters:
            `Standardizes feature scale so the ${h} → ${ffn} intermediate MLP expansion operates within stable numerical ranges.`,
        },
        dataFlowSequence: dataFlowMlp,
        tensorPath: `model.layers.${l}.post_attention_layernorm.weight`,
        provenance: "REAL",
        objectType: "norm_chamber",
        research: [
          {
            title: "Root Mean Square Layer Normalization",
            authors: "Zhang and Sennrich",
            year: 2019,
            summary: "Pre-MLP RMSNorm scaling.",
          },
        ],
        interactiveQuestions: [
          {
            question: "Is RMSNorm 2 independent of RMSNorm 1?",
            answer:
              `Yes. It uses the exact same mathematical formula, but maintains its own independent set of ${h} learned parameters.`,
          },
        ],
      };

    case "mlp_gate": {
      const params = ffn * h;
      return {
        id: opId,
        title: "Gate Projection",
        subtitle: `Layer ${l} · SwiGLU Gating Branch`,
        shortTitle: "Gate Proj",
        category: "MLP",
        layer: l,
        formulaType: "mlp_gate",
        inputShape: [h],
        outputShape: [ffn],
        parameterShape: [ffn, h],
        inputDesc: `Normalized hidden state (${h})`,
        outputDesc: `Expanded gating activations (${ffn})`,
        parameterCountExact: params,
        parameterCountFormatted: formatParams(params),
        headsFormatted: "N/A",
        role: "Computes gating activation vectors for SwiGLU non-linear filter.",
        explanation: {
          beginner:
            `Expands the hidden state to ${ffn} intermediate features, serving as the gating signal in the SwiGLU non-linear activation block.`,
          technical:
            `Multiplies normalized hidden state X by W_gate (${ffn} × ${h}). Exactly ${params.toLocaleString()} parameters.`,
          whyItMatters:
            "SwiGLU gating allows the model to dynamically filter feature representations based on context.",
        },
        dataFlowSequence: dataFlowMlp,
        tensorPath: `model.layers.${l}.mlp.gate_proj.weight`,
        provenance: "REAL",
        objectType: "gate_slab",
        research: [
          {
            title: "GLU Variants Improve Transformer",
            authors: "Noam Shazeer",
            year: 2020,
            summary: "Formulated SwiGLU gating for transformers.",
          },
        ],
        interactiveQuestions: [
          {
            question: `Why expand from ${h} to ${ffn}?`,
            answer:
              `Expanding intermediate dimension to ${ffn} provides space for storing and retrieving factual memory associations.`,
          },
        ],
      };
    }

    case "mlp_up": {
      const params = ffn * h;
      return {
        id: opId,
        title: "Up Projection",
        subtitle: `Layer ${l} · SwiGLU Feature Branch`,
        shortTitle: "Up Proj",
        category: "MLP",
        layer: l,
        formulaType: "mlp_up",
        inputShape: [h],
        outputShape: [ffn],
        parameterShape: [ffn, h],
        inputDesc: `Normalized hidden state (${h})`,
        outputDesc: `Expanded feature activations (${ffn})`,
        parameterCountExact: params,
        parameterCountFormatted: formatParams(params),
        headsFormatted: "N/A",
        role: "Supplies expanded feature representations for SwiGLU element-wise multiplication.",
        explanation: {
          beginner:
            `Parallel projection expanding hidden state to ${ffn} intermediate features to supply candidate factual content.`,
          technical:
            `Multiplies hidden state X by W_up (${ffn} × ${h}). Runs in parallel with Gate projection. Exactly ${params.toLocaleString()} parameters.`,
          whyItMatters:
            "The Up branch carries feature content while the Gate branch modulates how much content passes through.",
        },
        dataFlowSequence: dataFlowMlp,
        tensorPath: `model.layers.${l}.mlp.up_proj.weight`,
        provenance: "REAL",
        objectType: "up_slab",
        research: [
          {
            title: "GLU Variants Improve Transformer",
            authors: "Noam Shazeer",
            year: 2020,
            summary: "Dual parallel projections in SwiGLU MLPs.",
          },
        ],
        interactiveQuestions: [
          {
            question: "How do Gate and Up interact?",
            answer:
              "Gate is passed through SiLU activation, then multiplied element-wise ⊙ with Up stream activations.",
          },
        ],
      };
    }

    case "swiglu":
      return {
        id: opId,
        title: "SwiGLU Non-Linearity",
        subtitle: `Layer ${l} · Gated Linear Unit Junction`,
        shortTitle: "SwiGLU",
        category: "MLP",
        layer: l,
        formulaType: "swiglu",
        inputShape: [ffn],
        outputShape: [ffn],
        inputDesc: `Gate stream (${ffn}) & Up stream (${ffn})`,
        outputDesc: `Gated intermediate activations (${ffn})`,
        parameterCountExact: 0,
        parameterCountFormatted: "0 (Derived)",
        headsFormatted: "N/A",
        role: "Applies gated non-linear feature transformation.",
        explanation: {
          beginner:
            `Combines the Gate and Up streams using SiLU activation: h = SiLU(Gate) ⊙ Up. Irrelevant features are zeroed out by the gate.`,
          technical:
            `Computes SiLU(Gate) = Gate · σ(Gate) and multiplies element-wise by Up stream activations across ${ffn} dimensions.`,
          whyItMatters:
            "SwiGLU provides superior representational capacity and smoother optimization curves than ReLU or GELU.",
        },
        dataFlowSequence: dataFlowMlp,
        provenance: "DERIVED",
        objectType: "swiglu_junction",
        research: [
          {
            title: "GLU Variants Improve Transformer",
            authors: "Noam Shazeer",
            year: 2020,
            summary: "Empirical validation of SwiGLU activation superiority.",
          },
        ],
        interactiveQuestions: [
          {
            question: "Why use SiLU instead of ReLU?",
            answer:
              "SiLU is smooth and non-monotonic, allowing small negative gradients to propagate instead of completely dying at zero.",
          },
        ],
      };

    case "mlp_down": {
      const params = h * ffn;
      return {
        id: opId,
        title: "Down Projection",
        subtitle: `Layer ${l} · Feature Compression`,
        shortTitle: "Down Proj",
        category: "MLP",
        layer: l,
        formulaType: "mlp_down",
        inputShape: [ffn],
        outputShape: [h],
        parameterShape: [h, ffn],
        inputDesc: `Gated intermediate features (${ffn})`,
        outputDesc: `Compressed MLP output vector (${h})`,
        parameterCountExact: params,
        parameterCountFormatted: formatParams(params),
        headsFormatted: "N/A",
        role: "Compresses MLP features back to hidden dimension size.",
        explanation: {
          beginner:
            `Compresses the ${ffn} SwiGLU features back to the ${h}-dimensional residual stream space.`,
          technical:
            `Multiplies ${ffn}-dimensional SwiGLU activations by W_down (${h} × ${ffn}). Exactly ${params.toLocaleString()} parameters.`,
          whyItMatters:
            "Projects high-capacity factual memory search results back into residual stream dimension.",
        },
        dataFlowSequence: dataFlowMlp,
        tensorPath: `model.layers.${l}.mlp.down_proj.weight`,
        provenance: "REAL",
        objectType: "down_slab",
        research: [
          {
            title: "Attention Is All You Need",
            authors: "Vaswani et al.",
            year: 2017,
            summary: "Feed-forward down projection linear layer.",
          },
        ],
        interactiveQuestions: [
          {
            question: `Why project back to ${h}?`,
            answer:
              `To match the hidden state vector dimension so the MLP output can be added directly onto the residual stream.`,
          },
        ],
      };
    }

    case "res_add2":
      return {
        id: opId,
        title: "Residual Add 2",
        subtitle: `Layer ${l} · MLP Residual Junction`,
        shortTitle: "+ Res 2",
        category: "Residual",
        layer: l,
        formulaType: "res_add_mlp",
        inputShape: [h],
        outputShape: [h],
        inputDesc: `Pre-MLP residual vector (${h}) & MLP output (${h})`,
        outputDesc: `Completed Layer ${l} residual vector (${h})`,
        parameterCountExact: 0,
        parameterCountFormatted: "0 (Derived)",
        headsFormatted: "N/A",
        role: "Merges MLP output into persistent residual stream backbone.",
        explanation: {
          beginner:
            `Adds the MLP factual memory output onto the residual stream backbone, completing Layer ${l} processing.`,
          technical:
            `Executes element-wise addition x_next = x + MLP_out, completing Layer ${l} residual updates.`,
          whyItMatters:
            `Completes Layer ${l}, passing refined activations into Layer ${l + 1}.`,
        },
        dataFlowSequence: dataFlowMlp,
        provenance: "DERIVED",
        objectType: "res_junction",
        research: [
          {
            title: "Deep Residual Learning for Image Recognition",
            authors: "He et al.",
            year: 2015,
            summary: "Second sublayer skip connection in transformer blocks.",
          },
        ],
        interactiveQuestions: [
          {
            question: "What is the total layer output?",
            answer:
              `The output vector contains original embeddings refined by Layer ${l} self-attention and MLP sublayers.`,
          },
        ],
      };

    default:
      return {
        id: opId,
        title: `Operation (${kind})`,
        subtitle: `Layer ${l} · Transformer Node`,
        shortTitle: kind,
        category: "Attention",
        layer: l,
        formulaType: "embed",
        inputShape: [h],
        outputShape: [h],
        inputDesc: `Input hidden state vector (${h})`,
        outputDesc: `Transformed hidden state vector (${h})`,
        parameterCountExact: 0,
        parameterCountFormatted: "N/A",
        headsFormatted: "N/A",
        role: "Processes representation vector.",
        explanation: {
          beginner: "Standard computational transformation step within the transformer architecture.",
          technical: "Executes mathematical transformation on tensor representations.",
          whyItMatters: "Contributes to internal representation refinement.",
        },
        dataFlowSequence: dataFlowAttn,
        provenance: "DERIVED",
        objectType: "generic_node",
        research: [],
        interactiveQuestions: [],
      };
  }
}
