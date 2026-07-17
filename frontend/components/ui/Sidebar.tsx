"use client";

import { useStore } from "@/lib/store";
import ModelLoader from "./ModelLoader";
import ArchitecturePanel from "./ArchitecturePanel";
import ExplorerControls from "./ExplorerControls";
import TensorList from "./TensorList";
import GenerationControls from "./GenerationControls";
import WalkthroughPane from "./WalkthroughPane";

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
  if (mode === "walkthrough") {
    return (
      <div className="sidebar">
        <WalkthroughPane />
      </div>
    );
  }

  return (
    <div className="sidebar">
      {mode === "explorer" && <ModelLoader />}
      {mode === "generation" && (
        <div className="side-section">
          <div className="side-title">Prompt</div>
          <GenerationControls />
        </div>
      )}
      <ArchitecturePanel />
      {mode === "explorer" && (
        <>
          <ExplorerControls />
          <Legend />
          <TensorList />
        </>
      )}
    </div>
  );
}
