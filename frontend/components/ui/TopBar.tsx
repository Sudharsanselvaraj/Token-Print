"use client";

import { useStore } from "@/lib/store";
import { fmtCount } from "@/lib/format";
import type { Mode } from "@/lib/types";

const MODES: { id: Mode; label: string }[] = [
  { id: "explorer", label: "Architecture" },
  { id: "generation", label: "Generation" },
  { id: "walkthrough", label: "Walkthrough" },
];

export default function TopBar() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const arch = useStore((s) => s.arch);
  const m = arch?.metadata;

  return (
    <div className="topbar">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tokenprint-logo.png" alt="TokenPrint" className="brand-logo" />
      </div>

      <div className="mode-tabs">
        {MODES.map((x) => (
          <button
            key={x.id}
            className={"mode-tab" + (mode === x.id ? " active" : "")}
            onClick={() => setMode(x.id)}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="topstats">
        {m ? (
          <>
            {m.name && <span className="tstat name">{m.name}</span>}
            <span className="tstat">
              <b>{fmtCount(m.total_params)}</b> params
            </span>
            <span className="tstat">
              <b>{m.num_layers}</b> layers
            </span>
            <span className="tstat">
              <b>{m.num_heads}</b> heads
            </span>
            {m.expert_count ? (
              <span className="tstat">
                <b>{m.expert_count}</b> experts
              </span>
            ) : null}
            <span className="tstat">{arch?.tensor_count} tensors</span>
            <span className="tstat accent">
              {m.quantization ?? m.torch_dtype ?? ""}
            </span>
          </>
        ) : (
          <span className="tstat muted">loading model…</span>
        )}
      </div>
    </div>
  );
}
