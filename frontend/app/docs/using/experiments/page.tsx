import type { Metadata } from "next";
import DocsBreadcrumb from "@/components/docs/DocsBreadcrumb";
import DocsPrevNext from "@/components/docs/DocsPrevNext";
import DocsCallout from "@/components/docs/DocsCallout";

export const metadata: Metadata = {
  title: "Experiments",
  description: "Reproducible experiments — save, export, import, and verify generation runs.",
};

export default function ExperimentsPage() {
  return (
    <>
      <DocsBreadcrumb slug="using/experiments" title="Experiments" />
      <h1>Experiments</h1>
      <p className="docs-meta">Using TokenPrint</p>

      <p>
        The <strong>Experiments</strong> panel in Debugger mode turns any generation run into a
        <strong>portable, reproducible artifact</strong>. An experiment is a JSON file containing
        the exact prompt, model revision, decoding settings, any intervention (patch, ablation),
        and the measured results — so another machine can replay or re-verify the exact same run.
      </p>

      <hr />

      <h2 id="what-is-captured">What is captured</h2>

      <p>Each experiment (schema version 1) records:</p>

      <ul>
        <li><strong>Kind</strong> — <code>generation</code>, <code>patch</code>, or <code>ablation</code>.</li>
        <li>
          <strong>Model</strong> — <code>id</code>, <code>revision</code> (the resolved commit),
          <code>runtime</code>, and <code>device</code>.
        </li>
        <li>
          <strong>Input</strong> — the prompt and the full option set: max new tokens (1–256),
          decoding mode (greedy / sampling / sliding_window / speculative), top-k,
          temperature, top-p, seed, window size, draft gamma, the trace flag, and any
          source sentence, patched layers, zeroed heads/layers, or needle.
        </li>
        <li><strong>Results</strong> — the measured output, including the optional full trace.</li>
      </ul>

      <p>
        Exported files are named <code>tokenprint-&lt;kind&gt;.experiment.json</code> and carry a
        <strong>SHA-256 checksum</strong> over the canonical JSON, computed with{" "}
        <code>crypto.subtle.digest</code>. The checksum detects accidental changes to the file.
      </p>

      <hr />

      <h2 id="workflow">Workflow</h2>

      <p>The panel offers the following actions:</p>

      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Save current generation</td>
            <td>
              Captures the current generation (or a loaded recorded demo) as an experiment and
              downloads it immediately.
            </td>
          </tr>
          <tr>
            <td>Import experiment</td>
            <td>
              Loads a <code>.json</code> experiment file after passing the integrity check.
              Importing never runs inference.
            </td>
          </tr>
          <tr>
            <td>Export experiment</td>
            <td>Downloads the selected experiment file.</td>
          </tr>
          <tr>
            <td>Export results</td>
            <td>Downloads just the measured results as <code>experiment-results.json</code>.</td>
          </tr>
          <tr>
            <td>Replay saved results</td>
            <td>
              Loads the recorded trace as a replay. Open Generation to step through it.
            </td>
          </tr>
          <tr>
            <td>Re-run and verify</td>
            <td>
              Re-runs the saved experiment and compares measurements against the recorded results.
            </td>
          </tr>
          <tr>
            <td>Cancel verification</td>
            <td>Aborts an in-progress re-run.</td>
          </tr>
        </tbody>
      </table>

      <DocsCallout variant="tip">
        <p>
          Verification requires a recorded <code>seed</code> for sampling runs and a valid 40-hex
          model revision, and compares values to a <code>1e-4</code> tolerance. A re-run that
          matches within tolerance confirms the experiment is reproducible.
        </p>
      </DocsCallout>

      <hr />

      <h2 id="storage">Storage and limits</h2>

      <ul>
        <li>
          Experiments are held <strong>in memory</strong> for the session (up to 10 items). They do
          not persist across reloads — the downloaded JSON file is the durable copy.
        </li>
        <li>
          Imports are capped at <strong>32 MB</strong> (the trace import limit).
        </li>
        <li>
          Verification has a 5-minute timeout and a <code>1e-4</code> numerical tolerance.
        </li>
      </ul>

      <hr />

      <h2 id="guided-replay">Guided replay</h2>

      <p>
        When a recorded demo trace is loaded with <code>?tour=1</code> in the URL, a{" "}
        <em>RECORDED REPLAY</em> guide appears: a 3-step tour (<em>Follow a token</em>,{" "}
        <em>Inspect a layer</em>, <em>Explore the evidence</em>) with a step counter and{" "}
        <code>Next step</code>/<code>Finish tour</code>/<code>Skip tour</code> controls. Replays
        are a playback of captured values — nothing is re-inferred during playback.
      </p>

      <DocsCallout variant="note">
        <p>
          The re-run verification path uses the in-browser GPT-2 engine when available, so a saved
          experiment can be verified even without the Python backend. See{" "}
          <a href="/docs/using/browser-inference">Browser GPT-2</a>.
        </p>
      </DocsCallout>

      <DocsPrevNext slug="using/experiments" />
    </>
  );
}