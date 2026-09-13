import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";

export const metadata: Metadata = {
  title: "Keyboard Shortcuts",
  description: "Global keyboard shortcuts for navigating 3D architecture, generation step controls, and documentation.",
};

export default function KeyboardShortcutsPage() {
  return (
    <>
      <DocsBreadcrumb slug="keyboard-shortcuts" title="Keyboard Shortcuts" />

      <h1>Keyboard Shortcuts</h1>
      <p className="docs-meta">Reference</p>

      <p className="docs-intro">
        TokenPrint provides extensive keyboard navigation for fast technical inspection across 3D viewports,
        generation controls, and documentation views.
      </p>

      <hr />

      <h2 id="global-navigation">Global Navigation</h2>
      <table>
        <thead>
          <tr>
            <th>Shortcut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>⌘ K</code> / <code>Ctrl K</code></td>
            <td>Open global documentation search</td>
          </tr>
          <tr>
            <td><code>Esc</code></td>
            <td>Close active modal or clear search overlay</td>
          </tr>
          <tr>
            <td><code>1</code> – <code>4</code></td>
            <td>Switch workspace mode (1: Architecture, 2: Generation, 3: Walkthrough, 4: Debugger)</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2 id="generation-controls">Generation &amp; 3D Controls</h2>
      <table>
        <thead>
          <tr>
            <th>Shortcut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>Space</code></td>
            <td>Pause / Resume autoplay token generation</td>
          </tr>
          <tr>
            <td><code>N</code> / <code>Right Arrow</code></td>
            <td>Step forward to next generation step / token</td>
          </tr>
          <tr>
            <td><code>P</code> / <code>Left Arrow</code></td>
            <td>Step backward to previous generation step</td>
          </tr>
          <tr>
            <td><code>F</code></td>
            <td>Toggle camera Follow mode on active token node</td>
          </tr>
          <tr>
            <td><code>R</code></td>
            <td>Reset 3D camera view to default orientation</td>
          </tr>
        </tbody>
      </table>

      <DocsPrevNext slug="keyboard-shortcuts" />
    </>
  );
}
