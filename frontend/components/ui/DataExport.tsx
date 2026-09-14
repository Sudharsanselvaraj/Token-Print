"use client";

import { useStore } from "@/lib/store";
import { useCallback } from "react";

/**
 * Data export card. Exports the analysis payloads AND the tensors captured
 * by the Debug Inspector at paused breakpoints (issue #63): the captured
 * snapshot lives in the store, so it can be serialized from here too.
 */
export default function DataExport() {
  const data = useStore((s) => s.data);
  const genMeta = useStore((s) => s.genMeta);
  const snapshots = useStore((s) => s.debugSnapshots);
  const opIndex = useStore((s) => s.opIndex);

  const downloadJson = useCallback(
    (field: string, obj: unknown) => {
      const blob = new Blob([JSON.stringify(obj, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tokenprint-${field}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [],
  );

  const snapOps = Object.keys(snapshots)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="data-export">
      <div className="dex-title">Export</div>
      <div className="dex-buttons">
        {data && (
          <>
            <button
              className="dex-btn"
              onClick={() =>
                downloadJson("attention", {
                  tokens: data.tokens.map((t) => t.text),
                  attention: data.attention,
                })
              }
            >
              Attention
            </button>
            <button
              className="dex-btn"
              onClick={() => downloadJson("embeddings", data.embeddings_3d)}
            >
              Embeddings
            </button>
            <button
              className="dex-btn"
              onClick={() =>
                downloadJson("hidden-states", data.hidden_states_3d)
              }
            >
              Hidden States
            </button>
            <button
              className="dex-btn"
              onClick={() => downloadJson("logit-lens", data.logit_lens)}
            >
              Logit Lens
            </button>
          </>
        )}

        {snapOps.length > 0 && (
          <button
            className="dex-btn"
            onClick={() =>
              downloadJson(
                "debug-snapshot",
                snapOps.length === 1
                  ? { op_index: snapOps[0], tensors: snapshots[snapOps[0]] }
                  : {
                      model: genMeta?.model,
                      captured_ops: snapOps,
                      snapshots: snapOps.reduce<Record<number, unknown>>(
                        (acc, o) => {
                          acc[o] = snapshots[o];
                          return acc;
                        },
                        {},
                      ),
                    },
              )
            }
          >
            Debug Snapshot{snapOps.length > 1 ? `s (${snapOps.length})` : ""}
          </button>
        )}
      </div>

      {snapOps.length > 0 && (
        <div className="dex-note">
          {(snapOps.includes(opIndex)
            ? "Active snapshot: op " + opIndex
            : "Captured at op " + snapOps.join(", ")) + " — from breakpoint pauses."}
        </div>
      )}
    </div>
  );
}