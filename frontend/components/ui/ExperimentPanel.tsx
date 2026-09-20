"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import {
  useExperiments,
  rememberExperiment,
  generationExperiment,
  importExperiment,
  exportExperiment,
  verifyExperiment,
  type Experiment,
  downloadJSON,
} from "@/lib/experiments";
import { registerLocalEngine } from "@/lib/generation";
import { browserEngine } from "@/lib/browser/engine";
export default function ExperimentPanel() {
  const s = useStore();
  const items = useExperiments((state) => state.items);
  const [selected, setSelected] = useState<Experiment | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function action(fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }
  function saveCurrent() {
    if (!s.genMeta || !s.genFrames.length)
      throw new Error("Generate tokens or load a recorded demo first.");
    const e = generationExperiment({
      trace_version: 1,
      created_at: new Date().toISOString(),
      model: s.genMeta.model,
      meta: s.genMeta,
      frames: s.genFrames,
      done: s.genDone,
      architecture_data: s.arch ?? undefined,
      analysis: s.data ?? undefined,
    });
    rememberExperiment(e);
    setSelected(e);
    return exportExperiment(e);
  }
  return (
    <section className="experiment-panel">
      <div className="experiment-intro">
        <h3>Reproducible experiments</h3>
        <p>
          Export a portable file containing the exact prompts, model revision,
          decoding settings, intervention, and measured results. The SHA-256
          checksum detects accidental changes.
        </p>
      </div>
      <div className="experiment-actions">
        <button
          className="chip-btn"
          disabled={busy}
          onClick={() => action(saveCurrent)}
        >
          Save current generation
        </button>
        <button
          className="chip-btn"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          Import experiment
        </button>
        <input
          ref={fileInput}
          className="experiment-file-input"
          aria-label="Import experiment"
          type="file"
          accept=".json"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file)
              action(async () => {
                const experiment = await importExperiment(file);
                rememberExperiment(experiment);
                setSelected(experiment);
                setMessage(
                  "Integrity check passed. Replay saved results or verify by running the experiment again.",
                );
              });
            e.target.value = "";
          }}
        />
      </div>
      <div className="experiment-list">
        {items.map((e, i) => (
          <button
            className="workspace-card"
            key={`${e.created_at}-${i}`}
            onClick={() => setSelected(e)}
          >
            <strong>
              {e.kind} · {e.model.id}
            </strong>
            <span>
              {e.input.prompt} · {e.created_at}
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="experiment-detail">
          <h4>{selected.kind} experiment</h4>
          <p className="experiment-meta">
            Revision: {selected.model.revision || "Not recorded — replay only"}
            <br />
            Runtime: {selected.model.runtime ?? "Not recorded"} ·{" "}
            {selected.model.device}
          </p>
          <pre className="experiment-code">
            {JSON.stringify(selected.input, null, 2)}
          </pre>
          <div className="experiment-actions">
            <button
              className="chip-btn"
              onClick={() => action(() => exportExperiment(selected))}
            >
              Export experiment
            </button>
            <button
              className="chip-btn"
              onClick={() =>
                downloadJSON(selected.results, "experiment-results.json")
              }
            >
              Export results
            </button>
            {selected.trace && (
              <button
                className="chip-btn"
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    await s.loadTrace(selected.trace!);
                    setMessage(
                      "Saved results loaded as recorded replay. Open Generation to step through them.",
                    );
                  })
                }
              >
                Replay saved results
              </button>
            )}
            <button
              className="chip-btn"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  if (s.genStatus === "streaming") s.stopGeneration();
                  setBusy(true);
                  setMessage("Re-running the saved experiment…");
                  controller.current = new AbortController();
                  registerLocalEngine(browserEngine);
                  try {
                    setMessage(
                      await verifyExperiment(selected, controller.current.signal),
                    );
                  } finally {
                    setBusy(false);
                  }
                })
              }
            >
              Re-run and verify
            </button>
            {busy && (
              <button
                className="chip-btn"
                onClick={() => controller.current?.abort()}
              >
                Cancel verification
              </button>
            )}
          </div>
          <details className="experiment-results">
            <summary>Saved results</summary>
            <pre className="experiment-code experiment-results-code">
              {JSON.stringify(selected.results, null, 2)}
            </pre>
          </details>
        </div>
      )}
      {message && <p className="experiment-status" role="status">{message}</p>}
    </section>
  );
}
