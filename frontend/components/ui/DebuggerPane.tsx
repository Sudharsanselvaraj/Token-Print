"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { DEBUGGER_TOOL_GROUPS, getDebuggerTool } from "@/lib/debuggerTools";
import DebugInspector from "./DebugInspector";
import HeadInspector from "./HeadInspector";
import HeadGrid from "./HeadGrid";
import DistributionPanel from "./DistributionPanel";
import AblationPanel from "./AblationPanel";
import FlameGraph from "./FlameGraph";
import TimingReadout from "./TimingReadout";
import ComparePanel from "./ComparePanel";
import GgufControls from "./GgufControls";
import QuantExplainer from "./QuantExplainer";
import InductionHeadLab from "./InductionHeadLab";
import ActivationPatchCompare from "./ActivationPatchCompare";
import ResidualContributions from "./ResidualContributions";
import SamplingPlayground from "./SamplingPlayground";
import Gpt2Loader from "./Gpt2Loader";
import LogitLensPanel from "./LogitLensPanel";
import KvCacheTimeline from "./KvCacheTimeline";

import ExperimentPanel from "./ExperimentPanel";

export default function DebuggerPane() {
  const s = useStore();
  const [prompt, setPrompt] = useState("The sky is blue because");
  const tool = getDebuggerTool(s.debuggerTool);
  const replay = s.traceSource === "file";
  const browser = s.genMeta?.source === "browser";
  useEffect(() => {
    const initial = useStore.getState();
    if (
      !initial.arch &&
      !initial.archLoading &&
      !initial.archError &&
      initial.traceSource !== "file" &&
      initial.genMeta?.source !== "browser"
    )
      initial.loadArchitecture();
  }, [s.arch, s.archLoading, s.archError]);

  const capabilityFor: Record<string, string> = {
    attention_analysis: "supports_attention",
    induction_heads: "supports_attention",
    logit_lens: "supports_logit_lens",
    residual_contributions: "supports_hidden_states",
    head_ablation: "supports_head_ablation",
    layer_ablation: "supports_layer_ablation",
    activation_patching: "supports_activation_patch",
  };
  const capability =
    s.data?.capabilities?.[
      capabilityFor[tool.id] as keyof typeof s.data.capabilities
    ];
  const intervention = [
    "head_ablation",
    "layer_ablation",
    "activation_patching",
    "tensor_inspector",
  ].includes(tool.id);
  let missing = "";
  if (intervention && (replay || browser))
    missing =
      "This tool runs a new instrumented forward pass. Connect the Python backend and run an analysis below; recorded and browser traces cannot provide new activations.";
  else if (capability && "supported" in capability && !capability.supported)
    missing =
      capability.reason ||
      "The selected model/backend does not support this measurement.";
  else if (
    ["attention_analysis", "induction_heads"].includes(tool.id) &&
    !s.data?.attention?.length
  )
    missing =
      "No attention matrices were captured. Run an analysis on a backend that exposes attention, or open the recorded demo.";
  else if (tool.id === "logit_lens" && !s.data?.logit_lens?.length)
    missing =
      "No layer predictions were captured. Run an instrumented analysis to populate the logit lens.";
  else if (
    [
      "tensor_inspector",
      "residual_contributions",
      "head_ablation",
      "layer_ablation",
      "activation_patching",
    ].includes(tool.id) &&
    !s.data
  )
    missing =
      "Run an analysis below to capture the activations this workspace needs.";
  else if (
    ["trace_frames", "token_state", "sampling_playground"].includes(tool.id) &&
    !s.genFrames.length
  )
    missing =
      "Generate tokens or open a recorded trace before inspecting token results.";
  else if (
    tool.id === "activation_analysis" &&
    !s.genFrames.some((f) => f.layer_stats.length)
  )
    missing =
      "This trace has no per-layer activation statistics. The browser engine exposes final logits only; use the instrumented Python backend for hidden states.";
  else if (
    tool.id === "operation_timeline" &&
    !s.genFrames.some((f) => f.layer_timings_ms?.length)
  )
    missing =
      "No measured layer timings are available. Record a generation with tracing enabled on the Python backend.";
  else if (
    tool.id === "kv_cache" &&
    !s.genFrames.some((f) => f.cache_len !== undefined)
  )
    missing =
      "Cache measurements are unavailable for this trace. Browser GPT-2 recomputes the full sequence and does not report a KV cache.";
  const views: Record<string, React.ReactNode> = {
    tensor_inspector: <DebugInspector />,
    attention_analysis: (
      <>
        <HeadGrid />
        <HeadInspector />
      </>
    ),
    activation_analysis: <DistributionPanel />,
    residual_contributions: <ResidualContributions />,
    induction_heads: <InductionHeadLab />,
    logit_lens: <LogitLensPanel />,
    activation_patching: <ActivationPatchCompare />,
    head_ablation: <AblationPanel />,
    layer_ablation: <AblationPanel />,
    sampling_playground: <SamplingPlayground />,
    trace_frames: (
      <table>
        <caption>Recorded token frames — select a step to inspect it</caption>
        <thead>
          <tr>
            <th>Step</th>
            <th>Token</th>
            <th>ID</th>
            <th>Log probability</th>
          </tr>
        </thead>
        <tbody>
          {s.genFrames.map((frame, i) => (
            <tr key={i}>
              <td>
                <button
                  className="chip-btn"
                  onClick={() => s.setPlayIndex(i)}
                  aria-pressed={s.playIndex === i}
                >
                  {i + 1}
                </button>
              </td>
              <td>{JSON.stringify(frame.chosen.text)}</td>
              <td>{frame.chosen.id}</td>
              <td>{frame.chosen.logprob.toFixed(5)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
    operation_timeline: (
      <>
        <TimingReadout />
        {s.genMeta?.op_catalog?.length ? (
          <>
            <p>
              Operation breakdown below uses parameter counts; it is not a
              per-operation timing measurement.
            </p>
            <FlameGraph />
          </>
        ) : null}
      </>
    ),
    token_state: (
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(s.genFrames[Math.max(s.playIndex, 0)]?.chosen, null, 2)}
      </pre>
    ),
    kv_cache: <KvCacheTimeline />,
    local_checkpoint: <Gpt2Loader />,
    gguf_loading: <GgufControls />,
    quantization_compare: (
      <>
        <ComparePanel />
        {s.arch?.metadata.quantization ? (
          <QuantExplainer />
        ) : (
          <p>
            Load a quantized GGUF in Local Checkpoint to inspect its
            quantization format.
          </p>
        )}
      </>
    ),
    experiments: <ExperimentPanel />,
  };
  return (
    <div className="dbg-dashboard">
      <div className="dbg-toolbar">
        <span className="dbg-title">
          {tool.label === "Overview" ? "Debugger workspaces" : tool.label}
        </span>
        <span className="dbg-subtitle">
          {s.genMeta?.model ?? s.arch?.metadata.name ?? "No model connected"} ·{" "}
          {replay
            ? "Recorded replay"
            : browser
              ? "Browser inference"
              : "Live backend"}
        </span>
      </div>
      <p>{tool.purpose}</p>
      {tool.id === "overview" ? (
        <div className="workspace-grid">
          {DEBUGGER_TOOL_GROUPS.map((group) => (
            <section key={group.label}>
              <h2>{group.label}</h2>
              {group.tools.map((t) => (
                <button
                  key={t.id}
                  className="workspace-card"
                  onClick={() => s.setDebuggerTool(t.id)}
                >
                  <strong>{t.label}</strong>
                  <span>{t.purpose}</span>
                </button>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="dbg-card dbg-card-wide" data-dbg-tool={tool.id}>
          {missing ? (
            <div role="status" className="workspace-empty">
              <h2>Data needed</h2>
              <p>{missing}</p>
              <Link href="/app?mode=generation&demo=hello-world&tour=1">
                Try a recorded demo
              </Link>{" "}
              · <Link href="/app?mode=generation">Open Generation</Link>
            </div>
          ) : (
            views[tool.id]
          )}
        </div>
      )}
      <details className="workspace-analysis" open={!s.arch && !s.genMeta}>
        <summary>Connect backend / capture analysis</summary>
        <p>
          Run a new analysis to inspect attention, hidden states and
          interventions.
        </p>
        {s.archError && (
          <p role="alert" className="dbg-empty-error">
            {s.archError}
          </p>
        )}
        <button
          className="chip-btn"
          disabled={s.archLoading}
          onClick={() => s.loadArchitecture()}
        >
          {s.archLoading ? "Loading model…" : "Load live Qwen model"}
        </button>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await s.analyze(prompt);
            if (!useStore.getState().error)
              useStore.setState({
                traceSource: "live",
                genMeta: null,
                genFrames: [],
                genDone: null,
                genText: "",
                playIndex: -1,
              });
          }}
        >
          <label>
            Analysis prompt
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              maxLength={2000}
            />
          </label>
          <button className="chip-btn" disabled={s.loading}>
            {s.loading ? "Analyzing…" : "Run analysis"}
          </button>
          {s.error && (
            <p role="alert">
              {s.error} Check the backend is running with python3
              scripts/start.py.
            </p>
          )}
        </form>
      </details>
    </div>
  );
}
