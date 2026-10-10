import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_TRACES, fetchDemo } from "../../lib/demo";

test("DEMO_TRACES catalog contains valid curated traces", () => {
  assert.ok(DEMO_TRACES.length > 0, "Catalog must not be empty");

  for (const trace of DEMO_TRACES) {
    assert.ok(trace.id, "Trace must have an id");
    assert.ok(trace.title, "Trace must have a title");
    assert.ok(trace.description, "Trace must have a description");
    assert.ok(trace.model, "Trace must have a model name");
    assert.ok(trace.architecture, "Trace must have an architecture");
    assert.ok(typeof trace.tokenCount === "number" && trace.tokenCount > 0, "Trace must have a positive token count");
    assert.ok(trace.filePath.startsWith("/demo/"), "Trace filePath must be under /demo/");
    assert.ok(Array.isArray(trace.tags) && trace.tags.length > 0, "Trace must have tags");
  }
});

test("fetchDemo throws on unknown trace id", async () => {
  await assert.rejects(
    () => fetchDemo("non-existent-trace-id"),
    /Unknown demo/
  );
});
