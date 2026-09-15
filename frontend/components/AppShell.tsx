"use client";

import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { useStore, restoreFromUrl } from "@/lib/store";
import { useSearchParams } from "next/navigation";
import { assetUrl } from "@/lib/assets";
import { normalizeModeParam } from "@/lib/routeMode";
import SceneLoader from "./SceneLoader";
import PlaybackEngine from "./PlaybackEngine";
import ModeSidebar from "./ui/ModeSidebar";
import RightPanel from "./ui/RightPanel";
import BottomBar from "./ui/BottomBar";
import GenerationWorkspaceOverlay from "./ui/GenerationWorkspaceOverlay";
import PredictionTimeline from "./ui/PredictionTimeline";
import DebugInspector from "./ui/DebugInspector";
import HeadInspector from "./ui/HeadInspector";
import DataExport from "./ui/DataExport";
import TimingReadout from "./ui/TimingReadout";
import ConfigDiff from "./ui/ConfigDiff";
import TokenDetailView from "./ui/TokenDetailView";
import DistributionPanel from "./ui/DistributionPanel";
import TileView from "./ui/TileView";
import DebuggerPane from "./ui/DebuggerPane";
import TraceGallery from "./ui/TraceGallery";
import { HFModelPicker } from "./ui/HFModelPicker";
import { ContextualExplanationOverlay } from "./ui/ContextualExplanationOverlay";
import { DevDiagnosticsHUD } from "./ui/DevDiagnosticsHUD";
import { fmtShape } from "@/lib/format";
import { roleLabel } from "@/lib/tensorName";
import { useKeyboard } from "@/lib/useKeyboard";

