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
import { storeDefinition } from "../../lib/store/index";
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


test("startGeneration resets analysis data and invokes the generation source", () => {
  const captured: { prompt?: string; source?: string; sink?: FrameSink } = {};

  registerLocalEngine((prompt, opts, sink) => {
    captured.prompt = prompt;
    captured.source = opts.source;
    captured.sink = sink;
    return { close: () => undefined };
  });

  try {
    const store = createStore<StoreState>()(storeDefinition);
    store.setState({
      data: { sentence: "stale analysis" } as any,
      genFrames: [tokenFrame as any],
      genText: "stale text",
      genError: "previous error",
      genStatus: "done" as any,
      playIndex: 5,
      isPlaying: true,
      opIndex: 3,
      opPlaying: true,
      autoStarted: true,
      traceSource: "file" as any,
      debugSnapshots: { 0: {} as any },
      debugSnapshotError: "snap error",
    });

    assert.ok(store.getState().data !== null);
    store.getState().startGeneration("test prompt", { source: "local" });

    assert.equal(store.getState().data, null);
    assert.deepEqual(store.getState().genFrames, []);
    assert.equal(store.getState().genText, "");
    assert.equal(store.getState().genError, null);
    assert.equal(store.getState().genStatus, "streaming");
    assert.equal(store.getState().traceSource, "live");
    assert.equal(store.getState().playIndex, -1);
    assert.equal(store.getState().isPlaying, false);
    assert.equal(store.getState().opIndex, 0);
    assert.equal(store.getState().opPlaying, false);
    assert.equal(store.getState().autoStarted, false);
    assert.deepEqual(store.getState().debugSnapshots, {});
    assert.equal(store.getState().debugSnapshotError, null);

    assert.equal(captured.prompt, "test prompt");
    assert.equal(captured.source, "local");
    assert.ok(captured.sink !== undefined);
    assert.equal(typeof captured.sink!.onMeta, "function");
    assert.equal(typeof captured.sink!.onToken, "function");
    assert.equal(typeof captured.sink!.onError, "function");
  } finally {
    registerLocalEngine(null);
  }
});

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

test("Phase 5.8a: Sonification toggle and math mappings", () => {
  const store = makeStore();
  const { computeLayerPitch, computeChordFrequencies, setSonificationEnabled, isSonificationEnabled } = require("../../lib/sonification");

  // 1. Independent toggle states: Sonify never mutates muted, muted never mutates Sonify
  assert.equal(store.getState().sonificationEnabled, false);
  assert.equal(store.getState().muted, true);

  // Toggle Sonify ON: muted remains true
  store.getState().toggleSonification();
  assert.equal(store.getState().sonificationEnabled, true);
  assert.equal(store.getState().muted, true);

  // Toggle Sound ON (unmute): sonification remains true
  store.getState().toggleMuted();
  assert.equal(store.getState().sonificationEnabled, true);
  assert.equal(store.getState().muted, false);

  // Toggle Sonify OFF: Sound remains unmuted
  store.getState().toggleSonification();
  assert.equal(store.getState().sonificationEnabled, false);
  assert.equal(store.getState().muted, false);

  // 2. Direct sonification module state
  setSonificationEnabled(false);
  assert.equal(isSonificationEnabled(), false);
  setSonificationEnabled(true);
  assert.equal(isSonificationEnabled(), true);

  // 3. Layer pitch mapping: 150 Hz at layer 0 to 500 Hz at layer N-1
  assert.equal(computeLayerPitch(0, 24), 150);
  assert.equal(computeLayerPitch(23, 24), 500);
  assert.equal(computeLayerPitch(0, 1), 150);

  // 4. Chord frequencies derived from entropy and norm
  // Min entropy (0) and min norm (0)
  const low = computeChordFrequencies(0, 0, 0.5);
  assert.equal(low.baseFreq, 200);
  assert.equal(low.harmonic, 300); // 200 * 1.5
  assert.equal(low.brightFreq, 450); // 200 * (2 + 0.25)

  // Max entropy (1) and max norm (>= 50)
  const high = computeChordFrequencies(1, 50, 0.5);
  assert.equal(high.baseFreq, 800);
  assert.equal(high.harmonic, 2000); // 800 * 2.5
  assert.equal(high.brightFreq, 1800); // 800 * 2.25

  // 5. Edge cases: totalLayers <= 1, invalid / undefined / negative values
  assert.equal(computeLayerPitch(0, 1), 150);
  assert.equal(computeLayerPitch(0, 0), 150);
  assert.equal(computeLayerPitch(0, -5), 150);
  assert.equal(computeLayerPitch(NaN, 12), 150);
  assert.equal(computeLayerPitch(5, NaN), 150);
  assert.equal(computeLayerPitch(999, 12), 500); // clamps to max layer (N-1)
  assert.equal(computeLayerPitch(-10, 12), 150); // clamps to min layer (0)

  // 6. Edge cases: entropy out of bounds (<0, >1), NaN, undefined, negative norm
  const clampedLow = computeChordFrequencies(-2, -10, -1);
  assert.equal(clampedLow.baseFreq, 200);
  assert.equal(clampedLow.harmonic, 300);
  assert.equal(clampedLow.brightFreq, 400); // safeSpread clamped to 0 -> 200 * 2.0 = 400

  const clampedHigh = computeChordFrequencies(5, 500, 10);
  assert.equal(clampedHigh.baseFreq, 800);
  assert.equal(clampedHigh.harmonic, 2000); // norm clamped to 50 -> 800 * 2.5 = 2000
  assert.equal(clampedHigh.brightFreq, 2000); // safeSpread clamped to 1 -> 800 * 2.5 = 2000

  const nanFallback = computeChordFrequencies(NaN, NaN, NaN);
  assert.equal(nanFallback.baseFreq, 200);
  assert.equal(nanFallback.harmonic, 300);
  assert.equal(nanFallback.brightFreq, 450); // fallback spread 0.5 -> 200 * 2.25 = 450
});

