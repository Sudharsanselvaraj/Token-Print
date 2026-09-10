"use client";

import { useStore } from "@/lib/store";
import ModelLoader from "./ModelLoader";
import DemoData from "./DemoData";
import ArchitecturePanel from "./ArchitecturePanel";
import ComparePanel from "./ComparePanel";
import ExplorerControls from "./ExplorerControls";
import TensorList from "./TensorList";
import GenerationControls from "./GenerationControls";
import GgufControls from "./GgufControls";
import DecodeStats from "./DecodeStats";
import ModelModeBadge, { VisionAnalyzer } from "./ModelModeBadge";
import WalkthroughPane from "./WalkthroughPane";
import TopologyView from "./TopologyView";
import ModelInfoPane from "./ModelInfoPane";

function Legend() {
  return (
    <div className="side-section">
      <div className="side-title">Legend</div>
      <div className="legend-bar" />
      <div className="legend-row">
        <span>Layer 0</span>
        <span>Layer N</span>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const mode = useStore((s) => s.mode);
  const modelMode = useStore((s) => s.modelMode);
  if (mode === "walkthrough") {
    return (
      <div className="sidebar">
        <WalkthroughPane />
      </div>
    );
  }

  return (
    <div className="sidebar">
      {mode === "generation" && (
        <div className="side-section">
          <div className="side-title">Prompt</div>
          {modelMode === "vision" ? (
            <VisionAnalyzer />
          ) : (
            <>
              <GenerationControls />
              <GgufControls />
              <DecodeStats />
              <ModelModeBadge />
            </>
          )}
        </div>
      )}
      {mode === "explorer" && (
        <>
          <DemoData />
          <ModelLoader />
          <ComparePanel />
          <ArchitecturePanel />
          <ModelInfoPane />
          <ExplorerControls />
          <TopologyView />
          <Legend />
          <TensorList />
        </>
      )}
    </div>
  );
}
