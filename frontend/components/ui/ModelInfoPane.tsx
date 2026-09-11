"use client";

import { useStore } from "@/lib/store";

/**
 * Phase 2: Model info pane showing training details, tokenizer info,
 * context window, and other metadata not surfaced elsewhere.
 */
export default function ModelInfoPane() {
  const arch = useStore((s) => s.arch);

  if (!arch?.metadata) return null;

  const m = arch.metadata;
  const rows: [string, string][] = [
    ["Architecture", m.architecture],
    ["Vocab size", m.vocab_size.toLocaleString()],
    ["Context lens", m.context_length ? `${m.context_length.toLocaleString()} tokens` : "—"],
    ["Hidden size", m.hidden_size.toLocaleString()],
    ["Head dim", m.head_dim.toLocaleString()],
    ["FFN size", m.ffn_size ? m.ffn_size.toLocaleString() : "—"],
    ["KV heads", m.num_kv_heads.toLocaleString()],
    ["RoPE θ", m.rope_theta != null ? String(m.rope_theta) : "—"],
    ["Tie embeddings", m.tie_word_embeddings == null ? "—" : String(m.tie_word_embeddings)],
    ["Experts", m.expert_count ? `${m.expert_count}` : "—"],
    ["Quantization", m.quantization ?? m.torch_dtype ?? "—"],
    ["Source", arch.source === "model" ? `Backend (${arch.model})` : "GGUF file"],
  ];

  return (
    <div className="side-section">
      <div className="side-title">Model Info</div>
      <div className="mi-grid">
        {rows.map(([k, v]) => (
          <div key={k} className="mi-row">
            <span className="mi-label">{k}</span>
            <span className="mi-value">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
