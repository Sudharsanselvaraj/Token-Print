import type { StoreState } from "./types";

export function genResetFields(): Partial<StoreState> {
  return {
    genStatus: "streaming",
    genMeta: null,
    genDone: null,
    genFrames: [],
    genText: "",
    genError: null,
    playIndex: -1,
    isPlaying: false,
    opIndex: 0,
    opPlaying: false,
    autoStarted: false,
    traceSource: "live" as const,
    data: null,
    generationTimestamp: Date.now(),
    debugSnapshots: {},
    debugSnapshotError: null,
  };
}
