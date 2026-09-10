"use client";

import { useRef, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { fetchArchitecture } from "@/lib/api";

export default function ModelLoader() {
  const loadGguf = useStore((s) => s.loadGgufFile);
  const loadTrace = useStore((s) => s.loadTrace);
  const loadArch = useStore((s) => s.loadArchitecture);
  const setArch = useStore((s) => s.setArch);
  const source = useStore((s) => s.arch?.source);
  const loading = useStore((s) => s.archLoading);
  const err = useStore((s) => s.archError);
  const genStatus = useStore((s) => s.genStatus);
  const traceSource = useStore((s) => s.traceSource);
  const [drag, setDrag] = useState(false);

  // HuggingFace checkpoint loader (merged from CheckpointLoader)
  const [modelId, setModelId] = useState("");
  const [hfLoading, setHfLoading] = useState(false);
  const [hfError, setHfError] = useState<string | null>(null);

  const loadHf = useCallback(async () => {
    const id = modelId.trim();
    if (!id) return;
    setHfLoading(true);
    setHfError(null);
    try {
      const arch = await fetchArchitecture(id);
      setArch(arch);
    } catch (e: any) {
      setHfError(e.message ?? "Failed to load checkpoint");
    } finally {
      setHfLoading(false);
    }
  }, [modelId, setArch]);

  const ggufRef = useRef<HTMLInputElement>(null);
  const traceRef = useRef<HTMLInputElement>(null);

  const onGgufFile = (f?: File | null) => {
    if (f) loadGguf(f);
  };

  const onTraceFile = (f?: File | null) => {
    if (f) loadTrace(f);
  };

  return (
    <div className="side-section">
      <div className="side-title">Load Model</div>

      {/* Option 1: live model */}
      <div className="side-note" style={{ marginTop: 8 }}>
        <b>Live model</b> — runs a real forward pass on your machine.
      </div>
      <button className="chip-btn" onClick={() => loadArch()} style={{ width: "100%", marginBottom: 4 }}>
        Use live Qwen model
      </button>

      {/* Divider */}
      <div className="side-section-divider" />

      {/* Option 2: GGUF file or trace */}
      <div className="side-note">
        <b>GGUF file</b> — inspect architecture without running the model.
        <br />
        <b>Trace file (.json)</b> — replay a recorded forward pass, no GPU needed.
      </div>
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
          const file = e.dataTransfer.files?.[0];
          if (file?.name.endsWith(".json")) {
            onTraceFile(file);
          } else {
            onGgufFile(file);
          }
        }}
        onClick={() => ggufRef.current?.click()}
      >
        <input
          ref={ggufRef}
          type="file"
          accept=".gguf"
          hidden
          onChange={(e) => onGgufFile(e.target.files?.[0])}
        />
        <div className="drop-text">
          {loading ? (
            "parsing…"
          ) : (
            <>
              Drop <b>.gguf</b> or <b>.json</b> trace here
              <br />
              or click to browse
            </>
          )}
        </div>
      </div>
      <div className="side-row">
        <button
          className="chip-btn"
          onClick={() => traceRef.current?.click()}
          title="Load a recorded trace file"
        >
          Load trace
        </button>
        <input
          ref={traceRef}
          type="file"
          accept=".json"
          hidden
          onChange={(e) => onTraceFile(e.target.files?.[0])}
        />
      </div>

      {/* Option 3: HuggingFace model id */}
      <div className="side-section-divider" />
      <div className="side-note">
        <b>HuggingFace model ID</b> — loads config metadata (no weights, instant).
      </div>
      <div className="cp-row">
        <input
          className="cp-input"
          type="text"
          placeholder="e.g. Qwen/Qwen2.5-0.5B"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadHf()}
        />
        <button
          className="cp-btn"
          onClick={loadHf}
          disabled={hfLoading || !modelId.trim()}
        >
          {hfLoading ? "…" : "Load"}
        </button>
      </div>
      {hfError && <div className="error">{hfError}</div>}

      {source && (
        <div className="drop-note" style={{ marginTop: 6 }}>
          source: {source === "gguf" ? "parsed GGUF file" : "live model (real forward pass)"}
        </div>
      )}
      {traceSource === "file" && genStatus === "done" && (
        <div className="drop-note">
          replaying recorded trace
        </div>
      )}
      {err && <div className="error">{err}</div>}
    </div>
  );
}
