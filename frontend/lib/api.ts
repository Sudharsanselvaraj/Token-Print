import type {
  AnalyzeResponse,
  ArchitectureData,
  DebugSnapshot,
  PatchResponse,
  Trace,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** POST /analyze — returns real tokens + attention from a single forward pass. */
export async function analyzeSentence(
  sentence: string,
): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sentence }),
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) {
        msg =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {
      /* non-JSON error body; keep the status message */
    }
    throw new Error(msg);
  }

  return res.json();
}

/** GET /health — liveness + which model family is loaded (issue #87). */
export async function fetchHealth(): Promise<{
  status: string;
  model_loaded: boolean;
  mode?: string | null;
  model_type?: string | null;
}> {
  try {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) return { status: "error", model_loaded: false };
    return res.json();
  } catch {
    return { status: "error", model_loaded: false };
  }
}

/** POST /analyze/image — real vision-transformer forward pass (issue #87). */
export async function analyzeImage(
  image: string,
): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_URL}/analyze/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image }),
  });
  if (!res.ok) {
    let msg = `Vision analyze failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) {
        msg = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      /* non-JSON error body; keep the status message */
    }
    throw new Error(msg);
  }
  return res.json();
}

/** GET /gguf/list — server-side GGUF files eligible for quantized generation. */
export interface GgufItem {
  name: string;
  path: string;
  size_bytes: number;
  quant: string;
  loaded: boolean;
}

export async function listGgufs(): Promise<GgufItem[]> {
  try {
    const res = await fetch(`${API_URL}/gguf/list`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.files) ? data.files : [];
  } catch {
    return [];
  }
}

/** POST /gguf/upload — stream an uploaded .gguf to the server data dir. */
export async function uploadGguf(file: File): Promise<GgufItem> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${API_URL}/gguf/upload`, {
    method: "POST",
    body,
  });
  if (!res.ok) {
    let msg = `GGUF upload failed (${res.status})`;
    try {
      const b = await res.json();
      if (b?.detail) msg = typeof b.detail === "string" ? b.detail : JSON.stringify(b.detail);
    } catch {
      /* keep status message */
    }
    throw new Error(msg);
  }
  return res.json();
}

/** POST /gguf/open — load a server GGUF's real metadata (and cache the engine). */
export async function openGguf(path: string): Promise<{
  ok: boolean;
  name?: string;
  architecture?: string;
  quant?: string;
  n_vocab?: number;
  n_ctx?: number;
  size_bytes?: number;
  detail?: string;
}> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/gguf/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
  } catch {
    return { ok: false, detail: "Backend unreachable" };
  }
  return res.ok ? res.json() : { ok: false, detail: `Open failed (${res.status})` };
}

/** GET /architecture — real model metadata + tensor list (Explorer source). */
export async function fetchArchitecture(
  modelId?: string,
): Promise<ArchitectureData> {
  const url = modelId
    ? `${API_URL}/architecture?model_id=${encodeURIComponent(modelId)}`
    : `${API_URL}/architecture`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Architecture request failed (${res.status})`);
  return res.json();
}

// --------------------------------------------------------------------------- //
// Trace (v0.2 Record & Replay)
// --------------------------------------------------------------------------- //

/**
 * Fetch the last recorded trace from the backend for download.
 * Returns null if no trace has been recorded yet.
 */
export async function fetchRecordedTrace(): Promise<Trace | null> {
  try {
    const res = await fetch(`${API_URL}/trace`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Trigger a browser download of the last recorded trace.
 * Returns true on success, false if no trace was available.
 */
export async function downloadTrace(): Promise<boolean> {
  const res = await fetch(`${API_URL}/trace`);
  if (!res.ok) return false;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tokenprint-trace.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Parse a .tokenprint.json file (drag-and-dropped or opened via file picker)
 * into a validated Trace object.  Sends the raw JSON to the backend for
 * validation, or parses it client-side if the backend is unreachable.
 */
export async function loadTraceFile(file: File): Promise<Trace> {
  const text = await file.text();
  const raw = JSON.parse(text);
  // Try backend validation first.
  try {
    const res = await fetch(`${API_URL}/trace/replay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(raw),
    });
    if (res.ok) return res.json();
  } catch {
    // Backend unavailable — fall through to client-side validation.
  }
  // Client-side fallback: basic shape check.
  if (
    typeof raw.trace_version !== "number" ||
    raw.trace_version < 1 ||
    !raw.meta ||
    !Array.isArray(raw.frames)
  ) {
    throw new Error("Invalid trace file: missing required fields");
  }
  return raw as Trace;
}

// --------------------------------------------------------------------------- //
// Debug snapshot (v0.4)
// --------------------------------------------------------------------------- //

export interface DebugAnalyzeResponse extends AnalyzeResponse {
  debug_snapshot: DebugSnapshot;
}

/** POST /debug/analyze — same as /analyze but returns intermediate outputs. */
export async function fetchDebugSnapshot(
  sentence: string,
): Promise<DebugAnalyzeResponse> {
  const res = await fetch(`${API_URL}/debug/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sentence }),
  });
  if (!res.ok) throw new Error(`Debug snapshot failed (${res.status})`);
  return res.json();
}

/** GET /debug/ops — list all captured module paths. */
export async function fetchDebugOps(): Promise<
  { path: string; label: string; params: number; dtype: string | null }[]
> {
  const res = await fetch(`${API_URL}/debug/ops`);
  if (!res.ok) return [];
  return res.json();
}

// --------------------------------------------------------------------------- //
// Activation patching (issue #75)
// --------------------------------------------------------------------------- //

/** POST /patch/analyze — target run with source residual states injected. */
export async function patchAnalyze(
  sentence: string,
  sourceSentence: string,
  patchLayers: number[],
): Promise<PatchResponse> {
  const res = await fetch(`${API_URL}/patch/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sentence,
      source_sentence: sourceSentence,
      patch_layers: patchLayers,
    }),
  });
  if (!res.ok) {
    let msg = `Patch failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) msg = JSON.stringify(body.detail);
    } catch {
      /* keep status message */
    }
    throw new Error(msg);
  }
  return res.json();
}

// --------------------------------------------------------------------------- //
// Hugging Face Discovery & Capability Inspection
// --------------------------------------------------------------------------- //

export async function fetchHFCurated(): Promise<{ models: any[] }> {
  const res = await fetch(`${API_URL}/api/hf/curated`);
  if (!res.ok) return { models: [] };
  return res.json();
}

export async function searchHFModels(query: string, limit = 10): Promise<any> {
  const url = `${API_URL}/api/hf/search?query=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return { query, limit, models: [] };
  return res.json();
}

export async function inspectHFModel(modelId: string): Promise<any> {
  const url = `${API_URL}/api/hf/inspect?model_id=${encodeURIComponent(modelId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    let msg = `HTTP error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) msg = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* fallback */
    }
    throw new Error(msg);
  }
  return res.json();
}

