import {
  AutoTokenizer,
  AutoModelForCausalLM,
  Tensor,
  env,
} from "@huggingface/transformers";
import {
  BROWSER_MODEL,
  BROWSER_REVISION,
  BROWSER_MODEL_FILE,
  BROWSER_DTYPE,
  BROWSER_RUNTIME,
} from "./model";
import type { GenOptions } from "../ws";

env.allowLocalModels = false;
env.backends.onnx.wasm!.numThreads = 1;
let tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>;
let model: Awaited<ReturnType<typeof AutoModelForCausalLM.from_pretrained>>;
let loadedDevice = "";
function disposeOutput(value: unknown) {
  if (value instanceof Tensor) value.dispose();
  else if (value && typeof value === "object")
    Object.values(value).forEach(disposeOutput);
}
self.onmessage = async ({
  data,
}: MessageEvent<{ prompt: string; opts: GenOptions }>) => {
  try {
    const { prompt, opts } = data;
    const device = opts.browserDevice ?? "webgpu";
    if (opts.decodingMode && opts.decodingMode !== "greedy")
      throw new Error("Browser GPT-2 currently supports greedy decoding only.");
    const progress_callback = (p: {
      status: string;
      file?: string;
      progress?: number;
    }) =>
      self.postMessage({
        type: "progress",
        message:
          p.status === "done" && p.file?.endsWith(".onnx")
            ? `Preparing ${device} model session… Stop cancels this step.`
            : `${p.status}: ${p.file ?? "GPT-2"}${p.progress === undefined ? "" : ` ${Math.round(p.progress)}%`}`,
      });
    if (!model || loadedDevice !== device) {
      if (model) await model.dispose();
      tokenizer = await AutoTokenizer.from_pretrained(BROWSER_MODEL, {
        revision: BROWSER_REVISION,
        progress_callback,
      });
      model = await AutoModelForCausalLM.from_pretrained(BROWSER_MODEL, {
        revision: BROWSER_REVISION,
        device,
        dtype: BROWSER_DTYPE,
        model_file_name: BROWSER_MODEL_FILE,
        progress_callback,
      });
      loadedDevice = device;
    }
    const inputs = await tokenizer(prompt);
    const ids = Array.from(inputs.input_ids.data, (id: unknown) => Number(id));
    const max = Math.min(opts.maxNewTokens ?? 16, 32);
    if (!ids.length || ids.length + max > 128)
      throw new Error(
        "Browser demo limit: prompt plus output must fit in 128 tokens. Shorten your prompt or output.",
      );
    const cfg = model.config as unknown as {
      n_layer: number;
      n_head: number;
      n_embd: number;
      n_inner?: number;
      vocab_size: number;
      n_positions: number;
    };
    self.postMessage({
      type: "meta",
      model: BROWSER_MODEL,
      model_revision: BROWSER_REVISION,
      runtime_version: BROWSER_RUNTIME,
      prompt,
      device,
      source: "browser",
      architecture: "gpt2",
      num_layers: cfg.n_layer,
      num_layer_stats: 0,
      prompt_tokens: ids.map((id) => tokenizer.decode([id])),
      prompt_len: ids.length,
      max_new_tokens: max,
      top_k: opts.topK ?? 10,
      decoding: "greedy",
      uses_kv_cache: false,
      model_dimensions: {
        num_heads: cfg.n_head,
        num_kv_heads: cfg.n_head,
        hidden_size: cfg.n_embd,
        head_dim: cfg.n_embd / cfg.n_head,
        ffn_size: cfg.n_inner ?? cfg.n_embd * 4,
        vocab_size: cfg.vocab_size,
        context_length: cfg.n_positions,
      },
      honesty_notes: [
        "Full-precision ONNX weights; final logits only. Hidden states, attention and measured operation timings are unavailable. Full sequence recomputed each step.",
      ],
    });
    const generated: number[] = [];
    for (let step = 0; step < max; step++) {
      const input_ids = new Tensor("int64", BigInt64Array.from(ids, BigInt), [
        1,
        ids.length,
      ]);
      const attention_mask = new Tensor(
        "int64",
        BigInt64Array.from(ids, () => 1n),
        [1, ids.length],
      );
      const output = await model({ input_ids, attention_mask });
      const vocab = output.logits.dims.at(-1)!;
      const logits = Array.from(output.logits.data.slice(-vocab), Number);
      const order = logits
        .map((_, id) => id)
        .sort((a, b) => logits[b] - logits[a]);
      const peak = logits[order[0]];
      const sum = logits.reduce(
        (total, value) => total + Math.exp(value - peak),
        0,
      );
      const topk = order
        .slice(0, Math.min(opts.topK ?? 10, 50))
        .map((id) => ({
          id,
          text: tokenizer.decode([id]),
          logit: logits[id],
          prob: Math.exp(logits[id] - peak) / sum,
        }));
      const chosen = topk[0];
      const eos = chosen.id === tokenizer.eos_token_id;
      self.postMessage({
        type: "token",
        step,
        chosen: { id: chosen.id, text: chosen.text, logprob: -Math.log(sum) },
        topk,
        layer_stats: [],
        eos,
        sampled: false,
      });
      generated.push(chosen.id);
      ids.push(chosen.id);
      disposeOutput(output);
      input_ids.dispose();
      attention_mask.dispose();
      if (eos) break;
    }
    self.postMessage({
      type: "done",
      generated_text: tokenizer.decode(generated, {
        skip_special_tokens: true,
      }),
      total_steps: generated.length,
      source: "browser",
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: `Browser inference failed: ${error instanceof Error ? error.message : error}. Try the explicit CPU option, free browser memory, or use the Python backend.`,
    });
  }
};
