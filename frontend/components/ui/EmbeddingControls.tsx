"use client";

import { useStore } from "@/lib/store";

export default function EmbeddingControls() {
  const data = useStore((s) => s.data);
  const layer = useStore((s) => s.embeddingLayer);
  const setEmbeddingLayer = useStore((s) => s.setEmbeddingLayer);

  // hidden_states_3d has entries 0..num_layers (embeddings + each layer output).
  const maxLayer = data?.num_layers ?? 24;
  const ev = data?.projection?.embedding_explained_variance ?? [];
  const evPct = ev.length ? Math.round(ev.reduce((a, b) => a + b, 0) * 100) : null;

  return (
    <div className="panel selector">
      <div className="row">
        <label>Layer</label>
        <input
          type="range"
          min={0}
          max={maxLayer}
          step={1}
          value={layer}
          disabled={!data}
          onChange={(e) => setEmbeddingLayer(Number(e.target.value))}
        />
        <span className="val">
          {layer === 0 ? "emb" : layer} / {maxLayer}
        </span>
      </div>

      <div className="footer-note" style={{ marginTop: 4 }}>
        Tokens are placed by a <strong>PCA</strong> projection of their real{" "}
        {layer === 0 ? "token embeddings" : `layer-${layer} hidden states`} into
        3D. Similar tokens tend to cluster. It&apos;s a projection, so distances
        are approximate — scrub layers to watch the geometry change.
        {evPct !== null && ` Top-3 axes capture ~${evPct}% of the variance.`}
      </div>
    </div>
  );
}
