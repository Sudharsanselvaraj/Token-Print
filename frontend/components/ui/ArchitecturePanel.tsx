"use client";

import { useStore } from "@/lib/store";
import { fmtBytes, fmtCount } from "@/lib/format";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="astat">
      <div className="astat-label">{label}</div>
      <div className="astat-value">{value ?? "—"}</div>
    </div>
  );
}

export default function ArchitecturePanel() {
  const arch = useStore((s) => s.arch);
  const m = arch?.metadata;
  if (!m) return null;

  return (
    <div className="side-section">
      <div className="side-title">Architecture</div>
      <div className="astat-grid">
        <Stat label="Architecture" value={m.architecture} />
        <Stat
          label={arch?.source === "gguf" ? "Quantization" : "Precision"}
          value={m.quantization ?? m.torch_dtype}
        />
        <Stat label="Parameters" value={fmtCount(m.total_params)} />
        <Stat
          label={arch?.source === "gguf" ? "File Size" : "Tensors"}
          value={
            m.file_size != null ? fmtBytes(m.file_size) : arch?.tensor_count
          }
        />
        <Stat label="Layers" value={m.num_layers} />
        <Stat label="Context" value={fmtCount(m.context_length)} />
        <Stat label="Embedding" value={fmtCount(m.hidden_size)} />
        <Stat label="FFN Size" value={fmtCount(m.ffn_size)} />
        <Stat label="Attn Heads" value={m.num_heads} />
        <Stat label="KV Heads" value={m.num_kv_heads} />
        <Stat label="Head Dim" value={m.head_dim} />
        <Stat label="Vocab Size" value={fmtCount(m.vocab_size)} />
        {m.expert_count != null && (
          <>
            <Stat label="Experts" value={m.expert_count} />
            <Stat label="Active Experts" value={m.expert_used_count} />
          </>
        )}
        {m.rope_theta != null && (
          <Stat label="RoPE Base" value={fmtCount(m.rope_theta)} />
        )}
        {m.gguf_version != null && (
          <Stat label="GGUF Version" value={`v${m.gguf_version}`} />
        )}
        <Stat
          label="Model Type"
          value={m.expert_count ? "MoE" : `Dense${m.num_kv_heads < m.num_heads ? " (GQA)" : ""}`}
        />
      </div>
    </div>
  );
}
