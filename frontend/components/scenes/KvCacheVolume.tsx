"use client";

import { useMemo } from "react";
import { Billboard, Text } from "@react-three/drei";
import { useStore } from "@/lib/store";
import { phaseInfo } from "@/lib/playback";

const CELL_W = 0.2;
const CELL_H = 0.18;
const CELL_D = 0.18;
const GAP = 0.04;
const MAX_CACHE = 32;

export default function KvCacheVolume({
  nLayers,
  gap,
  activeLayer,
}: {
  nLayers: number;
  gap: number;
  activeLayer: number | null;
}) {
  const meta = useStore((s) => s.genMeta);
  const frame = useStore((s) => (s.playIndex >= 0 ? s.genFrames[s.playIndex] : null));

  const cacheProfile = useMemo(() => {
    // Build a per-layer snapshot of the KV-cache from the current frame's
    // perspective. Each layer shows its cached positions as cells.
    if (!frame || !meta?.uses_kv_cache) return null;
    const ph = phaseInfo(frame, meta.prompt_len ?? 0, true);
    if (!ph) return null;

    // Total cache length at this step.
    const totalLen = ph.cacheLen + ph.positions;
    // Each layer independently holds the same cache — we show the growth.
    const cacheLen = Math.min(totalLen, MAX_CACHE);

    return {
      cacheLen,
      totalLen,
      isPrefill: ph.phase === "prefill",
      newCount: ph.positions,
    };
  }, [frame, meta]);

  if (!cacheProfile) return null;

  const { cacheLen, isPrefill, newCount, totalLen } = cacheProfile;

  const totalW = cacheLen * (CELL_W + GAP) - GAP;
  const xOrigin = -7.4;

  return (
    <group position={[xOrigin, 0, 0]}>
      {/* Label */}
      <Billboard position={[0, (-1) * gap - 0.8, 0]}>
        <Text
          fontSize={0.32}
          anchorX="center"
          color="#8a97bd"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          KV-cache {totalLen}
        </Text>
      </Billboard>

      {/* Volume grid: one row per layer */}
      {Array.from({ length: nLayers }, (_, l) => {
        const yPos = -(l + 1) * gap;
        const isActive = l === activeLayer;
        const isPreFillLayer = isActive && isPrefill;

        return (
          <group key={l} position={[0, yPos, 0]}>
            {/* Row label */}
            <Billboard position={[-0.3, 0, 0]}>
              <Text
                fontSize={0.2}
                anchorX="right"
                color={isActive ? "#e6ecff" : "#4a5570"}
              >
                L{l}
              </Text>
            </Billboard>

            {/* Cache cells */}
            {Array.from({ length: cacheLen }, (_, c) => {
              const xPos = c * (CELL_W + GAP) + CELL_W / 2;
              const zDepth = 2;

              const isNewCell = isActive && c >= cacheLen - newCount;
              const isActiveCell = isActive;

              // Each cell is a mini column (depth dimension = key/value pairs)
              return (
                <group key={c} position={[xPos, 0, 0]}>
                  {Array.from({ length: zDepth }, (_, z) => {
                    const zPos = (z - (zDepth - 1) / 2) * (CELL_D + GAP);

                    let color: string;
                    let emissive: string;
                    let emissiveIntensity: number;

                    if (isPreFillLayer) {
                      // Prefill: warm purple for the initial fill
                      const t = c / Math.max(1, cacheLen - 1);
                      color = isNewCell
                        ? `hsl(${270 - t * 30}, 60%, ${50 + t * 20}%)`
                        : `hsl(270, 40%, 35%)`;
                      emissive = isNewCell ? color : "#3a3060";
                      emissiveIntensity = isNewCell ? 0.9 : 0.15;
                    } else if (isActiveCell) {
                      // Active decode layer: gradient from dim (stale) to bright (new)
                      const age = cacheLen - 1 - c;
                      if (isNewCell) {
                        // Freshly decoded token: bright warm
                        color = "#f0c060";
                        emissive = "#f0c060";
                        emissiveIntensity = 1.2;
                      } else if (cacheLen - 1 - c < newCount && age < newCount) {
                        // Just-computed but transitioning
                        const fade = age / Math.max(1, newCount);
                        color = `hsl(40, ${60 - fade * 30}%, ${65 - fade * 30}%)`;
                        emissive = color;
                        emissiveIntensity = 0.8 - fade * 0.5;
                      } else {
                        // Stale cache: deep blue-grey, dim
                        color = "#2a3040";
                        emissive = "#1a2030";
                        emissiveIntensity = 0.05;
                      }
                    } else {
                      // Inactive layer: uniform dim
                      color = "#1e2230";
                      emissive = "#101420";
                      emissiveIntensity = 0.03;
                    }

                    return (
                      <mesh
                        key={z}
                        position={[0, 0, zPos]}
                        onPointerOver={(e) => {
                          e.stopPropagation();
                          useStore.getState().setHoveredTensor(`model.layers.${l}.self_attn.k_proj.cache[pos=${c}]`);
                        }}
                        onPointerOut={(e) => {
                          e.stopPropagation();
                          useStore.getState().setHoveredTensor(null);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          useStore.getState().setSelectedTensor(`model.layers.${l}.self_attn.k_proj.cache[pos=${c}]`);
                        }}
                      >
                        <boxGeometry args={[CELL_W, CELL_H, CELL_D]} />
                        <meshStandardMaterial
                          color={color}
                          emissive={emissive}
                          emissiveIntensity={emissiveIntensity}
                          roughness={0.7}
                          metalness={0.15}
                        />
                      </mesh>
                    );
                  })}
                </group>
              );
            })}
          </group>
        );
      })}

      {/* Legend at bottom */}
      <Billboard position={[totalW / 2 + 0.6, -(nLayers + 0.5) * gap, 0]}>
        <Text fontSize={0.2} anchorX="left" color="#5a6580">
          {isPrefill ? `prefilling ${newCount} positions` : `${cacheLen - newCount} cached + ${newCount} new`}
        </Text>
      </Billboard>
    </group>
  );
}
