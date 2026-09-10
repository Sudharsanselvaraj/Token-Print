"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

/**
 * Quantized GGUF generation controls (issue #85).
 *
 * The backend's default path runs full-precision PyTorch. From this panel a
 * user can instead point generation at a real .gguf file on the server (or
 * upload one), which switches `/ws/generate` to run the actual quantized
 * weights through llama.cpp — closing the "GGUF is only parsed, never run"
 * honesty gap. Frames stay the same shape; the meta frame declares
 * `source: llama.cpp (GGUF quantized)` and states plainly that per-layer
 * activations are not exposed by llama.cpp (so layer lighting is simply off,
 * never invented).
 */
export default function GgufControls() {
  const ggufs = useStore((s) => s.ggufs);
  const ggufMeta = useStore((s) => s.ggufMeta);
  const activeGguf = useStore((s) => s.activeGguf);
  const refreshGgufs = useStore((s) => s.refreshGgufs);
  const uploadGguf = useStore((s) => s.uploadGguf);
  const selectGguf = useStore((s) => s.selectGguf);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshGgufs();
  }, [refreshGgufs]);

  const onFile = (f: File | null) => {
    if (f) uploadGguf(f).catch(() => {});
  };

  const quant = ggufMeta?.quant ?? ggufs.find((g) => g.path === activeGguf)?.quant;

  return (
    <div className="panel selector" style={{ marginTop: 8 }}>
      <label className="footer-note" style={{ display: "block" }}>
        Quantized backend
      </label>
      <select
        value={activeGguf ?? ""}
        onChange={(e) => selectGguf(e.target.value || null).catch(() => {})}
        style={{ width: "100%", marginTop: 4 }}
      >
        <option value="">Full-precision PyTorch</option>
        {ggufs.map((g) => (
          <option key={g.path} value={g.path}>
            {g.name} ({g.quant ?? "?"})
          </option>
        ))}
      </select>
      {!ggufs.length && (
        <div className="footer-note" style={{ marginTop: 4, opacity: 0.7 }}>
          No .gguf on the server. Upload one below, or add files to{" "}
          <code>backend/data/gguf/</code>.
        </div>
      )}
      {quant && (
        <div className="footer-note" style={{ marginTop: 6 }}>
          Generation will run the real {ggufMeta?.name ?? activeGguf} weights
          (Quant {quant}) through llama.cpp — sampled from the quantized model's
          own logits, not the PyTorch copy.
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".gguf"
        style={{ display: "none" }}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        className="secondary"
        style={{ width: "100%", marginTop: 8 }}
        onClick={() => fileRef.current?.click()}
      >
        Upload .gguf
      </button>
      <div className="footer-note" style={{ marginTop: 6, opacity: 0.75 }}>
        llama.cpp does not expose per-layer activations or per-head attention,
        so those streets stay dim during GGUF playback — the tokens and top-k
        probabilities are still the real quantized model's output.
      </div>
    </div>
  );
}