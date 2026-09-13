import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "Understanding the Interface",
  description: "App shell layout, top bar, mode switching, and panel system.",
};

export default function UnderstandingTheInterfacePage() {
  return (
    <>
      <DocsBreadcrumb slug="understanding-the-interface" title="Understanding the Interface" />
      <h1>Understanding the Interface</h1>
      <p className="docs-meta">Getting Started</p>

      <p>
        TokenPrint uses a docked-shell layout: a persistent top navigation bar, a central 3D
        canvas, and context-dependent side panels. The canvas is always present; panels and
        overlays appear based on the active mode.
      </p>

      <hr />

      <h2 id="top-bar">Top navigation bar</h2>

      <p>The top bar contains, left to right:</p>

      <ul>
        <li><strong>TokenPrint logo</strong> — click to reset to the default view.</li>
        <li><strong>Mode buttons</strong> — Architecture, Generation, Walkthrough, Debugger.</li>
        <li>
          <strong>Model selector</strong> — shows the currently loaded model name. Click to open
          the Model Explorer modal.
        </li>
        <li>
          <strong>Plugins</strong> — opens the Plugin Manager for optional diagnostic extensions.
        </li>
        <li>
          <strong>Report</strong> — generates a Model Health Report for the currently loaded model.
        </li>
        <li>
          <strong>Docs</strong> — links to this documentation.
        </li>
      </ul>

      <hr />

      <h2 id="3d-canvas">3D canvas</h2>

      <p>
        The central canvas renders a React Three Fiber scene. Camera controls:
      </p>

      <table>
        <thead>
          <tr>
            <th>Input</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Left drag</td><td>Orbit</td></tr>
          <tr><td>Right drag / two-finger drag</td><td>Pan</td></tr>
          <tr><td>Scroll / pinch</td><td>Zoom</td></tr>
          <tr><td>Click an object</td><td>Select and open Tensor Inspector</td></tr>
          <tr><td>Double-click</td><td>Focus camera on clicked object</td></tr>
        </tbody>
      </table>

      <hr />

      <h2 id="right-panel">Right panel</h2>

      <p>The right panel is context-sensitive:</p>

      <ul>
        <li>
          <strong>Architecture mode</strong> — Tensor Inspector showing selected tensor name,
          shape, dtype, and parameter count.
        </li>
        <li>
          <strong>Generation mode</strong> — current op name, layer, KV phase, weight preview,
          top-k skyline, and generation controls.
        </li>
        <li>
          <strong>Walkthrough mode</strong> — chapter explanation with real numbers, chapter
          navigation, model scale selector.
        </li>
        <li>
          <strong>Debugger mode</strong> — tiled dashboard: breakpoints, flame graph, sentinels,
          watch expressions, layer table.
        </li>
      </ul>

      <hr />

      <h2 id="keyboard-shortcuts">Keyboard shortcuts</h2>

      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>Space</code></td><td>Play / pause generation</td></tr>
          <tr><td><code>←</code> / <code>→</code></td><td>Step backward / forward one op</td></tr>
          <tr><td><code>1</code>–<code>4</code></td><td>Switch mode (Architecture / Generation / Walkthrough / Debugger)</td></tr>
          <tr><td><code>Esc</code></td><td>Deselect / close modal</td></tr>
          <tr><td><code>R</code></td><td>Reset camera to default position</td></tr>
        </tbody>
      </table>

      <DocsPrevNext slug="understanding-the-interface" />
    </>
  );
}
