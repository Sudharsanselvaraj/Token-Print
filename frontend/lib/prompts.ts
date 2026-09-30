/** Curated example prompts for the tokenization view.
 *  Each is chosen to show a different tokenization pattern.
 *  The `note` explains what a learner should notice about the tokenization. */
export interface PresetPrompt {
  label: string;
  text: string;
  note: string;
}

export const PRESET_PROMPTS: PresetPrompt[] = [
  {
    label: "English",
    text: "The cat sat on the mat.",
    note: "English BPE — common words are single tokens. 'The' (#785) and 'the' (#279) are distinct ids because the leading space is part of the token.",
  },
  {
    label: "Tamil",
    text: "வணக்கம் உலகம்",
    note: "Tamil (non-Latin) — the tokenizer falls back to byte-level encoding, fragmenting each character into 1–3 byte tokens. Count the tokens vs the visible characters.",
  },
  {
    label: "Hindi",
    text: "नमस्ते दुनिया",
    note: "Hindi Devanagari — like Tamil, byte-fallback produces many more tokens than characters. Compare the token count with the English example.",
  },
  {
    label: "Chinese",
    text: "你好世界，今天天气真好",
    note: "Chinese (CJK) — each character typically becomes 1–2 byte-fallback tokens. The contrast with English token density is striking.",
  },
  {
    label: "Emoji",
    text: "Hello! 🎉🚀🌟😊",
    note: "Emoji — multi-byte Unicode that fragments into many byte tokens. A single emoji can be 4–8 byte-fallback tokens.",
  },
];

/** Detect byte-fallback tokens — fragments from non-Latin script tokenization. */
export function isByteFallbackToken(t: { piece?: string; id?: number; text?: string }): boolean {
  if (!t) return false;
  if (t.piece && (t.piece.startsWith("<0x") || t.piece.startsWith("<byte_") || t.piece.startsWith("byte:"))) {
    return true;
  }
  if (t.text === "�") return true;
  if (typeof t.id === "number" && t.id > 150000) return true;
  return false;
}

