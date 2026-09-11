"use client";

import { useCallback } from "react";
import { useStore } from "./store";

const SNAPSHOT_VERSION = 1;

export function useSnapshotUrl() {
  const mode = useStore((s) => s.mode);
  const playIndex = useStore((s) => s.playIndex);
  const genMeta = useStore((s) => s.genMeta);
  const opIndex = useStore((s) => s.opIndex);
  const wtChapter = useStore((s) => s.wtChapter);
  const arch = useStore((s) => s.arch);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("v", String(SNAPSHOT_VERSION));
    params.set("mode", mode);

    if (mode === "generation" || mode === "walkthrough") {
      if (genMeta) params.set("model", genMeta.model);
      if (playIndex > 0) params.set("token", String(playIndex));
      if (opIndex > 0) params.set("op", String(opIndex));
    }

    if (mode === "walkthrough" && wtChapter > 0) {
      params.set("chapter", String(wtChapter));
    }

    if (mode === "explorer" && arch) {
      params.set("arch_model", arch.model ?? "");
      params.set("arch_source", arch.source);
    }

    const url = `${window.location.pathname}?${params.toString()}`;
    return url;
  }, [mode, genMeta, playIndex, opIndex, wtChapter, arch]);

  const share = useCallback(() => {
    const url = buildUrl();
    navigator.clipboard.writeText(window.location.origin + url);
  }, [buildUrl]);

  return { buildUrl, share };
}
