"use client";

import { useMemo, useState } from "react";
import { useArchitectureTensors, useStore } from "@/lib/store";
import { fmtShape, middleTruncate } from "@/lib/format";

export default function TensorList() {
  const arch = useStore((s) => s.arch);
  const architectureTensors = useArchitectureTensors();
  const hovered = useStore((s) => s.hoveredTensor);
  const selected = useStore((s) => s.selectedTensor);
  const setHovered = useStore((s) => s.setHoveredTensor);
  const setSelected = useStore((s) => s.setSelectedTensor);
  const [q, setQ] = useState("");

  const tensors = useMemo(() => {
    const list = architectureTensors ?? [];
    if (!q.trim()) return list;
    const needle = q.toLowerCase();
    return list.filter((t) => t.name.toLowerCase().includes(needle));
  }, [architectureTensors, q]);

  if (!arch) return null;

  return (
    <div className="side-section tensorlist-section">
      <div className="side-title">
        Tensors <span className="muted">({arch.tensor_count})</span>
      </div>
      <input
        className="tensor-search"
        placeholder="filter tensors…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        spellCheck={false}
      />
      <div className="tensor-list">
        {tensors.map((t) => (
          <div
            key={t.name}
            className={
              "tensor-row" +
              (hovered === t.name ? " hover" : "") +
              (selected === t.name ? " selected" : "")
            }
            onMouseEnter={() => setHovered(t.name)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setSelected(t.name)}
          >
            <span className="tensor-name" title={t.name}>
              {middleTruncate(t.name)}
            </span>
            <span className="tensor-shape">{fmtShape(t.shape)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
