import type { StateCreator } from "zustand";
import {
  firstOpOfLayer as _firstOpOfLayer,
  nextOpId as _nextOpId,
  opById as _opById,
  prevOpId as _prevOpId,
} from "@/components/scenes/TransformerOperationGraph";
import type { Arch3dSlice, StoreState } from "./types";

export const createArch3dSlice: StateCreator<StoreState, [], [], Arch3dSlice> = (set) => ({
  graphViewMode: "full",
  setGraphViewMode: (graphViewMode) => set({ graphViewMode }),
  selectedTokenIndex: 0,
  setSelectedTokenIndex: (selectedTokenIndex) => set({ selectedTokenIndex }),
  expandedBlockId: null,
  setExpandedBlockId: (expandedBlockId) => set({ expandedBlockId }),

  cameraMode: "overview",
  setCameraMode: (cameraMode) => set({ cameraMode }),
  focusMode: false,
  toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
  expandedLayer: null,
  setExpandedLayer: (expandedLayer) => set({ expandedLayer }),

  arch3dOpId: "op_embed",
  arch3dLayer: -1,
  arch3dOpKind: "embedding",
  arch3dPlaying: false,
  arch3dSpeed: 1,

  selectArch3dOp: (opId) =>
    set((state) => {
      const op = _opById.get(opId);
      if (!op) return {};
      const layer = op.layer ?? -1;
      const cameraMode =
        state.cameraMode === "overview"
          ? "overview"
          : state.cameraMode === "token_follow"
            ? "token_follow"
            : "operation";
      return {
        arch3dOpId: opId,
        arch3dLayer: layer,
        arch3dOpKind: op.kind,
        selectedLayer: layer >= 0 ? layer : state.selectedLayer,
        selectedTensor: op.tensorName ?? state.selectedTensor,
        cameraMode,
        inspectingComponentId: opId,
      };
    }),

  stepArch3dOp: (dir) =>
    set((state) => {
      const next = dir > 0 ? _nextOpId(state.arch3dOpId) : _prevOpId(state.arch3dOpId);
      if (!next) return {};
      const op = _opById.get(next);
      if (!op) return {};
      const layer = op.layer ?? -1;
      return {
        arch3dOpId: next,
        arch3dLayer: layer,
        arch3dOpKind: op.kind,
        selectedLayer: layer >= 0 ? layer : state.selectedLayer,
        selectedTensor: op.tensorName ?? state.selectedTensor,
      };
    }),

  stepArch3dLayer: (dir) =>
    set((state) => {
      const current = state.arch3dLayer >= 0 ? state.arch3dLayer : 0;
      const next = Math.max(0, Math.min(23, current + dir));
      const opId = _firstOpOfLayer(next);
      const op = _opById.get(opId);
      return {
        arch3dOpId: opId,
        arch3dLayer: next,
        arch3dOpKind: op?.kind ?? "norm1",
        selectedLayer: next,
        selectedTensor: op?.tensorName ?? state.selectedTensor,
        cameraMode: "layer" as const,
        userOrbiting: false,
      };
    }),

  toggleArch3dPlay: () =>
    set((state) => {
      if (!state.arch3dPlaying && state.arch3dOpId === "op_lm_head") {
        return { arch3dPlaying: true, arch3dOpId: "op_embed", arch3dLayer: -1, arch3dOpKind: "embedding" };
      }
      return { arch3dPlaying: !state.arch3dPlaying };
    }),

  setArch3dSpeed: (arch3dSpeed) => set({ arch3dSpeed: Math.max(0.25, Math.min(arch3dSpeed, 4)) }),

  inspectingComponentId: null,
  inspectPreviousCamera: null,
  inspectAutoRotate: true,

  enterInspectMode: (componentId) =>
    set((state) => {
      const op = _opById.get(componentId);
      const layer = op?.layer ?? -1;
      return {
        inspectingComponentId: componentId,
        arch3dOpId: componentId,
        arch3dLayer: layer,
        arch3dOpKind: op?.kind ?? "embedding",
        selectedLayer: layer >= 0 ? layer : state.selectedLayer,
        selectedTensor: op?.tensorName ?? state.selectedTensor,
        inspectAutoRotate: true,
        userOrbiting: false,
      };
    }),

  exitInspectMode: () => set({ inspectingComponentId: null }),

  toggleInspectAutoRotate: () => set((state) => ({ inspectAutoRotate: !state.inspectAutoRotate })),

  navigateInspectComponent: (dir) =>
    set((state) => {
      if (!state.inspectingComponentId) return {};
      const next = dir > 0 ? _nextOpId(state.inspectingComponentId) : _prevOpId(state.inspectingComponentId);
      if (!next) return {};
      const op = _opById.get(next);
      const layer = op?.layer ?? -1;
      return {
        inspectingComponentId: next,
        arch3dOpId: next,
        arch3dLayer: layer,
        arch3dOpKind: op?.kind ?? "embedding",
        selectedLayer: layer >= 0 ? layer : state.selectedLayer,
        selectedTensor: op?.tensorName ?? state.selectedTensor,
        userOrbiting: false,
      };
    }),
});