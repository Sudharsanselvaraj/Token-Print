import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCallout from "@/components/docs/DocsCallout";

export const metadata: Metadata = {
  title: "Camera System",
  description: "The unified 3D camera bar — overview, layer, op focus, follow mode, and 2D/3D toggle.",
};

export default function CameraSystemPage() {
  return (
    <>
      <DocsBreadcrumb slug="using/camera-system" title="Camera System" />
      <h1>Camera System</h1>
      <p className="docs-meta">Using TokenPrint</p>

      <p>
        A single unified control bar manages the 3D camera across Architecture, Generation,
        Walkthrough, and Debugger modes. The same buttons and keyboard shortcuts work everywhere,
        so navigating a live generation feels identical to navigating a replay.
      </p>

      <hr />

      <h2 id="camera-bar">The camera bar</h2>

      <p>
        The camera controls live in the bottom transport bar (labeled{" "}
        <em>3D &amp; Workspace Controls</em>):
      </p>

      <table>
        <thead>
          <tr>
            <th>Button</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>OVERVIEW</code></td>
            <td>Reset camera to the full model view.</td>
          </tr>
          <tr>
            <td><code>LAYER</code></td>
            <td>Focus the camera on the current active layer.</td>
          </tr>
          <tr>
            <td><code>OP</code></td>
            <td>Focus on the currently executing operation.</td>
          </tr>
          <tr>
            <td><code>FOLLOW</code></td>
            <td>Toggle live follow mode — camera tracks execution during generation.</td>
          </tr>
          <tr>
            <td><code>3D</code> / <code>2D</code></td>
            <td>
              Switch between the 3D spatial stack and a 2D flat schematic overview.
            </td>
          </tr>
          <tr>
            <td><code>TRACE</code></td>
            <td>Inspect or download the current execution trace (<code>.tokenprint.json</code>).</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2 id="camera-modes">Camera modes</h2>

      <p>
        The camera has five navigation modes:
      </p>

      <ul>
        <li><strong>MANUAL</strong> — free orbit, pan, and zoom.</li>
        <li><strong>OVERVIEW</strong> — the whole model in frame.</li>
        <li><strong>LAYER_FOCUS</strong> — centered on the active layer.</li>
        <li><strong>OP_FOCUS</strong> — centered on the active operation.</li>
        <li><strong>FOLLOW</strong> — continuous tracking during execution.</li>
      </ul>

      <p>
        In Walkthrough mode, each of the 7 chapters uses a dedicated cinematic preset (17 camera
        presets total) tuned to that chapter&apos;s geometry — embedding cloud, attention district,
        MLP funnel, LM-head skyline, and so on.
      </p>

      <DocsCallout variant="note">
        <p>
          The director dynamics are not guesswork: follow-mode tension, push-in distance, and the
          LM-head zoom threshold are all derived from real values such as normalization magnitude
          and top-1 token probability.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="keyboard-shortcuts">Keyboard shortcuts</h2>

      <table>
        <thead>
          <tr>
            <th>Shortcut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>F</code></td><td>Return the camera to the overview position</td></tr>
          <tr><td><code>R</code></td><td>Reset the camera to the overview orientation</td></tr>
          <tr><td><code>T</code></td><td>Enable live token-follow (camera tracks the active token)</td></tr>
          <tr><td><code>Space</code></td><td>Pause / resume autoplay</td></tr>
          <tr><td><code>N</code> / <code>→</code></td><td>Next step</td></tr>
          <tr><td><code>P</code> / <code>←</code></td><td>Previous step</td></tr>
        </tbody>
      </table>

      <hr />

      <h2 id="mouse-controls">Mouse controls</h2>

      <table>
        <thead>
          <tr>
            <th>Input</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Left drag</td><td>Orbit</td></tr>
          <tr><td>Right / two-finger drag</td><td>Pan</td></tr>
          <tr><td>Scroll / pinch</td><td>Zoom</td></tr>
          <tr><td>Click an object</td><td>Select and open the Tensor Inspector</td></tr>
          <tr><td>Double-click</td><td>Focus camera on the clicked object</td></tr>
        </tbody>
      </table>

      <DocsCallout variant="warning">
        <p>
          The camera system is desktop-oriented. Viewports below 1024 px show a{" "}
          <em>desktop required</em> screen for generation, walkthrough, and the debugging
          workspace.
        </p>
      </DocsCallout>

      <DocsPrevNext slug="using/camera-system" />
    </>
  );
}