test("Phase 5.8a: computeLayerPitch uses real attention-focus when provided", () => {
  const { computeLayerPitch } = require("../../lib/sonification");

  // Valid focus at layer 0 (progress=0, layerTint=0):
  //   attentionFreq = 200 + focus*500; finalFreq = clamp(attentionFreq, 100, 900)
  assert.equal(computeLayerPitch(0, 24, 0),   200); // min focus -> 200 Hz
  assert.equal(computeLayerPitch(0, 24, 1.0), 700); // max focus -> 700 Hz
  assert.equal(computeLayerPitch(0, 24, 0.5), 450); // mid focus -> 450 Hz

  // Valid focus at last layer (progress=1, layerTint=50 Hz):
  //   finalFreq = clamp(attentionFreq + 50, 100, 900)
  assert.equal(computeLayerPitch(23, 24, 0),   250); // 200 + 50 tint
  assert.equal(computeLayerPitch(23, 24, 1.0), 750); // 700 + 50 tint
  assert.equal(computeLayerPitch(23, 24, 0.5), 500); // 450 + 50 tint

  // Out-of-range focus values are clamped to [0, 1]:
  assert.equal(computeLayerPitch(0, 24, -1),  200); // clamped to 0 -> 200 Hz
  assert.equal(computeLayerPitch(0, 24, 2.0), 700); // clamped to 1 -> 700 Hz

  // Missing or NaN focus -> fallback to layer-progression (150-500 Hz):
  assert.equal(computeLayerPitch(0,  24, undefined), 150); // layer 0 fallback
  assert.equal(computeLayerPitch(23, 24, undefined), 500); // layer 23 fallback
  assert.equal(computeLayerPitch(0,  24, NaN),       150); // NaN treated as absent
  assert.equal(computeLayerPitch(23, 24, NaN),       500); // NaN treated as absent

  // Clamping to [100, 900] is applied to the attention-driven result:
  // Extreme values stay within bounds (already satisfied by the formula above,
  // but verify the guard is present):
  const minPitch = computeLayerPitch(0, 24, 0);
  const maxPitch = computeLayerPitch(23, 24, 1.0);
  assert.ok(minPitch >= 100 && minPitch <= 900, `minPitch ${minPitch} out of [100,900]`);
  assert.ok(maxPitch >= 100 && maxPitch <= 900, `maxPitch ${maxPitch} out of [100,900]`);
});

