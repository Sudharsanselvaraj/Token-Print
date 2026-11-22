import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCallout from "@/components/docs/DocsCallout";
import DocsCompatibilityMatrix from "@/components/docs/DocsCompatibilityMatrix";

export const metadata: Metadata = {
  title: "Model Compatibility Matrix",
  description: "Evidence-based verification matrix of model architectures and candidate checkpoints in TokenPrint.",
};

export default function CompatibilityMatrixPage() {
  return (
    <>
      <p className="docs-meta">Model Ecosystem</p>
      <h1>Model Compatibility Matrix</h1>
      <p className="docs-intro">
        TokenPrint enforces an evidence-first verification doctrine. No model family is marked as supported without demonstrable adapter logic, tensor extraction proofs, and runtime validation.
      </p>

      <DocsCallout variant="tip" title="Primary Production Checkpoint">
        <strong>Qwen/Qwen2.5-0.5B-Instruct</strong> is the resident checkpoint deployed on the public Hugging Face Space. All 24 layers of attention, 2 KV cache groups (GQA), logit lens, and activation interventions are fully operational in production.
      </DocsCallout>

      <DocsCompatibilityMatrix />

      <h2 id="verification-stages">Verification Stages Explained</h2>
      <p>
        Every model listed in the TokenPrint registry (defined in <code>backend/app/inference/compatibility_registry.py</code>) passes through six progressive verification gates:
      </p>

      <ul>
        <li>
          <strong>Architecture Recognized</strong>: The model config (e.g. <code>qwen2</code>, <code>llama</code>, <code>gemma2</code>) matches a registered adapter class in <code>backend/app/inference/adapters/</code>.
        </li>
        <li>
          <strong>Model Loaded</strong>: Safetensors weights, config parameters, and the Hugging Face tokenizer instantiate cleanly in system RAM without tensor shape mismatches.
        </li>
        <li>
          <strong>Forward Pass Tested</strong>: The model generates valid output logits and completes a greedy decoding sequence without divergence or numeric instability.
        </li>
        <li>
          <strong>Attention Extraction Tested</strong>: PyTorch forward hooks successfully intercept and serialize multi-head attention weights (<code>QKᵀ / √d_k</code>) across all layers.
        </li>
        <li>
          <strong>Full Interpretability Tested</strong>: Logit lens layer-by-layer unembedding, self-attention head ablation, layer bypass, and causal activation patching execute correctly.
        </li>
        <li>
          <strong>Hugging Face Space Deployment Verified</strong>: Confirmed functional inside the ZeroGPU execution sandbox with automatic CPU fallback.
        </li>
      </ul>

      <h2 id="hardware-constraints">Hardware &amp; VRAM Allocation</h2>
      <p>
        When evaluating dynamic Hugging Face models via the Model Explorer, the compatibility engine calculates memory requirements using:
      </p>
      <pre><code>estimated_vram_gb = (total_parameters * bytes_per_element * 1.25) / (1024^3)</code></pre>
      <p>
        Models requiring &le; 14.0 GB VRAM are flagged as ZeroGPU-compatible candidates for single-node A10G slices. Larger models (&gt; 14.0 GB) or complex MoE architectures (e.g. DeepSeek-V3 with 671B parameters) require quantized GGUF execution or distributed clusters.
      </p>

      <DocsPrevNext slug="compatibility-matrix" />
    </>
  );
}
