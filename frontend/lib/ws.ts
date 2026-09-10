import { API_URL } from "./api";

export interface GenHandlers {
  onFrame: (frame: unknown) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

export interface GenOptions {
  maxNewTokens?: number;
  topK?: number;
  trace?: boolean;
  recordTrace?: boolean;
  decodingMode?: "greedy" | "sliding_window" | "speculative";
  windowSize?: number;
  draftGamma?: number;
  needle?: string;
}

/**
 * Open a WebSocket to the streaming-generation endpoint and forward each frame
 * (meta / token / done / error) to the handlers. Returns the socket so the
 * caller can close it early.
 */
export function wsGenerate(
  prompt: string,
  opts: GenOptions,
  handlers: GenHandlers,
): WebSocket {
  const url = API_URL.replace(/^http/, "ws") + "/ws/generate";
  const ws = new WebSocket(url);

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        prompt,
        max_new_tokens: opts.maxNewTokens ?? 40,
        top_k: opts.topK ?? 10,
        trace: opts.trace ?? false,
        record_trace: opts.recordTrace ?? false,
        decoding_mode: opts.decodingMode ?? "greedy",
        window_size: opts.windowSize ?? 512,
        draft_gamma: opts.draftGamma ?? 4,
        needle: opts.needle ?? undefined,
      }),
    );
  };
  ws.onmessage = (e) => {
    try {
      handlers.onFrame(JSON.parse(e.data));
    } catch {
      /* ignore malformed frame */
    }
  };
  ws.onerror = () => handlers.onError?.("WebSocket error");
  ws.onclose = () => handlers.onClose?.();

  return ws;
}
