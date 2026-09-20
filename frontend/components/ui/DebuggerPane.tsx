"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import DebugInspector from "./DebugInspector";
import HeadInspector from "./HeadInspector";
import TimingReadout from "./TimingReadout";
import DistributionPanel from "./DistributionPanel";
import DataExport from "./DataExport";
import AblationPanel from "./AblationPanel";
import BreakpointGutter from "./BreakpointGutter";
import FlameGraph from "./FlameGraph";
import LayerTable from "./LayerTable";
import HeadGrid from "./HeadGrid";
import AnomalySentinels from "./AnomalySentinels";
import WatchPanel from "./WatchPanel";
import NumberProvenance from "./NumberProvenance";
import ConsoleRepl from "./ConsoleRepl";
import ReplayBranch from "./ReplayBranch";
import QuantExplainer from "./QuantExplainer";
import LoraDeltaViz from "./LoraDeltaViz";
import InductionHeadLab from "./InductionHeadLab";
import ActivationPatchCompare from "./ActivationPatchCompare";
import ResidualContributions from "./ResidualContributions";
import SamplingPlayground from "./SamplingPlayground";
import WhyExplainer from "./WhyExplainer";
import DepthDial from "./DepthDial";
import Gpt2Loader from "./Gpt2Loader";
import MoERoutingViz from "./MoERoutingViz";
import ExperimentPanel from "./ExperimentPanel";

/** The familiar all-tools dashboard. Sidebar choices scroll to their tool. */
export default function DebuggerPane() {
  const arch = useStore((s) => s.arch);
  const archLoading = useStore((s) => s.archLoading);
  const archError = useStore((s) => s.archError);
  const loadArchitecture = useStore((s) => s.loadArchitecture);
  const genMeta = useStore((s) => s.genMeta);
  const opIndex = useStore((s) => s.opIndex);
  const catalog = genMeta?.op_catalog;

  useEffect(() => {
    const state = useStore.getState();
    if (!state.arch && !state.archLoading && !state.archError) state.loadArchitecture();
  }, [arch, archLoading, archError, loadArchitecture]);

  if (!arch) {
    return (
      <div className="dbg-empty">
        Load a model first, then enter Debugger mode to inspect every tensor,
        benchmark layer timing, compare configs, or ablate heads.
        {archError && <div className="dbg-empty-error">{archError}</div>}
        <button className="chip-btn" style={{ marginTop: 10 }} onClick={() => loadArchitecture()} disabled={archLoading}>
          {archLoading ? "Loading model…" : "Load live Qwen model"}
        </button>
      </div>
    );
  }

  return (
    <div className="dbg-dashboard">
      <div className="dbg-toolbar">
        <span className="dbg-title">Debugger Dashboard</span>
        <span className="dbg-subtitle">
          {arch.metadata.name} · {arch.tensor_count} tensors · {catalog?.length ? `${opIndex + 1}/${catalog.length} ops` : "no generation data"}
        </span>
      </div>
      <div className="dbg-grid">
        <div className="dbg-card dbg-card-wide" data-dbg-tool="tensor_inspector"><div className="dbg-card-title">Tensor Inspector</div><DebugInspector /></div>
        <div className="dbg-card"><div className="dbg-card-title">Breakpoints</div><BreakpointGutter /></div>
        <div className="dbg-card" data-dbg-tool="operation_timeline"><div className="dbg-card-title">Flame Graph</div><FlameGraph /></div>
        <div className="dbg-card"><div className="dbg-card-title">Layer Metrics</div><LayerTable /></div>
        <div className="dbg-card" data-dbg-tool="attention_analysis"><div className="dbg-card-title">Head × Head Grid</div><HeadGrid /></div>
        <div className="dbg-card dbg-card-wide"><div className="dbg-card-title">Anomaly Sentinels</div><AnomalySentinels /></div>
        <div className="dbg-card"><div className="dbg-card-title">Watch Expressions</div><WatchPanel /></div>
        <div className="dbg-card"><div className="dbg-card-title">Number Provenance</div><NumberProvenance /></div>
        <div className="dbg-card" data-dbg-tool="trace_frames"><div className="dbg-card-title">Replay Branching</div><ReplayBranch /></div>
        <div className="dbg-card dbg-card-wide"><div className="dbg-card-title">Console REPL</div><ConsoleRepl /></div>
        <div className="dbg-card"><div className="dbg-card-title">Attention Heads</div><HeadInspector /></div>
        <div className="dbg-card" data-dbg-tool="kv_cache"><div className="dbg-card-title">Layer Timing</div><TimingReadout /></div>
        <div className="dbg-card" data-dbg-tool="activation_analysis"><div className="dbg-card-title">Activation Distribution</div><DistributionPanel /></div>
        <div className="dbg-card"><div className="dbg-card-title">Console REPL</div><ConsoleRepl /></div>
        <div className="dbg-card" data-dbg-tool="quantization_compare"><div className="dbg-card-title">Quant Explainer</div><QuantExplainer /></div>
        <div className="dbg-card"><div className="dbg-card-title">LoRA Delta</div><LoraDeltaViz /></div>
        <div className="dbg-card" data-dbg-tool="induction_heads"><div className="dbg-card-title">Induction-Head Lab</div><InductionHeadLab /></div>
        <div className="dbg-card" data-dbg-tool="activation_patching"><div className="dbg-card-title">Activation Patching</div><ActivationPatchCompare /></div>
        <div className="dbg-card" data-dbg-tool="residual_contributions"><div className="dbg-card-title">Residual Contributions</div><ResidualContributions /></div>
        <div className="dbg-card" data-dbg-tool="sampling_playground"><div className="dbg-card-title">Sampling Playground</div><SamplingPlayground /></div>
        <div className="dbg-card dbg-card-wide" data-dbg-tool="logit_lens"><div className="dbg-card-title">Why This Token?</div><WhyExplainer /></div>
        <div className="dbg-card" data-dbg-tool="token_state"><div className="dbg-card-title">Depth Dial</div><DepthDial /></div>
        <div className="dbg-card" data-dbg-tool="local_checkpoint"><div className="dbg-card-title">Local Checkpoint</div><Gpt2Loader /></div>
        <div className="dbg-card" data-dbg-tool="head_ablation"><div className="dbg-card-title">Ablation</div><AblationPanel /></div>
        <div className="dbg-card dbg-card-wide"><div className="dbg-card-title">MoE Routing</div><MoERoutingViz /></div>
        <div className="dbg-card"><div className="dbg-card-title">Data Export</div><DataExport /></div>
        <div className="dbg-card dbg-card-wide" data-dbg-tool="experiments"><div className="dbg-card-title">Experiments</div><ExperimentPanel /></div>
      </div>
    </div>
  );
}
