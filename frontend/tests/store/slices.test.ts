import assert from "node:assert/strict";
import test from "node:test";
import { createStore } from "zustand/vanilla";
import { createArchitectureSlice } from "../../lib/store/architectureSlice";
import { createGenerationSlice } from "../../lib/store/generationSlice";
import { createTraceSlice } from "../../lib/store/traceSlice";
import type { StoreState } from "../../lib/store/types";
import { createUISlice } from "../../lib/store/uiSlice";

function makeStore() {
  return createStore<StoreState>()((set, get, api) => ({
    ...createArchitectureSlice(set, get, api),
    ...createGenerationSlice(set, get, api),
    ...createTraceSlice(set, get, api),
    ...createUISlice(set, get, api),
    loadGgufFile: async () => undefined,
    startGeneration: () => undefined,
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

test("UI slice clamps brightness and stops walkthrough autoplay on chapter selection", () => {
  const store = makeStore();
  store.getState().toggleWtPlay();
  store.getState().setWtChapter(3);
  store.getState().setBrightness(-2);
  assert.equal(store.getState().wtChapter, 3);
  assert.equal(store.getState().wtPlaying, false);
  assert.equal(store.getState().brightness, 0.3);
});
