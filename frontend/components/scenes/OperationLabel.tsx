"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { LAYOUT, nodeWorldPos } from "./ArchitectureLayout";
import { opById, kindLabel } from "./TransformerOperationGraph";

/**
 * OperationLabel
 *
 * Shows the currently active operation's name in the main 3D scene.
 * One label only — no duplicates, no token text leaked onto component geometry.
 * Uses inline styles only (no Tailwind).
 */
export function OperationLabel() {
  const arch3dOpId      = useStore((s) => s.arch3dOpId);
  const arch3dLayer     = useStore((s) => s.arch3dLayer);
  const arch3dPlaying   = useStore((s) => s.arch3dPlaying);
  const arch3dSpeed     = useStore((s) => s.arch3dSpeed);
  const arch            = useStore((s) => s.arch);
  const data            = useStore((s) => s.data);

  const m           = arch?.metadata;
  const numLayers   = m?.num_layers  || data?.num_layers  || 24;
  const hiddenSize  = m?.hidden_size || data?.hidden_size || 896;
  const numHeads    = m?.num_heads   || data?.num_heads   || 14;
  const kvHeads     = m?.num_kv_heads ?? 2;
  const headDim     = Math.floor(hiddenSize / numHeads);
  const ffnSize     = m?.ffn_size ?? 4864;

  const op = opById.get(arch3dOpId);

  const targetWorldPos = useMemo(() => {
    const p = nodeWorldPos(arch3dOpId, numLayers);
    // Position label slightly above and in front of the active block (Z + 1.2) to prevent collisions
    return new THREE.Vector3(p[0], p[1] + 1.1, p[2] + 1.2);
  }, [arch3dOpId, numLayers]);

  const labelGroupRef   = useRef<THREE.Group>(null);
  const currentPosRef   = useRef<THREE.Vector3>(targetWorldPos.clone());

  useFrame((_, delta) => {
    if (!labelGroupRef.current) return;
    const lerpFactor = arch3dPlaying
      ? Math.min(delta * 7.0 * arch3dSpeed, 0.4)
      : Math.min(delta * 10.0, 0.5);
    currentPosRef.current.lerp(targetWorldPos, lerpFactor);
    labelGroupRef.current.position.copy(currentPosRef.current);
  });

  if (!op) return null;

  const layerStr = op.layer != null ? `L${op.layer}` : "GLOBAL";

  // Concise dimension sublabel — no token text, no duplication
  const sublabel = (() => {
    switch (op.kind) {
      case "norm1":
      case "norm2":
      case "final_norm":   return `[${hiddenSize}]`;
      case "attn_q":       return `[${hiddenSize}→${numHeads}×${headDim}]`;
      case "attn_k":       return `[${hiddenSize}→${kvHeads}×${headDim}]`;
      case "attn_v":       return `[${hiddenSize}→${kvHeads}×${headDim}]`;
      case "rope":         return "2D Phase Rotation";
      case "attn_scores":  return "QKᵀ";
      case "attn_scale":   return "÷√d_k";
      case "attn_mask":    return "Causal Mask";
      case "attn_softmax": return "Softmax";
      case "attn_weighted_v": return "A·V";
      case "attn_o":       return `[${hiddenSize}]`;
      case "res_add1":     return "x+Attn";
      case "mlp_gate":     return `[${hiddenSize}→${ffnSize}]`;
      case "mlp_up":       return `[${hiddenSize}→${ffnSize}]`;
      case "swiglu":       return "SiLU(g)⊙u";
      case "mlp_down":     return `[${ffnSize}→${hiddenSize}]`;
      case "res_add2":     return "x+MLP";
      case "embedding":    return `[${hiddenSize}]`;
      case "lm_head":      return "Logits";
      default:             return "";
    }
  })();

  return (
    <group ref={labelGroupRef}>
      <Html
        position={[0, 0, 0]}
        center
        distanceFactor={22}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "rgba(0,0,0,0.88)",
            padding: "4px 10px",
            borderRadius: "5px",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(4px)",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: "10px",
              fontWeight: 700,
              color: "#f5f5f5",
              letterSpacing: "0.04em",
            }}
          >
            {layerStr} · {kindLabel(op.kind)}
          </span>
          {sublabel && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: "9px",
                color: "#9ca3af",
                marginTop: "1px",
              }}
            >
              {sublabel}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}
