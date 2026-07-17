"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";

export default function ModelLoader() {
  const loadGguf = useStore((s) => s.loadGgufFile);
  const loadArch = useStore((s) => s.loadArchitecture);
  const source = useStore((s) => s.arch?.source);
  const loading = useStore((s) => s.archLoading);
  const err = useStore((s) => s.archError);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (f?: File | null) => {
    if (f) loadGguf(f);
  };

  return (
    <div className="side-section">
      <div className="side-title">Load Model</div>
      <div
        className={"dropzone" + (drag ? " drag" : "")}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          onFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".gguf"
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <div className="drop-icon">◇</div>
        <div className="drop-text">
          {loading ? (
            "parsing…"
          ) : (
            <>
              Drop <b>.gguf</b> file here
              <br />
              or click to browse
            </>
          )}
        </div>
      </div>
      <button className="chip-btn full" onClick={() => loadArch()}>
        Use live Qwen model
      </button>
      {source && (
        <div className="drop-note">
          source: {source === "gguf" ? "parsed GGUF file" : "live model (real forward pass)"}
        </div>
      )}
      {err && <div className="error">⚠ {err}</div>}
    </div>
  );
}
