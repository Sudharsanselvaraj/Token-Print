"use client";

import { useStore } from "@/lib/store";
import SentenceInput from "./SentenceInput";
import LayerHeadSelector from "./LayerHeadSelector";
import EmbeddingControls from "./EmbeddingControls";
import GenerationControls from "./GenerationControls";
import PlaybackControls from "./PlaybackControls";
import DistrictNav from "./DistrictNav";
import SettingsBar from "./SettingsBar";
import InfoOverlay from "./InfoOverlay";

const TITLES: Record<string, string> = {
  tokenizer: "Tokenizer District",
  embedding: "Embedding District",
  attention: "Attention District",
  generation: "Generation District",
};

const SUBTITLES: Record<string, string> = {
  tokenizer:
    "The raw sentence split into the model's actual tokens. Each chip is one token id from the tokenizer.",
  embedding:
    "Each token placed by a PCA projection of its real hidden state. Scrub layers to watch the geometry change.",
  attention:
    "Every beam is a real softmax attention weight from a single forward pass. Move the sliders to walk layers and heads.",
  generation:
    "Watch the model generate token by token. Layer slabs glow with real activation magnitude; bars are the real top-k probabilities.",
};

export default function Hud() {
  const data = useStore((s) => s.data);
  const district = useStore((s) => s.currentDistrict);
  const layer = useStore((s) => s.selectedLayer);
  const head = useStore((s) => s.selectedHead);
  const embLayer = useStore((s) => s.embeddingLayer);

  return (
    <div className="hud">
      {/* Top: title + sentence input + district nav */}
      <div className="top-row">
        <div className="panel" style={{ flex: 1, minWidth: 340, maxWidth: 560 }}>
          <div className="brand">
            Neuro<span className="dot">Scope</span> — {TITLES[district]}
          </div>
          <div className="subtitle">{SUBTITLES[district]}</div>
          {district !== "generation" && <SentenceInput />}
          <InfoOverlay />
        </div>
        <div className="top-right">
          <DistrictNav />
          <SettingsBar />
        </div>
      </div>

      {/* Bottom: district-specific controls (left) + status/honesty (right) */}
      <div className="bottom-row">
        <div className="controls-col">
          {district === "attention" && <LayerHeadSelector />}
          {district === "embedding" && <EmbeddingControls />}
          {district === "generation" && (
            <>
              <GenerationControls />
              <PlaybackControls />
            </>
          )}
          {district === "tokenizer" && (
            <div className="panel selector">
              <div className="status">
                {data ? `${data.tokens.length} tokens` : "…"}
              </div>
              <div className="footer-note" style={{ marginTop: 4 }}>
                These are the tokenizer&apos;s real subword tokens (byte-level
                BPE). A leading space shows as part of the token; <code>#</code>{" "}
                is the vocabulary id.
              </div>
            </div>
          )}
        </div>

        <div className="panel" style={{ maxWidth: 540 }}>
          {data ? (
            <div className="status">
              {data.model} · {data.device}
              {district !== "generation" && ` · ${data.tokens.length} tokens`}
              {district === "attention" &&
                ` · layer ${layer}/${data.num_layers - 1} · head ${head}/${data.num_heads - 1}`}
              {district === "embedding" &&
                ` · ${embLayer === 0 ? "embeddings" : `layer ${embLayer}`}`}
              {district === "generation" && " · greedy stream"}
            </div>
          ) : (
            <div className="status">Loading model…</div>
          )}
          <div className="footer-note" style={{ marginTop: 8 }}>
            <strong>This is real inference data, not a simulation.</strong>{" "}
            {district === "attention" &&
              "Each beam from token i to token j is how much a given head attends from i back to j."}
            {district === "embedding" &&
              "Positions are a PCA projection of real hidden-state vectors — a faithful but approximate view of high-dimensional geometry."}
            {district === "tokenizer" &&
              "Nothing here is invented — these are exactly the tokens the model reads."}
            {district === "generation" &&
              "Each step's bar heights are the model's real next-token probabilities; the layer glow is real activation magnitude. Playback replays recorded steps."}{" "}
            It shows observable inference mechanics — not the model&apos;s
            &ldquo;thinking.&rdquo;
          </div>
        </div>
      </div>
    </div>
  );
}
