"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";

const GLOSSARY: Record<string, string> = {
  "logit": "Raw score for a token before softmax. Higher logit → higher probability.",
  "softmax": "Normalizes logits into probabilities that sum to 1.",
  "embedding": "A dense vector representing a token's meaning, learned during training.",
  "attention": "Mechanism that lets each token 'look at' all other tokens in the sequence.",
  "MLP": "Multi-Layer Perceptron — the feed-forward network in each transformer block.",
  "residual": "The stream that carries information straight through all layers, with each block adding its output back to it.",
  "KV cache": "Stores Key and Value projections from previous tokens so they don't need recomputation.",
  "layer norm": "Normalizes activations to have stable mean/variance before each sub-layer.",
  "logit lens": "Technique that projects each layer's hidden state through the output head to see what the model predicts at that depth.",
  "GQA": "Grouped Query Attention — multiple query heads share the same key/value heads for efficiency.",
  "FFN": "Feed-Forward Network — another name for the MLP block.",
  "head": "One attention computation unit. Each head computes attention over a portion of the hidden dimension.",
  "causal mask": "Prevents tokens from attending to future tokens during generation.",
  "temperature": "Controls randomness: lower → sharper distribution, higher → more uniform.",
  "top-p": "Nucleus sampling: only sample from the smallest set of tokens whose cumulative probability exceeds p.",
};

export default function WhyExplainer() {
  const frame = useStore((s) => {
    const i = s.playIndex;
    return i >= 0 && i < s.genFrames.length ? s.genFrames[i] : null;
  });
  const meta = useStore((s) => s.genMeta);
  const catalog = meta?.op_catalog ?? [];
  const opIndex = useStore((s) => s.opIndex);
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null);

  const explanation = useMemo(() => {
    if (!frame) return null;
    const topCand = frame.topk?.[0];
    const chosen = frame.chosen;

    const parts: { key: string; text: string; terms: string[] }[] = [];

    // Layer that produced the top prediction
    const activeOp = catalog[opIndex];
    if (activeOp) {
      const terms: string[] = [];
      let text = "";
      if (activeOp.op_key.startsWith("attn")) {
        text = `The attention layer combined information from all tokens. Each head computed a weighted sum of value vectors, then projected the result back to the residual stream.`;
        terms.push("attention", "head", "residual");
      } else if (activeOp.op_key.startsWith("mlp")) {
        text = `The MLP layer applied a non-linear transformation to the residual stream. This expanded the dimensionality, applied a gate, then projected back.`;
        terms.push("MLP", "residual");
      } else if (activeOp.op_key === "norm") {
        text = `Layer normalization stabilized the activations before the sub-layer, ensuring consistent magnitudes for the attention/MLP computation.`;
        terms.push("layer norm");
      } else if (activeOp.op_key === "embedding") {
        text = `The embedding layer converted the input token IDs into dense vectors that capture semantic meaning.`;
        terms.push("embedding");
      } else if (activeOp.op_key === "output") {
        text = `The output projection (lm_head) converted the final residual stream into logits — raw scores for every token in the vocabulary.`;
        terms.push("logit", "softmax");
      }
      if (text) parts.push({ key: "op", text, terms });
    }

    // Logit lens progression
    if (meta?.num_layers && meta.num_layers > 1) {
      parts.push({
        key: "lens",
        text: `At early layers (0–${Math.floor(meta.num_layers / 3)}), the model's prediction is uncertain. By layer ${meta.num_layers - 1}, the ${chosen.text.trim() ? `prediction "${chosen.text}"` : "final token"} has emerged as the most likely.`,
        terms: ["logit lens"],
      });
    }

    // Top-k distribution
    if (frame.topk && frame.topk.length > 1) {
      const runnerUp = frame.topk[1];
      const diff = Math.abs(topCand!.prob - runnerUp.prob);
      parts.push({
        key: "dist",
        text: `The model chose "${chosen.text}" with ${(topCand!.prob * 100).toFixed(1)}% probability. The next best was "${runnerUp.text}" at ${(runnerUp.prob * 100).toFixed(1)}% (margin: ${(diff * 100).toFixed(1)}pp).`,
        terms: ["softmax"],
      });
    }

    return parts;
  }, [frame, meta, catalog, opIndex]);

  if (!explanation) {
    return (
      <div className="why-explainer">
        <div className="we-title">Why this token?</div>
        <div className="we-empty">Step through a generation to see what drove each prediction.</div>
      </div>
    );
  }

  return (
    <div className="why-explainer">
      <div className="we-title">
        Why &ldquo;{frame?.chosen.text.replace(/\n/g, "⏎") || "?"}&rdquo;?
      </div>
      <div className="we-steps">
        {explanation.map((part) => (
          <div key={part.key} className="we-step">
            <div className="we-step-text">
              {part.terms.length > 0
                ? part.text.split(/(\b(?:logit lens|attention|MLP|residual|head|softmax|embedding|layer norm|logit)\b)/gi).map((seg, i) => {
                    const lower = seg.toLowerCase().trim();
                    const gTerm = Object.keys(GLOSSARY).find((k) => lower === k || lower === k.toLowerCase().replace(/-/g, " "));
                    if (gTerm) {
                      return (
                        <span
                          key={i}
                          className="we-glossary-term"
                          onMouseEnter={() => setHoveredTerm(gTerm)}
                          onMouseLeave={() => setHoveredTerm(null)}
                        >
                          {seg}
                          {hoveredTerm === gTerm && (
                            <span className="we-glossary-tip">{GLOSSARY[gTerm]}</span>
                          )}
                        </span>
                      );
                    }
                    return <span key={i}>{seg}</span>;
                  })
                : part.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