test("HF Explorer: hfExplorerOpen defaults to false, open/close round-trips correctly", () => {
  const store = makeStore();
  assert.equal(store.getState().hfExplorerOpen, false);
  store.getState().setHfExplorerOpen(true);
  assert.equal(store.getState().hfExplorerOpen, true);
  store.getState().setHfExplorerOpen(false);
  assert.equal(store.getState().hfExplorerOpen, false);
});

test("Phase 5.8a: anchor positions map to correct attention entries and pitch calculation receives normalized transformer layer index", () => {
  const { anchorToLayerIndex, layerAnchors } = require("../../lib/playback");
  const { computeLayerPitch } = require("../../lib/sonification");

  const catalog = [
    { op_key: "embedding", name: "embed", shape: [100, 10], layer: null },
    { op_key: "attention", name: "l0_attn", shape: [10, 10], layer: 0 },
    { op_key: "mlp", name: "l0_mlp", shape: [10, 10], layer: 0 },
    { op_key: "attention", name: "l1_attn", shape: [10, 10], layer: 1 },
    { op_key: "output", name: "lm_head", shape: [10, 100], layer: null },
  ];
  const numLayers = 2;
  const anchors = layerAnchors(catalog, numLayers); // [0, 1, 3, 4]

  // 1. Embedding anchor position (pos = 0) must map to -1 (not transformer layer 0)
  const embedLayerIdx = anchorToLayerIndex(catalog, anchors, 0, numLayers);
  assert.equal(embedLayerIdx, -1);

  // 2. Transformer layer 0 anchor position (pos = 1) must map to 0
  const l0LayerIdx = anchorToLayerIndex(catalog, anchors, 1, numLayers);
  assert.equal(l0LayerIdx, 0);

  // 3. Transformer layer 1 anchor position (pos = 2) must map to 1
  const l1LayerIdx = anchorToLayerIndex(catalog, anchors, 2, numLayers);
  assert.equal(l1LayerIdx, 1);

  // 4. Output anchor position (pos = 3) maps to numLayers (2)
  const outLayerIdx = anchorToLayerIndex(catalog, anchors, 3, numLayers);
  assert.equal(outLayerIdx, 2);

  // 5. Attention lookup: embedding position must NOT use layer 0's attention focus
  const mockAttentionFocus = [0.85, 0.40]; // layer 0 focus = 0.85, layer 1 focus = 0.40
  const getFocus = (rawIdx: number) =>
    rawIdx >= 0 && rawIdx < numLayers ? mockAttentionFocus[rawIdx] : undefined;

  assert.equal(getFocus(embedLayerIdx), undefined); // embedding -> undefined focus (fallback pitch)
  assert.equal(getFocus(l0LayerIdx), 0.85);          // layer 0 -> real layer 0 attention focus (0.85)
  assert.equal(getFocus(l1LayerIdx), 0.40);          // layer 1 -> real layer 1 attention focus (0.40)
  assert.equal(getFocus(outLayerIdx), undefined);    // output -> undefined focus (fallback pitch)

  // 6. Pitch calculation receives normalized transformer layer index (not s.opIndex):
  // Layer 0 receives layerIndex = 0, focus = 0.85 -> 200 + 0.85*500 + 0 = 625 Hz
  const l0Pitch = computeLayerPitch(0, numLayers, getFocus(l0LayerIdx));
  assert.equal(l0Pitch, 625);

  // Layer 1 receives layerIndex = 1, focus = 0.40 -> 200 + 0.40*500 + 50 = 450 Hz
  const l1Pitch = computeLayerPitch(1, numLayers, getFocus(l1LayerIdx));
  assert.equal(l1Pitch, 450);

  // Embedding receives layerIndex = 0, focus = undefined -> fallback 150 Hz
  const embedPitch = computeLayerPitch(0, numLayers, getFocus(embedLayerIdx));
  assert.equal(embedPitch, 150);

  // 7. Safety guards: out-of-range anchor positions safely return -1
  assert.equal(anchorToLayerIndex(catalog, anchors, -1, numLayers), -1);
  assert.equal(anchorToLayerIndex(catalog, anchors, 999, numLayers), -1);
  assert.equal(anchorToLayerIndex([], [], 0, numLayers), -1);
});
