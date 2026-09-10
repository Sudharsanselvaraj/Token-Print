"use client";

import { useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { patchAnalyze } from "@/lib/api";
import type { PatchResponse, AnalyzeResponse } from "@/lib/types";

/**
 * Activation patching (issue #75). Runs a real source/target experiment:
 * capture the residual stream of a source prompt at the chosen layers and
 * inject it into the target prompt's forward pass, then compare the
 * prediction trajectories of clean vs patched runs.
 */
export default function ActivationPatchCompare() {
  const data = useStore((s) => s.data);
  const [source, setSource] = useState("The dog ran quickly.");
  const [target, setTarget] = useState(data?.sentence ?? "The cat sat.");
  const [layersCsv, setLayersCsv] = useState("8,12");
  const [result, setResult] = useState<PatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    const layers = layersCsv
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    if (!layers.length) {
      setError("Enter at least one layer index (e.g. 8,12).");
      setLoading(false);
      return;
    }
    try {
      const res = await patchAnalyze(target, source, layers);
      setResult(res);
    } catch (e: any) {
      setError(e.message ?? "Activation patching failed");
    } finally {
      setLoading(false);
    }
  }, [target, source, layersCsv]);

  // Trajectory: top prediction at the last position by layer depth.
  const trajectory = useCallback((d: AnalyzeResponse | null) => {
    if (!d?.logit_lens?.length) return [];
    const lastPos = d.logit_lens[0].length - 1;
    const out: { layer: number; token: string; prob: number; tokenId: number }[] = [];
    for (let l = 0; l < d.logit_lens.length; l++) {
      const top = d.logit_lens[l][lastPos]?.[0];
      if (!top) continue;
      out.push({ layer: l, token: top.text, prob: top.prob, tokenId: top.token_id });
    }
    return out;
  }, []);

  if (!data) {
    return (
      <div className="act-patch">
        <div className="ap-title">Activation Patching</div>
        <div className="ap-empty">
          Run an analysis first, then patch activations between source and target prompts.
        </div>
      </div>
    );
  }

  const cleanTraj = result ? trajectory(result.analysis_clean) : null;
  const patchedTraj = result ? trajectory(result) : null;
  const sourceTraj = result ? trajectory(result.analysis_source) : null;
  const patchedLayers = result?.patch.patch_layers;

  return (
    <div className="act-patch">
      <div className="ap-title">Activation Patching</div>
      <div className="ap-desc">
        Captures the source prompt&apos;s residual stream at the chosen layers and injects it
        into the target prompt&apos;s forward pass. Layers after the patch process the source&apos;s
        activations — if the output flips, that layer walks the model between prompts.
      </div>

      <div className="ap-controls">
        <label className="ap-field">
          Source prompt
          <input value={source} onChange={(e) => setSource(e.target.value)} />
        </label>
        <label className="ap-field">
          Target prompt
          <input value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        <label className="ap-field ap-layers">
          Patch layers
          <input value={layersCsv} onChange={(e) => setLayersCsv(e.target.value)} />
        </label>
        <button className="chip-btn" onClick={run} disabled={loading}>
          {loading ? "patching…" : "Run patch"}
        </button>
      </div>

      {error && <div className="error">⚠ {error}</div>}

      {!result && !loading && (
        <div className="ap-hint">
          Suggestion: patch {data.tokens.length ? "into the last position" : ""} of a related
          sentence (e.g. &quot;The {data.tokens[data.tokens.length - 1]?.text.trim()} sat.&quot;) to see
          where the prediction breaks.
        </div>
      )}

      {result && result.patch && (
        <div className="ap-chart">
          <div className="ap-chart-title">
            Patched layers {patchedLayers?.join(", ")} · source {result.patch.source_sentence}
          </div>
          {patchedTraj && cleanTraj && (
            <>
              <div className="ap-legend">
                <span className="ap-leg ap-leg-clean">clean (unpatched)</span>
                <span className="ap-leg ap-leg-src">source</span>
                <span className="ap-leg ap-leg-patch">patched</span>
              </div>
              {patchedTraj.map((t) => {
                const c = cleanTraj[t.layer] ?? t;
                const s = sourceTraj?.[t.layer];
                const patched = Boolean(patchedLayers?.includes(t.layer));
                const flipped =
                  c.token !== t.token && patched
                    ? " flip-delta"
                    : c.token !== t.token
                      ? " drift"
                      : "";
                return (
                  <div key={t.layer} className={`ap-row${flipped}${patched ? " ap-layer-patched" : ""}`}>
                    <span className="ap-layer">
                      L{t.layer}
                      {patched && <i title="patched layer">⤵</i>}
                    </span>
                    <span className="ap-token-text">{c.token}</span>
                    <div className="ap-bar-track">
                      <div className="ap-bar ap-bar-clean" style={{ width: `${Math.max((c.prob ?? 0) * 100, 1)}%` }} />
                    </div>
                    {s && (
                      <>
                        <span className="ap-token-text ap-src">{s.token}</span>
                        <div className="ap-bar-track">
                          <div className="ap-bar ap-bar-src" style={{ width: `${Math.max(s.prob * 100, 1)}%` }} />
                        </div>
                      </>
                    )}
                    <span className="ap-token-text ap-pat">{t.token}</span>
                    <div className="ap-bar-track">
                      <div className="ap-bar ap-bar-patch" style={{ width: `${Math.max(t.prob * 100, 1)}%` }} />
                    </div>
                    <span className="ap-prob">{(t.prob * 100).toFixed(1)}%</span>
                  </div>
                );
              })}
            </>
          )}
          <div className="ap-summary">
            Patched output: <b>{result.logit_lens?.[result.logit_lens.length - 1]?.[result.logit_lens[0].length - 1]?.[0]?.text ?? "—"}</b>{" "}
            (clean:{" "}
            <b>
              {result.analysis_clean?.logit_lens?.[
                result.analysis_clean.num_layers
              ]?.[result.analysis_clean.logit_lens[0].length - 1]?.[0]?.text ?? "—"}
            </b>
            ) · {result.patch.n_captured} layer state(s) captured
          </div>
        </div>
      )}
    </div>
  );
}