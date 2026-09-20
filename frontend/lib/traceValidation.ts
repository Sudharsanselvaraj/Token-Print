import type { Trace } from "./types";

export const MAX_TRACE_BYTES = 32 * 1024 * 1024;
/** Validate at the import boundary, including recorded demos and experiments. */
export function validateTrace(value: unknown): Trace {
  const t = value as Trace;
  if (
    !t ||
    t.trace_version !== 1 ||
    !t.meta ||
    typeof t.meta.model !== "string" ||
    !Number.isInteger(t.meta.num_layers) ||
    t.meta.num_layers < 1 ||
    t.meta.num_layers > 512 ||
    !Array.isArray(t.meta.prompt_tokens) ||
    !Array.isArray(t.frames) ||
    !t.frames.length ||
    t.frames.length > 4096
  ) {
    throw new Error(
      "Invalid trace: expected version 1, model metadata and 1–4096 token frames.",
    );
  }
  for (const frame of t.frames) {
    if (
      !frame ||
      frame.type !== "token" ||
      !Number.isInteger(frame.chosen?.id) ||
      typeof frame.chosen?.text !== "string" ||
      !Number.isFinite(frame.chosen?.logprob) ||
      !Array.isArray(frame.topk) ||
      frame.topk.length > 256 ||
      frame.topk.some(
        (p) =>
          !p ||
          typeof p.text !== "string" ||
          !Number.isFinite(p.logit) ||
          !Number.isInteger(p.id) ||
          !Number.isFinite(p.prob) ||
          p.prob < 0 ||
          p.prob > 1,
      ) ||
      !Array.isArray(frame.layer_stats) ||
      frame.layer_stats.some((v) => !Number.isFinite(v))
    ) {
      throw new Error(
        "Invalid trace: malformed token probabilities or layer statistics.",
      );
    }
  }
  if (
    t.architecture_data &&
    (!t.architecture_data.metadata ||
      !Array.isArray(t.architecture_data.tensors) ||
      t.architecture_data.tensors.some(
        (x) => !x || typeof x.name !== "string" || !Array.isArray(x.shape),
      ))
  )
    throw new Error("Invalid trace: malformed architecture data.");
  if (
    t.analysis &&
    (typeof t.analysis.sentence !== "string" ||
      !Array.isArray(t.analysis.tokens) ||
      !Array.isArray(t.analysis.attention))
  )
    throw new Error("Invalid trace: malformed captured analysis.");
  if (
    t.meta.op_catalog &&
    (!Array.isArray(t.meta.op_catalog) ||
      t.meta.op_catalog.some(
        (op) =>
          !op || typeof op.op_key !== "string" || typeof op.label !== "string",
      ))
  )
    throw new Error("Invalid trace: malformed operation catalog.");
  return t;
}