export default function AppShell() {
  const loadArchitecture = useStore((s) => s.loadArchitecture);
  const arch = useStore((s) => s.arch);
  const hovName = useStore((s) => s.hoveredTensor);
  const devMode = useStore((s) => s.devMode);
  const tileView = useStore((s) => s.tileView);
  const embedMode = useStore((s) => s.embedMode);
  const focusMode = useStore((s) => s.focusMode);
  const toggleFocusMode = useStore((s) => s.toggleFocusMode);
  const [mouse, setMouse] = useState({ x: 0, y: 0, inside: false });
  const hfExplorerOpen = useStore((s) => s.hfExplorerOpen);
  const setHfExplorerOpen = useStore((s) => s.setHfExplorerOpen);

  // The URL is the single source of truth for which workspace is rendered.
  // The pathname/query determines the mode — never a global "activeMode" store.
  const searchParams = useSearchParams();
  const mode = normalizeModeParam(searchParams?.get("mode"));

  // store.mode remains a read-only mirror so the many sub-components that
  // still read it historically stay consistent. Self-heal any divergence from
  // the URL BEFORE paint: legacy data actions must never be able to pick the
  // rendered page (e.g. a loaded trace flipping the route to Generation).
  const storeMode = useStore((s) => s.mode);
  useLayoutEffect(() => {
    if (storeMode !== mode) useStore.getState().setMode(mode);
  }, [mode, storeMode]);

  // Responsive sidebar collapse state
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  useKeyboard();

  // Load the live Qwen model's architecture once on mount.
  useEffect(() => {
    // Restore route-local transient params (token/op/chapter/embed) from the URL.
    // The rendered mode itself is derived from the URL via `mode` above.
    const snapshot = restoreFromUrl();
    if (snapshot.playIndex !== undefined) useStore.getState().setPlayIndex(snapshot.playIndex);
    if (snapshot.opIndex !== undefined) useStore.getState().setOpIndex(snapshot.opIndex);
    if (snapshot.wtChapter !== undefined) useStore.getState().setWtChapter(snapshot.wtChapter);
    if (snapshot.embedMode) useStore.getState().setEmbedMode(snapshot.embedMode);
    if (!arch) loadArchitecture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-load demo trace on first load when no backend is available.
  const demoLoaded = useRef(false);
  const archLoading = useStore((s) => s.archLoading);
  const archError = useStore((s) => s.archError);
  const loadTrace = useStore((s) => s.loadTrace);
  useEffect(() => {
    if (demoLoaded.current) return;
    if (archLoading || !archError) return;
    if (mode !== "explorer") return; // URL-specified mode means intentional
    demoLoaded.current = true;
    (async () => {
      const res = await fetch(assetUrl("/demo/hello-world.json"));
      if (!res.ok) return;
      const trace = await res.json();
      await loadTrace(trace);
      // Start mid-replay so user sees motion immediately.
      useStore.setState({ playIndex: 3, isPlaying: true, opPlaying: true });
    })();
  }, [archLoading, archError, mode, loadTrace]);

  const hov = hovName ? arch?.tensors.find((t) => t.name === hovName) : null;

  // Sidebars are hidden in embedMode and focusMode
  const showSidebars = !embedMode && !focusMode;

  // Dynamic grid template columns based on sidebar collapse states.
  // Debugger drops the right inspector — the dashboard owns the full width.
  const rightCol = mode === "debugger" ? "0px" : rightCollapsed ? "36px" : "360px";
  const gridStyle = {
    gridTemplateColumns: embedMode
      ? "0px 1fr 0px"
      : `${leftCollapsed ? "36px" : "300px"} 1fr ${rightCol}`,
  };

  return (
    <div
      className={`app mode-${mode} ${embedMode ? "embed" : ""} ${focusMode ? "focus-mode" : ""}`}
      style={gridStyle}
    >
      <PlaybackEngine />
      {showSidebars && (
        <ModeSidebar
          collapsed={leftCollapsed}
          onToggleCollapse={() => setLeftCollapsed(!leftCollapsed)}
        />
      )}
      <div
        className="canvas-area"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMouse({ x: e.clientX - r.left, y: e.clientY - r.top, inside: true });
        }}
        onMouseLeave={() => setMouse((m) => ({ ...m, inside: false }))}
      >
        {mode === "debugger" ? (
          <DebuggerPane />
        ) : tileView ? (
          <TileView />
        ) : (
          <>
            <SceneLoader />
            {mode === "generation" && <GenerationWorkspaceOverlay />}
            {mode === "explorer" && <ContextualExplanationOverlay />}
          </>
        )}

        {/* Focus Mode exit button (top-right corner of canvas) */}
        {focusMode && (
          <button
            onClick={toggleFocusMode}
            title="Exit Focus Mode (Esc)"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 80,
              background: "rgba(10,12,24,0.85)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              color: "#94a3b8",
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 12px",
              cursor: "pointer",
              backdropFilter: "blur(12px)",
              letterSpacing: "0.03em",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            ✕ Exit Focus Mode
          </button>
        )}

        {mode === "walkthrough" && <PredictionTimeline />}
        {mode === "walkthrough" && <TokenDetailView />}
        <DevDiagnosticsHUD />
        {devMode && <DebugInspector />}
        {devMode && <HeadInspector />}
        {devMode && <DataExport />}
        {devMode && <TimingReadout />}
        {devMode && <DistributionPanel />}
        {devMode && <ConfigDiff />}

        {mode === "explorer" && hov && mouse.inside && (
          <div
            className="hover-tip"
            style={{
              left: Math.min(mouse.x + 16, window.innerWidth - 660),
              top: mouse.y + 16,
            }}
          >
            <div className="ht-title">
              {roleLabel(hov.role)}
              {hov.layer != null ? ` — Layer ${hov.layer}` : ""}
            </div>
            <div className="ht-name">{hov.name}</div>
            <div className="ht-meta">
              {fmtShape(hov.shape)} · {hov.dtype}
            </div>
          </div>
        )}
      </div>
      <TraceGallery />
      <HFModelPicker
        isOpen={hfExplorerOpen}
        onClose={() => setHfExplorerOpen(false)}
        onSelectModel={(modelId) => {
          useStore.getState().loadArchitecture();
          setHfExplorerOpen(false);
        }}
      />
      <BottomBar />
      {showSidebars && mode !== "debugger" && (
        <RightPanel
          collapsed={rightCollapsed}
          onToggleCollapse={() => setRightCollapsed(!rightCollapsed)}
        />
      )}
    </div>
  );
}
