"use client";

import { useStore } from "@/lib/store";
import { fmtShape } from "@/lib/format";
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

/**
 * Phase 2: Dedicated debugger mode — a dashboard of all dev tools
 * arranged in a tiled layout within the canvas area.
 */
export default function DebuggerPane() {
  const arch = useStore((s) => s.arch);
  const genMeta = useStore((s) => s.genMeta);
  const opIndex = useStore((s) => s.opIndex);
  const catalog = genMeta?.op_catalog;

  if (!arch) {
    return (
      <div className="dbg-empty">
        Load a model first, then enter Debugger mode to inspect every tensor,
        benchmark layer timing, compare configs, or ablate heads.
      </div>
    );
  }

  return (
    <div className="dbg-dashboard">
      <div className="dbg-toolbar">
        <span className="dbg-title">Debugger Dashboard</span>
        <span className="dbg-subtitle">
          {arch.metadata.name} · {arch.tensor_count} tensors ·{" "}
          {(catalog?.length ?? 0) > 0 ? `${opIndex + 1}/${catalog!.length} ops` : "no generation data"}
        </span>
      </div>

      <div className="dbg-grid">
        <div className="dbg-card dbg-card-wide">
          <div className="dbg-card-title">Tensor Inspector</div>
          <DebugInspector />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Breakpoints</div>
          <BreakpointGutter />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Flame Graph</div>
          <FlameGraph />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Layer Metrics</div>
          <LayerTable />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Head × Head Grid</div>
          <HeadGrid />
        </div>

        <div className="dbg-card dbg-card-wide">
          <div className="dbg-card-title">Anomaly Sentinels</div>
          <AnomalySentinels />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Watch Expressions</div>
          <WatchPanel />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Number Provenance</div>
          <NumberProvenance />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Replay Branching</div>
          <ReplayBranch />
        </div>

        <div className="dbg-card dbg-card-wide">
          <div className="dbg-card-title">Console REPL</div>
          <ConsoleRepl />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Attention Heads</div>
          <HeadInspector />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Layer Timing</div>
          <TimingReadout />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Activation Distribution</div>
          <DistributionPanel />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Console REPL</div>
          <ConsoleRepl />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Quant Explainer</div>
          <QuantExplainer />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">LoRA Delta</div>
          <LoraDeltaViz />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Induction-Head Lab</div>
          <InductionHeadLab />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Activation Patching</div>
          <ActivationPatchCompare />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Residual Contributions</div>
          <ResidualContributions />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Sampling Playground</div>
          <SamplingPlayground />
        </div>

        <div className="dbg-card dbg-card-wide">
          <div className="dbg-card-title">Why This Token?</div>
          <WhyExplainer />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Depth Dial</div>
          <DepthDial />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Local Checkpoint</div>
          <Gpt2Loader />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Ablation</div>
          <AblationPanel />
        </div>

        <div className="dbg-card dbg-card-wide">
          <div className="dbg-card-title">MoE Routing</div>
          <MoERoutingViz />
        </div>

        <div className="dbg-card">
          <div className="dbg-card-title">Data Export</div>
          <DataExport />
        </div>
      </div>
    </div>
  );
}
