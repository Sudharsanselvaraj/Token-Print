"use client";

import { useStore } from "@/lib/store";

export default function DecodeStats() {
  const meta = useStore((s) => s.genMeta);
  const done = useStore((s) => s.genDone);
  const status = useStore((s) => s.genStatus);

  if (status !== "done" || !done) return null;

  const params = meta?.decoding_params;

  return (
    <div className="panel selector" style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 600, fontSize: 12, letterSpacing: "0.04em" }}>
        Decode results
      </div>
      <div className="footer-note" style={{ marginTop: 6 }}>
        <div>mode: {done.decoding_mode ?? "greedy"}</div>
        {done.source && (
          <div style={{ marginTop: 2 }}>
            source: {done.source} {done.quant ? `(${done.quant})` : ""}
          </div>
        )}
        {params?.window_size != null && (
          <div>sliding window: {params.window_size}</div>
        )}
        {params?.draft_gamma != null && (
          <div>
            drafts:{params.draft_gamma} · accepted:{done.drafts_accepted ?? 0}/
            {done.draft_batches != null ? done.draft_batches * params.draft_gamma : 0} ·{" "}
            {(done.acceptance_rate ?? 0) * 100}% accept
          </div>
        )}
        {done.needle_report && (
          <div
            style={{
              color: done.needle_report.recalled ? "#8bf59a" : "#ffb3a7",
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            needle {done.needle_report.recalled ? "recalled (success)" : "not recalled (failed)"}
            <div style={{ fontWeight: 400, color: "#8a97bd" }}>
              “{done.needle_report.needle}”
            </div>
          </div>
        )}
      </div>
    </div>
  );
}