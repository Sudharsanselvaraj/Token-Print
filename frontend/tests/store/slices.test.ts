import assert from "node:assert/strict";
import test from "node:test";
import { createStore } from "zustand/vanilla";
import { dispatchRawFrame, localSource, registerLocalEngine } from "../../lib/generation";
import type { FrameSink } from "../../lib/generation";
import { createArchitectureSlice } from "../../lib/store/architectureSlice";
import { createArch3dSlice } from "../../lib/store/arch3dSlice";
import { createFrameSink } from "../../lib/store/generationSink";
import { createGenerationSlice } from "../../lib/store/generationSlice";
import { createTraceSlice } from "../../lib/store/traceSlice";
import type { StoreState } from "../../lib/store/types";
import { createUISlice } from "../../lib/store/uiSlice";
import { PRESET_PROMPTS, isByteFallbackToken } from "../../lib/prompts";
import { CHAPTERS } from "../../lib/walkthrough";
import type { AnalyzeResponse, GenDone, GenMeta, TokenFrame } from "../../lib/types";

function makeStore() {
  return createStore<StoreState>()((set, get, api) => ({
    ...createArchitectureSlice(set, get, api),
    ...createArch3dSlice(set, get, api),
    ...createGenerationSlice(set, get, api),
    ...createTraceSlice(set, get, api),
    ...createUISlice(set, get, api),
    loadGgufFile: async () => undefined,
    startGeneration: () => undefined,
    stopGeneration: () => undefined,
    loadTrace: async () => undefined,
    classroomStep: () => undefined,
  }));
}

test("architecture slice updates explorer controls", () => {
  const store = makeStore();
  store.getState().setPointBudget(42);
  store.getState().setTileView(true);
  store.getState().setSelectedTensor("layers.0.attn_q.weight");
  assert.equal(store.getState().pointBudget, 42);
  assert.equal(store.getState().tileView, true);
  assert.equal(store.getState().selectedTensor, "layers.0.attn_q.weight");
});

test("generation slice clamps playback settings", () => {
  const store = makeStore();
  store.getState().setPlaySpeed(99);
  store.getState().toggleFollow();
  assert.equal(store.getState().playSpeed, 4);
  assert.equal(store.getState().followMode, false);
});

test("trace slice keeps breakpoint updates immutable and bounds LOD", () => {
  const store = makeStore();
  const firstBreakpoints = store.getState().breakpoints;
  store.getState().toggleBreakpoint(4);
  store.getState().setLodLevel(9);
  assert.notEqual(store.getState().breakpoints, firstBreakpoints);
  assert.equal(store.getState().breakpoints.has(4), true);
  assert.equal(store.getState().lodLevel, 2);
});

test("trace slice marks a throwing watch expression with the clean error marker", () => {
  const store = makeStore();
  store.getState().addWatch("sum", "1 + 2");
  store.getState().addWatch("boom", "totallyUndefinedName");
  store.getState().evalWatches();
  assert.equal(store.getState().watches[0].value, 3);
  assert.equal(store.getState().watches[1].value, "‹error›");
});

test("UI slice clamps brightness and stops walkthrough autoplay on chapter selection", () => {
  const store = makeStore();
  store.getState().toggleWtPlay();
  store.getState().setWtChapter(3);
  store.getState().setBrightness(-2);
  assert.equal(store.getState().wtChapter, 3);
  assert.equal(store.getState().wtPlaying, false);
  assert.equal(store.getState().brightness, 0.3);
});

test("route isolation: navMode changes never mutate the active mode", () => {
  const store = makeStore();
  store.getState().setMode("debugger");
  store.getState().setNavMode("FOLLOW");
  assert.equal(store.getState().mode, "debugger");
  store.getState().setNavMode("OVERVIEW");
  assert.equal(store.getState().mode, "debugger");

  store.getState().setMode("generation");
  store.getState().setNavMode("MANUAL");
  assert.equal(store.getState().mode, "generation");
});

test("route isolation: setMode is the only store-level mode writer", () => {
  const store = makeStore();
  store.getState().setMode("walkthrough");
  assert.equal(store.getState().mode, "walkthrough");
  store.getState().setMode("explorer");
  assert.equal(store.getState().mode, "explorer");
});

// ─── Phase 5.2a (#311): frame-producer seam ────────────────────────────────

function sinkSpy() {
  const calls: string[] = [];
  const sink: FrameSink = {
    onMeta: () => calls.push("meta"),
    onToken: () => calls.push("token"),
    onDone: () => calls.push("done"),
    onError: (m) => calls.push(`error:${m}`),
    onClose: () => calls.push("close"),
  };
  return { sink, calls };
}

const metaFrame: GenMeta = {
  model: "gpt2",
  device: "webgpu",
  architecture: "gpt2",
  num_layer_stats: 12,
  num_layers: 12,
  prompt_tokens: ["a"],
  prompt_len: 1,
  max_new_tokens: 8,
  top_k: 10,
  decoding: "greedy",
};

const tokenFrame: TokenFrame = {
  type: "token",
  step: 0,
  chosen: { id: 1, text: "b", logprob: -0.5 },
  topk: [],
  layer_stats: [],
  eos: false,
  phase: "decode",
  n_positions: 3,
  cache_len: 3,
};

const doneFrame: GenDone = {
  type: "done",
  generated_text: "b",
  total_steps: 1,
};

