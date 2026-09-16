import type { GenDone, GenMeta, TokenFrame } from "./types";
import { wsGenerate } from "./ws";
import type { GenOptions } from "./ws";

/**
 * Phase 5.2a (#311): the typed, source-agnostic consumer contract for streaming
 * generation frames. The store consumes THIS; a source (the live WebSocket
 * today, an in-browser WebGPU engine in 5.2b/5.2c) produces the frames. The 3D
 * scenes keep consuming the same typed payloads no matter which source runs.
 */
export interface FrameSink {
  onMeta(frame: GenMeta): void;
  onToken(frame: TokenFrame): void;
  onDone(frame: GenDone): void;
  onError(message: string): void;
  onClose(): void;
}

/** Handle a caller can use to stop an in-flight generation early. */
export interface GenerationHandle {
  close(): void;
}

export type GenerationSource = (
  prompt: string,
  opts: GenOptions,
  sink: FrameSink,
) => GenerationHandle;

/** In-browser engine seam for 5.2b/5.2c. Registered engines are invoked by
 *  `localSource`; until one is registered the seam reports honesty that the
 *  engine is not built yet. */
export interface LocalEngine {
  (prompt: string, opts: GenOptions, sink: FrameSink): GenerationHandle;
}

let localEngine: LocalEngine | null = null;

/** Plug an in-browser engine (5.2b #312) into the store with no store changes.
 *  Pass `null` to unregister (used by tests). */
export function registerLocalEngine(engine: LocalEngine | null): void {
  localEngine = engine;
}

/** Dispatch a raw wire frame (`meta` / `token` / `done` / `error`) onto a sink. */
export function dispatchRawFrame(frame: unknown, sink: FrameSink): void {
  const raw = frame as { type?: string } & Record<string, unknown>;
  switch (raw.type) {
    case "meta":
      sink.onMeta(frame as unknown as GenMeta);
      break;
    case "token":
      sink.onToken(frame as unknown as TokenFrame);
      break;
    case "done":
      sink.onDone(frame as unknown as GenDone);
      break;
    case "error":
      sink.onError(String(raw.message ?? "error"));
      break;
  }
}

/** Default source: the live backend WebSocket (existing behavior, unchanged). */
export const wsSource: GenerationSource = (prompt, opts, sink) => {
  const ws = wsGenerate(prompt, opts, {
    onFrame: (raw) => dispatchRawFrame(raw, sink),
    // The transport path kept its own message before #311; preserve it exactly.
    onError: () => sink.onError("connection error"),
    onClose: () => sink.onClose(),
  });
  return { close: () => ws.close() };
};

/** Stub source for 5.2b/5.2c: routes to a registered in-browser engine, or
 *  reports honestly that none is available yet. */
export const localSource: GenerationSource = (prompt, opts, sink) => {
  if (localEngine) return localEngine(prompt, opts, sink);
  sink.onError(
    "In-browser engine not available yet (Phase 5.2, #312). Run with the live backend instead.",
  );
  return { close: () => undefined };
};