"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useStore } from "@/lib/store";
import type { District } from "@/lib/types";

// Short, honest explanations of the real mechanic each district shows —
// framed as observable inference, never the model's "thinking".
const LESSONS: Record<District, { title: string; body: string[] }> = {
  tokenizer: {
    title: "Tokenization",
    body: [
      "Before a model can read text it splits the string into tokens — chunks that are often whole words but can be word-pieces, punctuation, or a leading space. Each token maps to an integer id in the model's vocabulary.",
      "Qwen uses byte-level BPE, so a leading space belongs to the token — that's why “The” (#785) and “the” (#279) are different ids. The model never sees letters, only these ids.",
    ],
  },
  embedding: {
    title: "Embeddings",
    body: [
      "Each token id is looked up in an embedding table and becomes a vector of 896 numbers. Similar tokens tend to get similar vectors, so meaning starts to live in geometry — directions and distances in a high-dimensional space.",
      "We can't draw 896 dimensions, so PCA projects them onto the 3 axes of greatest variation. It's a faithful shadow, not the real space — distances are approximate. Scrub the layer slider to watch a token's vector move as the transformer contextualizes it.",
    ],
  },
  attention: {
    title: "Attention & softmax",
    body: [
      "In each layer, every token looks back at earlier tokens and decides how much to draw from each. A head scores the current token against each previous one, then softmax turns those scores into weights that sum to 1 — a distribution over where to attend.",
      "Each beam is one real weight: brighter/thicker means this head, in this layer, attends more strongly from one token back to another. Heads specialize — some track nearby words, some fixate on the first token (an “attention sink”).",
    ],
  },
  generation: {
    title: "Logits, softmax & generation",
    body: [
      "To choose the next token the model turns its final hidden state into one score (a logit) per vocabulary entry, and softmax converts those to probabilities. The bars are the real top-10 — height is probability; the gold bar is the argmax that greedy decoding picks.",
      "The glowing stack is the mean activation magnitude at each layer for this step — real numbers streamed from the model. The chosen token is fed back in and the loop repeats. Playback replays these recorded steps exactly.",
    ],
  },
};

export default function InfoOverlay() {
  const district = useStore((s) => s.currentDistrict);
  const [open, setOpen] = useState(false);
  const lesson = LESSONS[district];

  return (
    <div className="info-overlay">
      <button className="chip-btn info-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? "✕ Close" : "ⓘ What am I looking at?"}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="info-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="info-title">{lesson.title}</div>
            {lesson.body.map((p, i) => (
              <p key={i} className="info-body">
                {p}
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