test("Phase 5.2a: dispatchRawFrame routes all four wire frame types to the sink", () => {
  const { sink, calls } = sinkSpy();
  dispatchRawFrame({ type: "meta", ...metaFrame }, sink);
  dispatchRawFrame(tokenFrame, sink);
  dispatchRawFrame(doneFrame, sink);
  dispatchRawFrame({ type: "error", message: "boom" }, sink);
  dispatchRawFrame({ type: "unknown-type" }, sink);
  assert.deepEqual(calls, ["meta", "token", "done", "error:boom"]);
});

test("Phase 5.2a: localSource reports honestly until an engine is registered", () => {
  registerLocalEngine(null);
  const { sink, calls } = sinkSpy();
  const handle = localSource("hi", {}, sink);
  assert.equal(calls.includes("meta"), false);
  assert.equal(calls.some((c) => c.startsWith("error:")), true);
  handle.close();
});

test("Phase 5.2a: registered local engine streams frames through the seam", () => {
  let closed = false;
  registerLocalEngine(() => {
    return {
      close: () => {
        closed = true;
      },
    };
  });
  const { sink, calls } = sinkSpy();
  const handle = localSource("hi", {}, sink);
  sink.onMeta(metaFrame);
  sink.onToken(tokenFrame);
  sink.onDone(doneFrame);
  handle.close();
  assert.deepEqual(calls, ["meta", "token", "done"]);
  assert.equal(closed, true);
  registerLocalEngine(null);
});

test("Phase 5.2a: createFrameSink transitions the store from raw frames", () => {
  const store = makeStore();
  const api = { set: store.setState, get: store.getState };
  // Drive the store's `set` through the same FrameSink build startGeneration uses.
  const sink = createFrameSink(api.set);
  sink.onMeta(metaFrame);
  assert.equal(store.getState().genMeta?.model, "gpt2");
  sink.onToken(tokenFrame);
  assert.equal(store.getState().genFrames.length, 1);
  assert.equal(store.getState().playIndex, 0);
  sink.onDone(doneFrame);
  assert.equal(store.getState().genStatus, "done");
  assert.equal(store.getState().genText, "b");
});

test("Phase 5.2a: error frame while streaming flips status to error", () => {
  const store = makeStore();
  const api = { set: store.setState, get: store.getState };
  const sink = createFrameSink(api.set);
  store.getState().setAutoStarted(true);
  sink.onError("connection error");
  assert.equal(store.getState().genStatus, "error");
  assert.equal(store.getState().genError, "connection error");
});

// ─── Phase 4.1 (#293): Non-Latin tokenization view ─────────────────────────

test("Phase 4.1: isByteFallbackToken identifies byte-fallback pieces and high IDs", () => {
  assert.equal(isByteFallbackToken({ piece: "<0xE0>", id: 100, text: "" }), true);
  assert.equal(isByteFallbackToken({ piece: "<0xA4>", id: 101, text: "" }), true);
  assert.equal(isByteFallbackToken({ piece: "<byte_0x89>", id: 102, text: "" }), true);
  assert.equal(isByteFallbackToken({ piece: "byte:224", id: 103, text: "" }), true);
  assert.equal(isByteFallbackToken({ piece: "word", id: 151000, text: "word" }), true);
  assert.equal(isByteFallbackToken({ piece: "word", id: 100, text: "�" }), true);
  assert.equal(isByteFallbackToken({ piece: "The", id: 785, text: "The" }), false);
  assert.equal(isByteFallbackToken({ piece: "Ġcat", id: 3797, text: " cat" }), false);
});

test("Phase 4.1: PRESET_PROMPTS contains non-Latin scripts (Hindi, Tamil, CJK)", () => {
  const labels = PRESET_PROMPTS.map((p) => p.label);
  assert.ok(labels.includes("Tamil"), "contains Tamil prompt");
  assert.ok(labels.includes("Hindi"), "contains Hindi prompt");
  assert.ok(labels.includes("Chinese"), "contains Chinese prompt");
  assert.ok(labels.includes("English"), "contains English prompt");

  for (const p of PRESET_PROMPTS) {
    assert.ok(p.text.length > 0, `${p.label} text should not be empty`);
    assert.ok(p.note.length > 0, `${p.label} note should not be empty`);
  }
});

test("Phase 4.1: Walkthrough tokenizer chapter reports byte-fallback dimensions when present", () => {
  const tokChapter = CHAPTERS.find((c) => c.id === "tokenizer");
  assert.ok(tokChapter, "tokenizer chapter exists");

  const mockNonLatinData: AnalyzeResponse = {
    sentence: "नमस्ते",
    tokens: [
      { index: 0, id: 151200, piece: "<0xE0>", text: "", is_special: false },
      { index: 1, id: 151201, piece: "<0xA4>", text: "", is_special: false },
      { index: 2, id: 151202, piece: "<0xA8>", text: "", is_special: false },
    ],
    hidden_states_3d: {},
    embeddings_3d: [],
    embedding_norms: [],
    attention: [],
    projection: null,
    logit_lens: [],
    device: "cpu",
    model: "Qwen2.5-0.5B",
    num_layers: 24,
    num_heads: 14,
    hidden_size: 896,
  };

  const meta = {
    hidden_size: 896,
    num_heads: 14,
    num_kv_heads: 2,
    head_dim: 64,
    ffn_size: 4864,
    vocab_size: 151936,
    num_layers: 24,
  };

  const inspector = tokChapter!.inspector(mockNonLatinData, meta);
  assert.equal(inspector.dimensions["Tokens"], "3");
  assert.equal(inspector.dimensions["Byte-fallback"], "3 tokens");
});
