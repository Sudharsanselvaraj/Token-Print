import assert from "node:assert/strict";
import test from "node:test";
import { normalizeModeParam } from "../../lib/routeMode";

// Route identity tests: the URL's ?mode= value must map onto exactly one
// canonical workspace Mode, and anything missing/unknown/legacy must land on
// "explorer" — never Generation or another workspace (route-isolation rule).

test("normalizes every canonical mode value", () => {
  assert.equal(normalizeModeParam("explorer"), "explorer");
  assert.equal(normalizeModeParam("generation"), "generation");
  assert.equal(normalizeModeParam("walkthrough"), "walkthrough");
  assert.equal(normalizeModeParam("debugger"), "debugger");
});

test("maps the legacy architecture alias to explorer", () => {
  assert.equal(normalizeModeParam("architecture"), "explorer");
  // Case and surrounding whitespace are tolerated.
  assert.equal(normalizeModeParam("Architecture"), "explorer");
  assert.equal(normalizeModeParam(" GENERATION "), "generation");
});

test("a missing mode value defaults to explorer", () => {
  assert.equal(normalizeModeParam(null), "explorer");
  assert.equal(normalizeModeParam(undefined), "explorer");
  assert.equal(normalizeModeParam(""), "explorer");
});

test("unknown or invalid mode values fall back to explorer, NEVER generation", () => {
  assert.equal(normalizeModeParam("bogus"), "explorer");
  assert.equal(normalizeModeParam("mode"), "explorer");
  assert.equal(normalizeModeParam("walker"), "explorer");
  assert.equal(normalizeModeParam("123"), "explorer");
  assert.equal(normalizeModeParam("generation "), "generation");
});