"use client";

import { useStore } from "@/lib/store";

export default function LayerHeadSelector() {
  const data = useStore((s) => s.data);
  const layer = useStore((s) => s.selectedLayer);
  const head = useStore((s) => s.selectedHead);
  const minWeight = useStore((s) => s.minWeight);
  const setLayer = useStore((s) => s.setLayer);
  const setHead = useStore((s) => s.setHead);
  const setMinWeight = useStore((s) => s.setMinWeight);

  const maxLayer = (data?.num_layers ?? 1) - 1;
  const maxHead = (data?.num_heads ?? 1) - 1;
  const disabled = !data;

  return (
    <div className="panel selector">
      <div className="row">
        <label>Layer</label>
        <input
          type="range"
          min={0}
          max={maxLayer}
          step={1}
          value={layer}
          disabled={disabled}
          onChange={(e) => setLayer(Number(e.target.value))}
        />
        <span className="val">
          {layer} / {maxLayer}
        </span>
      </div>

      <div className="row">
        <label>Head</label>
        <input
          type="range"
          min={0}
          max={maxHead}
          step={1}
          value={head}
          disabled={disabled}
          onChange={(e) => setHead(Number(e.target.value))}
        />
        <span className="val">
          {head} / {maxHead}
        </span>
      </div>

      <div className="row">
        <label>Min wt</label>
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.01}
          value={minWeight}
          disabled={disabled}
          onChange={(e) => setMinWeight(Number(e.target.value))}
        />
        <span className="val">{minWeight.toFixed(2)}</span>
      </div>

      <div className="legend">
        <span>
          <span
            className="swatch"
            style={{
              background:
                "linear-gradient(90deg, hsl(223 95% 25%), hsl(192 95% 66%))",
            }}
          />
          beam = weight (thin/dim → thick/bright)
        </span>
      </div>
    </div>
  );
}
