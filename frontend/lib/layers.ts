/**
 * Global layering contract — one hierarchy, enforced everywhere.
 *
 * Every overlay in TokenPrint resolves to one of these layers. The hard
 * invariant: the 3D scene's DOM overlays (drei <Html>) are capped at
 * SCENE_OVERLAY_Z, which always sits *below* the modal root. Nothing may
 * exceed --z-modal-backdrop unless it is itself a modal (portaled into
 * #modal-root).
 *
 * Mirrors the CSS custom properties in app/globals.css (:root):
 *   0/10    background / WebGL canvas
 *   100     scene DOM overlays (capped via SceneHtml)
 *   30      workspace UI (sidebars, inspections, playback bars)
 *   200     dropdowns / tooltips / popovers
 *   1000    modal backdrop scrim
 *   1100    modal content
 *   1200    nested popovers inside a modal
 */
export const SCENE_OVERLAY_Z = 100; // max z-index for any drei <Html> label
export const MODAL_BACKDROP_Z = 1000;
export const MODAL_CONTENT_Z = 1100;
export const MODAL_POPOVER_Z = 1200;