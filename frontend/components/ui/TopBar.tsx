"use client";

import { useStore } from "@/lib/store";
import { fmtCount } from "@/lib/format";
import { useSnapshotUrl } from "@/lib/useSnapshotUrl";
import type { Mode } from "@/lib/types";
import { useState } from "react";
import PluginManager from "./PluginManager";
import ContributorDrawer from "./ContributorDrawer";

const MODES: { id: Mode; label: string }[] = [
  { id: "explorer", label: "Architecture" },
  { id: "generation", label: "Generation" },
  { id: "walkthrough", label: "Walkthrough" },
  { id: "debugger", label: "Debugger" },
];

export default function TopBar() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const arch = useStore((s) => s.arch);
  const m = arch?.metadata;
  const { share } = useSnapshotUrl();
  const tileView = useStore((s) => s.tileView);
  const setTileView = useStore((s) => s.setTileView);
  const data = useStore((s) => s.data);

  const [pluginManagerOpen, setPluginManagerOpen] = useState(false);
  const [contributorDrawerOpen, setContributorDrawerOpen] = useState(false);

  const [copied, setCopied] = useState(false);
  const handleShare = () => {
    share();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="topbar">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="tokenprint-logo.png" alt="TokenPrint" className="brand-logo" />
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
          <button className="share-btn" onClick={handleShare} title="Copy snapshot URL">
            {copied ? "Copied" : "Share"}
          </button>
          <button
            className="chip-btn"
            onClick={async () => {
              const { generateHealthReport } = await import("@/lib/healthReport");
              generateHealthReport(arch, data);
            }}
            title="Generate & download Model Health Report"
          >
            Report
          </button>
          <button
            className="chip-btn"
            onClick={() => setPluginManagerOpen(true)}
            title="Manage TokenPrint extension plugins"
          >
            Plugins
          </button>
          <button
            className="chip-btn"
            onClick={() => setContributorDrawerOpen(true)}
            title="Browse open issues & contribute to TokenPrint"
          >
            Contribute
          </button>
          {(mode === "explorer") && (
            <button
              className={"chip-btn" + (tileView ? " on" : "")}
              onClick={() => setTileView(!tileView)}
              title="Toggle tile grid view"
            >
              {tileView ? "3D" : "Grid"}
            </button>
          )}
        </div>
        <PluginManager open={pluginManagerOpen} onClose={() => setPluginManagerOpen(false)} />
        <ContributorDrawer open={contributorDrawerOpen} onClose={() => setContributorDrawerOpen(false)} />
    </div>
  );
}
