"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useStore } from "@/lib/store";
import { TransformerLayer3D } from "./TransformerLayer3D";
import { LayerBlockLOD } from "./LayerBlockLOD";
import { SpatialMatrixPlane } from "./SpatialMatrixPlane";
import { PerfMonitor } from "./PerfMonitor";
import { LAYOUT, layerOrigin } from "./ArchitectureLayout";
import { TokenPacketSystem } from "./TokenPacketSystem";
import { GqaVisualization3D } from "./GqaVisualization3D";
import { AttentionBeams3D } from "./AttentionBeams3D";
import { OperationLabel } from "./OperationLabel";
import { ComponentInspectMode } from "./inspect/ComponentInspectMode";

const NUM_LAYERS = 24;

/**
 * Full 24-layer transformer spatial architecture scene.
 *
 * Layout (Y axis, top to bottom):
 *   Y=+10        Input Tokens + Embedding
 *   Y= 0         Layer 0
 *   Y=-14        Layer 1
 *   ...
 *   Y=-322       Layer 23
 *   Y=-340        Final RMSNorm
 *   Y=-354        LM Head
 *
 * Residual spine: one TubeGeometry from Embedding to LM Head.
 */
export function SpatialArchitectureScene() {
  const data = useStore((s) => s.data);
  const arch = useStore((s) => s.arch);
  const arch3dLayer = useStore((s) => s.arch3dLayer);
  const arch3dOpKind = useStore((s) => s.arch3dOpKind);
  const arch3dOpId = useStore((s) => s.arch3dOpId);
  const selectArch3dOp = useStore((s) => s.selectArch3dOp);
  const enterInspectMode = useStore((s) => s.enterInspectMode);
  const inspectingComponentId = useStore((s) => s.inspectingComponentId);
  const setSelectedTensor = useStore((s) => s.setSelectedTensor);
  const selectedTensor = useStore((s) => s.selectedTensor);
  const setCameraMode = useStore((s) => s.setCameraMode);

  const m = arch?.metadata;
  const numLayers = m?.num_layers || data?.num_layers || NUM_LAYERS;
  const numHeads = m?.num_heads || data?.num_heads || 14;
  const hiddenSize = m?.hidden_size || data?.hidden_size || 896;
  const ffnSize = m?.ffn_size || 4864;
  const vocabSize = m?.vocab_size || 151936;
  const kvHeads = m?.num_kv_heads || 2;
  const headDim = Math.floor(hiddenSize / numHeads);

  const tokens = data?.tokens || [
    { index: 0, text: "Name", id: 2437 },
    { index: 1, text: "one", id: 284 },
    { index: 2, text: "primary", id: 4331 },
    { index: 3, text: "color", id: 16326 },
    { index: 4, text: ".", id: 2456 },
  ];

  // Residual spine: a smooth CatmullRom tube from top to bottom.
  const spinePoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    // Embedding
    pts.push(new THREE.Vector3(LAYOUT.SPINE_X, LAYOUT.EMBED_Y, LAYOUT.SPINE_Z));
    // Each layer's residual add points
    for (let l = 0; l < numLayers; l++) {
      const [, ly] = layerOrigin(l);
      // res_add1
      pts.push(new THREE.Vector3(LAYOUT.SPINE_X, ly - 2.2, LAYOUT.SPINE_Z));
      // res_add2
      pts.push(new THREE.Vector3(LAYOUT.SPINE_X, ly - 7.0, LAYOUT.SPINE_Z));
    }
    // Final norm + LM head
    const lastY = -((numLayers - 1) * LAYOUT.LAYER_HEIGHT);
    pts.push(new THREE.Vector3(LAYOUT.SPINE_X, lastY - LAYOUT.FINAL_NORM_Y_OFFSET, LAYOUT.SPINE_Z));
    pts.push(new THREE.Vector3(LAYOUT.SPINE_X, lastY - LAYOUT.LM_HEAD_Y_OFFSET - 3, LAYOUT.SPINE_Z));
    return pts;
  }, [numLayers]);

  const spineCurve = useMemo(
    () => new THREE.CatmullRomCurve3(spinePoints),
    [spinePoints]
  );

  const spineGeometry = useMemo(() => {
    return new THREE.TubeGeometry(spineCurve, spinePoints.length * 4, 0.06, 6, false);
  }, [spineCurve, spinePoints.length]);

  React.useEffect(() => {
    return () => {
      spineGeometry.dispose();
    };
  }, [spineGeometry]);

  // Active layer for highlighting (from arch3dLayer)
  const activeLayer = arch3dLayer >= 0 && arch3dLayer < numLayers ? arch3dLayer : -1;

  const finalY = -((numLayers - 1) * LAYOUT.LAYER_HEIGHT);

  return (
    <group position={[0, 0, 0]}>
      <PerfMonitor />
      <OperationLabel />
      <TokenPacketSystem />
      <GqaVisualization3D />
      <AttentionBeams3D />

      {/* Main 3D Architecture Scene */}
      <group>
        {/* ── Residual Spine Tube (backbone of the model) ── */}
        <mesh geometry={spineGeometry}>
          <meshStandardMaterial
            color="#ffffff"
            emissive="#d4d4d4"
            emissiveIntensity={0.2}
            roughness={0.3}
            metalness={0.5}
          />
        </mesh>

        {/* ── 1. Input Tokens ── */}
        <group position={[0, LAYOUT.EMBED_Y + 3, LAYOUT.SPINE_Z]}>
          {tokens.map((tok, idx) => {
            const x = (idx - (tokens.length - 1) / 2) * 2.2;
            return (
              <group
                key={idx}
                position={[x, 0, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  enterInspectMode("op_embed");
                }}
              >
                <Html center distanceFactor={18} style={{ pointerEvents: "none", userSelect: "none" }}>
                  <div className="text-white font-mono text-[11px] font-bold tracking-wide whitespace-nowrap bg-black/80 px-2 py-0.5 border border-zinc-800 rounded">
                    {tok.text}
                  </div>
                </Html>
              </group>
            );
          })}
        </group>

        {/* ── 2. Embedding Block ── */}
        <SpatialMatrixPlane
          position={[0, LAYOUT.EMBED_Y, LAYOUT.NORM_Z]}
          size={LAYOUT.EMBED_SIZE.slice(0, 2) as [number, number]}
          depth={LAYOUT.EMBED_SIZE[2]}
          rows={tokens.length}
          cols={24}
          label="Embedding"
          sublabel={`${vocabSize.toLocaleString()} × ${hiddenSize}`}
          accentColor="#ffffff"
          selected={selectedTensor === "embed_tokens"}
          onClick={() => {
            enterInspectMode("op_embed");
          }}
        />

        {/* ── 3. All 24 Transformer Layers ── */}
        {Array.from({ length: numLayers }, (_, l) => {
          const [lx, ly, lz] = layerOrigin(l);
          const isActive = l === activeLayer;
          const currentAttn = data?.attention?.[l]?.[0] || null;

          if (!isActive) {
            return (
              <LayerBlockLOD
                key={l}
                position={[lx, ly, lz]}
                layerIndex={l}
              />
            );
          }

          return (
            <TransformerLayer3D
              key={l}
              position={[lx, ly, lz]}
              layerIndex={l}
              totalLayers={numLayers}
              numHeads={numHeads}
              kvHeads={kvHeads}
              hiddenSize={hiddenSize}
              ffnSize={ffnSize}
              headDim={headDim}
              tokensLength={tokens.length}
              attnMatrix={currentAttn}
              selectedTensor={selectedTensor}
              onSelectTensor={setSelectedTensor}
              onSelectOp={(opId) => enterInspectMode(opId)}
              isActive={isActive}
              activeOpKind={isActive ? arch3dOpKind : null}
              detailLevel="lod1"
            />
          );
        })}

        {/* ── 4. Final RMSNorm ── */}
        <SpatialMatrixPlane
          position={[0, finalY - LAYOUT.FINAL_NORM_Y_OFFSET, LAYOUT.NORM_Z]}
          size={LAYOUT.NORM_SIZE.slice(0, 2) as [number, number]}
          depth={LAYOUT.NORM_SIZE[2]}
          rows={1}
          cols={24}
          label="Final Norm"
          sublabel={`RMSNorm [${hiddenSize}]`}
          accentColor="#ffffff"
          selected={selectedTensor === "model.norm.weight"}
          onClick={() => {
            enterInspectMode("op_final_norm");
          }}
        />

        {/* ── 5. LM Head ── */}
        <SpatialMatrixPlane
          position={[0, finalY - LAYOUT.LM_HEAD_Y_OFFSET - 2, LAYOUT.NORM_Z]}
          size={LAYOUT.LM_SIZE.slice(0, 2) as [number, number]}
          depth={LAYOUT.LM_SIZE[2]}
          rows={tokens.length}
          cols={24}
          label="LM Head"
          sublabel={`${hiddenSize} → ${vocabSize.toLocaleString()}`}
          accentColor="#ffffff"
          selected={selectedTensor === "lm_head.weight"}
          onClick={() => {
            enterInspectMode("op_lm_head");
          }}
        />
      </group>
    </group>
  );
}
