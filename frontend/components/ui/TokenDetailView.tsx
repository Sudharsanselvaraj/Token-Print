"use client";

import { useStore } from "@/lib/store";
import { isByteFallbackToken } from "@/lib/prompts";

export default function TokenDetailView() {
  const data = useStore((s) => s.data);

  if (!data?.tokens) return null;

  return (
    <div className="token-detail-panel">
      <div className="tdv-title">Tokenization Detail</div>
      <div className="tdv-subtitle">
        Byte-level BPE pieces for the input sentence
      </div>
      <div className="tdv-list">
        {data.tokens.map((t) => {
          const bf = isByteFallbackToken(t);
          const rawText = t.text.trim();
          const displayText = rawText && rawText !== "" && rawText !== "" ? rawText : t.piece || "(space)";
          return (
            <div key={t.index} className="tdv-row">
              <span className="tdv-idx">{t.index}</span>
              <span className="tdv-text" title={`ID: ${t.id}`}>
                {displayText}
              </span>
              <span className="tdv-piece" title="Raw tokenizer piece">
                {t.piece}
              </span>
              <span className="tdv-id">#{t.id}</span>
              {bf && (
                <span
                  className="tdv-special"
                  style={{
                    background: "rgba(245,158,11,0.15)",
                    color: "#f59e0b",
                    borderColor: "rgba(245,158,11,0.3)",
                  }}
                >
                  byte-fallback
                </span>
              )}
              {t.is_special && <span className="tdv-special">special</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

