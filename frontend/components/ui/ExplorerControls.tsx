"use client";

import { useStore } from "@/lib/store";
import { fmtCount } from "@/lib/format";

export default function ExplorerControls() {
  const pointBudget = useStore((s) => s.pointBudget);
  const pointSize = useStore((s) => s.pointSize);
  const colorBy = useStore((s) => s.colorBy);
  const setPointBudget = useStore((s) => s.setPointBudget);
  const setPointSize = useStore((s) => s.setPointSize);
  const setColorBy = useStore((s) => s.setColorBy);

  return (
    <div className="side-section">
      <div className="side-title">Controls</div>
      <div className="ctrl-row">
        <label>Points</label>
        <input
          type="range"
          min={50000}
          max={2000000}
          step={50000}
          value={pointBudget}
          onChange={(e) => setPointBudget(Number(e.target.value))}
        />
        <span className="ctrl-val">{fmtCount(pointBudget)}</span>
      </div>
      <div className="ctrl-row">
        <label>Point Size</label>
        <input
          type="range"
          min={0.3}
          max={3}
          step={0.1}
          value={pointSize}
          onChange={(e) => setPointSize(Number(e.target.value))}
        />
        <span className="ctrl-val">{pointSize.toFixed(1)}</span>
      </div>
      <div className="ctrl-row">
        <label>Color</label>
        <select
          value={colorBy}
          onChange={(e) => setColorBy(e.target.value as "layer" | "role")}
        >
          <option value="layer">Layer Depth</option>
          <option value="role">Tensor Role</option>
        </select>
      </div>
    </div>
  );
}
