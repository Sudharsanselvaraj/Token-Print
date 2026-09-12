import { test, expect } from "@playwright/test";
import { layerTimingView } from "../../lib/timing";
import type { TokenFrame } from "../../lib/types";

// Unit tests for the TimingReadout data selection (issue #101 / ENG-15).
// Run: npx playwright test --project=unit

function frame(overrides: Partial<TokenFrame> = {}): TokenFrame {
  return {
    type: "token",
    step: 0,
    chosen: { id: 0, text: "", logprob: 0 },
    topk: [],
    layer_stats: [],
    eos: false,
    ...overrides,
  };
}

test.describe("layerTimingView — real timings", () => {
  test("measured layer_timings_ms are reported as real ms", () => {
    const view = layerTimingView(frame({ layer_timings_ms: [2, 5, 3] }), null, 3);
    expect(view).toEqual({ kind: "real", perLayer: [2, 5, 3], total: 10, max: 5 });
  });

  test("real timings win over layer_stats when both are present", () => {
    const f = frame({ layer_timings_ms: [1.5, 2.5], layer_stats: [9, 9, 9] });
    expect(layerTimingView(f, null, 2)?.kind).toBe("real");
  });

  test("real timings don't need meta.num_layers", () => {
    expect(layerTimingView(frame({ layer_timings_ms: [4] }), null, undefined)?.kind).toBe("real");
  });

  test("bar scale floors at 1 ms so sub-ms layers aren't drawn as full bars", () => {
    const view = layerTimingView(frame({ layer_timings_ms: [0.2, 0.4] }), null, 2);
    expect(view?.max).toBe(1);
  });
});

test.describe("layerTimingView — proxy fallback", () => {
  // Real backend shape: hidden_states → num_layers + 1 stats, entry 0 = embedding.
  const stats = [7, 0.1, 0.3, 0.2];

  test("missing layer_timings_ms falls back to proxy with no total", () => {
    const view = layerTimingView(frame({ layer_stats: stats }), null, 3);
    expect(view?.kind).toBe("proxy");
    expect(view?.total).toBeNull();
  });

  test("empty layer_timings_ms also falls back to proxy", () => {
    const view = layerTimingView(frame({ layer_stats: stats, layer_timings_ms: [] }), null, 3);
    expect(view?.kind).toBe("proxy");
  });

  test("proxy drops the embedding entry so L0 is the first layer", () => {
    const view = layerTimingView(frame({ layer_stats: stats }), null, 3);
    expect(view?.perLayer).toEqual([0.1, 0.3, 0.2]);
    expect(view?.perLayer).toHaveLength(3);
  });

  test("stats already one-per-layer (bundled demo trace shape) are kept whole", () => {
    const view = layerTimingView(frame({ layer_stats: [0.1, 0.3, 0.2] }), null, 3);
    expect(view?.perLayer).toEqual([0.1, 0.3, 0.2]);
  });

  test("proxy values are the raw activation stats, not rescaled", () => {
    const view = layerTimingView(frame({ layer_stats: stats }), null, 3);
    expect(view?.max).toBe(0.3);
  });

  test("no visible frame → uses the latest recorded frame's stats", () => {
    const view = layerTimingView(null, frame({ layer_stats: stats }), 3);
    expect(view?.perLayer).toEqual([0.1, 0.3, 0.2]);
  });

  test("all-zero stats keep a positive bar scale (no NaN widths)", () => {
    const view = layerTimingView(frame({ layer_stats: [0, 0, 0] }), null, 2);
    expect(view?.max).toBeGreaterThan(0);
    expect(view!.perLayer.every((v) => Number.isFinite(v / view!.max))).toBe(true);
  });
});

test.describe("layerTimingView — nothing to show", () => {
  test("GGUF/llama.cpp frames (empty stats and timings) hide the panel", () => {
    const f = frame({ layer_stats: [], layer_timings_ms: [], source: "llama.cpp" });
    expect(layerTimingView(f, null, 24)).toBeNull();
  });

  test("no timings and no num_layers → null", () => {
    expect(layerTimingView(frame({ layer_stats: [1, 2] }), null, undefined)).toBeNull();
  });

  test("no frames at all → null", () => {
    expect(layerTimingView(null, null, 24)).toBeNull();
  });
});
