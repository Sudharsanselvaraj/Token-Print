"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

const SAMPLE = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=640";

/**
 * Model-family badge (issue #87). The backend can be serving a causal LM
 * (default), an encoder-only embedding model, or a vision transformer. This
 * reads /health once on mount and drives the store's `modelMode` so the rest
 * of the UI can adapt (e.g. swap sentence input for an image input).
 */
export default function ModelModeBadge() {
  const modelMode = useStore((s) => s.modelMode);
  const setModelMode = useStore((s) => s.setModelMode);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const m = await import("@/lib/api");
        const h = await m.fetchHealth();
        if (alive && h.mode) setModelMode(h.mode as typeof modelMode);
      } catch {
        /* backend unreachable — keep whatever mode we had */
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [setModelMode]);

  if (!modelMode || modelMode === "causal_lm") return null;

  const label =
    modelMode === "vision"
      ? "Vision transformer · image input"
      : "Embedding model · no text generation";

  return (
    <div
      className="footer-note"
      style={{
        marginTop: 8,
        padding: "4px 8px",
        border: "1px solid rgba(138,151,189,0.4)",
        borderRadius: 6,
        color: "#c6defa",
      }}
      title={`Backend model family: ${modelMode}`}
    >
      {label}
    </div>
  );
}

/**
 * Image analyzer for vision-transformer mode. Accepts a URL or a local image
 * file (converted to a base64 data URL) and POSTs it to /analyze/image.
 */
export function VisionAnalyzer() {
  const analyzeImage = useStore((s) => s.analyzeImage);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const [source, setSource] = useState(SAMPLE);
  const [fileName, setFileName] = useState<string | null>(null);

  const submit = () => {
    const v = source.trim();
    if (v && !loading) analyzeImage(v);
  };

  const onFile = (f: File | null) => {
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      setSource(result.startsWith("data:image/") ? result : `data:image/png;base64,${result}`);
    };
    reader.readAsDataURL(f);
  };

  return (
    <div className="panel selector" style={{ marginTop: 8 }}>
      <label className="footer-note" style={{ display: "block" }}>
        Image URL
        <input
          value={fileName ?? source}
          onChange={(e) => {
            setFileName(null);
            setSource(e.target.value);
          }}
          placeholder="https://…/image.jpg"
          spellCheck={false}
          style={{ width: "100%", marginTop: 4 }}
        />
      </label>
      <label className="footer-note" style={{ display: "block", marginTop: 8 }}>
        or upload
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          style={{ display: "block", marginTop: 4 }}
        />
      </label>
      <button className="primary" type="button" onClick={submit} disabled={loading} style={{ width: "100%", marginTop: 8 }}>
        {loading ? "Analyzing image…" : "Analyze image"}
      </button>
      {error && <div className="footer-note" style={{ color: "#ffb3a7", marginTop: 6 }}>{error}</div>}
      <div className="footer-note" style={{ marginTop: 6 }}>
        Runs one real forward pass: image → patches → per-layer hidden states,
        attention, and the [CLS] embedding — nothing simulated.
      </div>
    </div>
  );
}