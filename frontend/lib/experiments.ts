import { create } from "zustand";
import { API_URL } from "./api";
import { validateTrace, MAX_TRACE_BYTES } from "./traceValidation";
import { localSource, wsSource } from "./generation";
import type { GenOptions } from "./ws";
import type { Trace, TokenFrame, GenMeta } from "./types";

export interface Experiment {
  version: 1;
  created_at: string;
  kind: "generation" | "patch" | "ablation";
  model: {
    id: string;
    revision: string | null;
    runtime: string | null;
    device: string;
  };
  input: {
    prompt: string;
    options?: GenOptions;
    source_sentence?: string;
    patch_layers?: number[];
    zero_heads?: Record<string, number[]>;
    zero_layers?: number[];
  };
  results: unknown;
  trace?: Trace;
}
export interface ExperimentFile {
  experiment: Experiment;
  sha256: string;
}
export const useExperiments = create<{ items: Experiment[] }>(() => ({
  items: [],
}));
export function rememberExperiment(experiment: Experiment) {
  useExperiments.setState((s) => ({
    items: [experiment, ...s.items].slice(0, 10),
  }));
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export async function checksum(value: unknown) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonical(value)),
      ),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function downloadJSON(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportExperiment(experiment: Experiment) {
  downloadJSON(
    { experiment, sha256: await checksum(experiment) },
    `tokenprint-${experiment.kind}.experiment.json`,
  );
}
export async function importExperiment(file: File): Promise<Experiment> {
  if (file.size > MAX_TRACE_BYTES)
    throw new Error("Experiment exceeds the 32 MB import limit.");
  const bundle = JSON.parse(await file.text()) as ExperimentFile;
  if (
    !bundle.experiment ||
    (await checksum(bundle.experiment)) !== bundle.sha256
  )
    throw new Error(
      "Integrity check failed: experiment contents do not match the SHA-256 checksum.",
    );
  const e = bundle.experiment;
  if (
    e.version !== 1 ||
    !["generation", "patch", "ablation"].includes(e.kind) ||
    typeof e.input?.prompt !== "string" ||
    typeof e.model?.id !== "string" ||
    !e.results
  )
    throw new Error("Unsupported or incomplete experiment format.");
  if (e.trace) validateTrace(e.trace);
  if (e.kind === "generation") {
    if (
      !e.trace ||
      !Array.isArray(e.results) ||
      !compareNumbers(e.results, e.trace.frames, 0)
    )
      throw new Error(
        "Generation experiment must include matching replay frames and results.",
      );
    const options = e.input.options;
    if (
      !options ||
      !Number.isInteger(options.maxNewTokens) ||
      options.maxNewTokens! < 1 ||
      options.maxNewTokens! > 256 ||
      !["greedy", "sampling", "sliding_window", "speculative"].includes(
        options.decodingMode ?? "",
      )
    )
      throw new Error("Invalid generation settings in experiment.");
  }
  if (
    e.kind === "patch" &&
    (!e.input.source_sentence ||
      !Array.isArray(e.input.patch_layers) ||
      e.input.patch_layers.some(
        (l) => !Number.isInteger(l) || l < 0 || l > 511,
      ))
  )
    throw new Error("Invalid activation patch parameters.");
  return e;
}
export function generationExperiment(trace: Trace): Experiment {
  const m = trace.meta;
  if (!m.prompt)
    throw new Error(
      "This older trace did not record its exact input prompt. Record a new generation to export a reproducible experiment.",
    );
  return {
    version: 1,
    created_at: new Date().toISOString(),
    kind: "generation",
    model: {
      id: m.model,
      revision: m.model_revision ?? null,
      runtime: m.runtime_version ?? null,
      device: m.device,
    },
    input: {
      prompt: m.prompt,
      options: {
        source: m.source === "browser" ? "local" : "ws",
        browserDevice: m.device === "webgpu" ? "webgpu" : "wasm",
        maxNewTokens: m.max_new_tokens,
        topK: m.top_k,
        decodingMode: m.decoding as GenOptions["decodingMode"],
        temperature: m.decoding_params?.temperature,
        topP: m.decoding_params?.top_p,
        seed: m.decoding_params?.seed ?? undefined,
        windowSize: m.decoding_params?.window_size,
        draftGamma: m.decoding_params?.draft_gamma,
        needle: m.decoding_params?.needle ?? undefined,
        trace: true,
      },
    },
    results: trace.frames,
    trace,
  };
}
export async function captureIntervention(
  kind: "patch" | "ablation",
  input: Experiment["input"],
  results: unknown,
  modelInfo: {
    model: string;
    model_revision?: string;
    runtime_version?: string;
    device: string;
  },
) {
  const e: Experiment = {
    version: 1,
    created_at: new Date().toISOString(),
    kind,
    model: {
      id: modelInfo.model,
      revision: modelInfo.model_revision ?? null,
      runtime: modelInfo.runtime_version ?? null,
      device: modelInfo.device,
    },
    input,
    results,
  };
  rememberExperiment(e);
}
export async function backendIdentity() {
  const r = await fetch(`${API_URL}/model-info`);
  if (!r.ok)
    throw new Error(
      `Backend identity unavailable (${r.status}). Start the supported launcher.`,
    );
  return r.json();
}
/** Compare measured outputs, excluding timings and environment-dependent metadata. */
export function compareNumbers(
  expected: unknown,
  actual: unknown,
  tolerance = 1e-4,
): boolean {
  if (typeof expected === "number")
    return (
      typeof actual === "number" &&
      Number.isFinite(actual) &&
      Math.abs(expected - actual) <= tolerance + tolerance * Math.abs(expected)
    );
  if (Array.isArray(expected))
    return (
      Array.isArray(actual) &&
      expected.length === actual.length &&
      expected.every((x, i) => compareNumbers(x, actual[i], tolerance))
    );
  if (expected && typeof expected === "object")
    return (
      !!actual &&
      typeof actual === "object" &&
      Object.entries(expected).every(([k, v]) => {
        const observed = (actual as Record<string, unknown>)[k];
        // IDs and positions are categorical: tolerance applies only to measurements.
        if (["id", "token_id", "step", "layer", "index"].includes(k))
          return v === observed;
        return compareNumbers(v, observed, tolerance);
      })
    );
  return expected === actual;
}
export async function verifyExperiment(
  e: Experiment,
  signal?: AbortSignal,
): Promise<string> {
  if (!e.model.revision || !/^[a-f0-9]{40}$/i.test(e.model.revision))
    throw new Error(
      "Unverifiable model revision. Re-record this experiment with a backend that reports the resolved commit.",
    );
  const identityMatches = (m: {
    model: string;
    model_revision?: string | null;
  }) => m.model === e.model.id && m.model_revision === e.model.revision;
  if (e.kind === "generation") {
    if (
      e.input.options?.decodingMode === "sampling" &&
      e.input.options.seed === undefined
    )
      throw new Error(
        "Sampling verification requires a recorded seed. Re-run with a fixed seed.",
      );
    const frames = await new Promise<TokenFrame[]>((resolve, reject) => {
      const collected: TokenFrame[] = [];
      let handle: ReturnType<typeof wsSource> | undefined;
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abort);
        handle?.close();
        error ? reject(error) : resolve(collected);
      };
      const abort = () => finish(new Error("Verification cancelled."));
      const timeout = setTimeout(
        () => finish(new Error("Verification timed out after five minutes.")),
        300000,
      );
      signal?.addEventListener("abort", abort, { once: true });
      const source =
        e.input.options?.source === "local" ? localSource : wsSource;
      handle = source(e.input.prompt, e.input.options ?? {}, {
        onMeta: (m: GenMeta) => {
          if (!identityMatches(m))
            finish(
              new Error(
                "Model or revision mismatch. Load the exact recorded model revision first.",
              ),
            );
        },
        onToken: (f) => collected.push(f),
        onDone: () => finish(),
        onError: (message) => finish(new Error(message)),
        onClose: () => {
          if (!settled)
            finish(
              new Error("Connection closed before verification completed."),
            );
        },
      });
    });
    const observed = (xs: TokenFrame[]) =>
      xs.map((f) => ({ chosen: f.chosen, topk: f.topk }));
    if (!compareNumbers(observed(e.results as TokenFrame[]), observed(frames)))
      throw new Error(
        "Verification mismatch: token IDs differ or measured logits/probabilities exceed relative/absolute tolerance 1e-4.",
      );
  } else {
    const identity = await backendIdentity();
    if (!identityMatches(identity))
      throw new Error(
        "Model or revision mismatch. Restart with TOKENPRINT_MODEL and TOKENPRINT_REVISION from this experiment.",
      );
    const body =
      e.kind === "patch"
        ? {
            sentence: e.input.prompt,
            source_sentence: e.input.source_sentence,
            patch_layers: e.input.patch_layers,
          }
        : {
            sentence: e.input.prompt,
            zero_heads: e.input.zero_heads,
            zero_layers: e.input.zero_layers,
          };
    const response = await fetch(
      `${API_URL}/${e.kind === "patch" ? "patch" : "ablate"}/analyze`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      },
    );
    if (!response.ok)
      throw new Error(`Verification request failed (${response.status}).`);
    const result = await response.json();
    const expected = e.results as {
      logit_lens?: unknown;
      ablated?: { logit_lens?: unknown };
    };
    const lens = expected.ablated?.logit_lens ?? expected.logit_lens;
    if (!lens) throw new Error("The saved result has no logit lens to verify.");
    if (!compareNumbers(lens, result.logit_lens))
      throw new Error(
        "Verification mismatch: layer predictions differ (relative/absolute tolerance 1e-4).",
      );
  }
  return "Verified: model revision and token IDs match exactly; measured predictions match within tolerance 1e-4. Timings may vary by hardware.";
}
