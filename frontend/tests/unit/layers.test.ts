import assert from "node:assert/strict";
import test from "node:test";
import {
  SCENE_OVERLAY_Z,
  MODAL_BACKDROP_Z,
  MODAL_CONTENT_Z,
  MODAL_POPOVER_Z,
} from "../../lib/layers";

// The global layering contract (mirrors :root vars in app/globals.css).
// Scene DOM overlays (drei <Html> labels) must always sit below the modal
// root, and modal-scoped layers must stay strictly ordered.

test("scene overlays stay strictly below the modal backdrop", () => {
  assert.ok(SCENE_OVERLAY_Z < MODAL_BACKDROP_Z);
});

test("modal layers are strictly ordered top to bottom", () => {
  assert.ok(MODAL_POPOVER_Z > MODAL_CONTENT_Z);
  assert.ok(MODAL_CONTENT_Z > MODAL_BACKDROP_Z);
});

test("constants mirror the CSS custom properties", () => {
  // If these drift from globals.css the layering contract silently breaks,
  // so the numeric values are pinned here deliberately.
  assert.equal(SCENE_OVERLAY_Z, 100);
  assert.equal(MODAL_BACKDROP_Z, 1000);
  assert.equal(MODAL_CONTENT_Z, 1100);
  assert.equal(MODAL_POPOVER_Z, 1200);
});