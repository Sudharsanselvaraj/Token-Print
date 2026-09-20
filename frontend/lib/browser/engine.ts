import { create } from "zustand";
import { dispatchRawFrame, type LocalEngine } from "../generation";
export const useBrowserProgress = create<{ message: string }>(() => ({
  message: "",
}));
let worker: Worker | null = null;
export const browserEngine: LocalEngine = (prompt, opts, sink) => {
  let closed = false;
  useBrowserProgress.setState({
    message: "Preparing GPT-2 (~500 MB download, cached by the browser)…",
  });
  if (!worker)
    worker = new Worker(new URL("./inference.worker.ts", import.meta.url), {
      type: "module",
    });
  const active = worker;
  active.onmessage = ({ data }) => {
    if (closed) return;
    if (data.type === "progress")
      useBrowserProgress.setState({ message: data.message });
    else {
      dispatchRawFrame(data, sink);
      if (data.type === "meta")
        useBrowserProgress.setState({
          message: `Running GPT-2 on ${data.device}`,
        });
      if (data.type === "done" || data.type === "error")
        useBrowserProgress.setState({ message: "" });
    }
  };
  active.onerror = (event) => {
    if (!closed)
      sink.onError(
        `Browser worker failed: ${event.message}. Reload or select the Python backend.`,
      );
  };
  active.postMessage({ prompt, opts });
  return {
    close() {
      closed = true;
      active.terminate();
      if (worker === active) worker = null;
      useBrowserProgress.setState({ message: "" });
      sink.onClose();
    },
  };
};
