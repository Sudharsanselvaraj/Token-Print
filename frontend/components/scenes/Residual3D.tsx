"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { SpatialMatrixPlane } from "./SpatialMatrixPlane";
import { LAYOUT } from "./ArchitectureLayout";
import { getLayerPorts } from "./TransformerPortSystem3D";

interface Residual3DProps {
  layerIndex: number;
  selectedTensor?: string | null;
  activeOpKind?: string | null;
  isActiveLayer?: boolean;
  onSelectOp?: (opId: string) => void;
}

/**
 * Local 3D Residual Routing System with Green (#22c55e) Semantic Accent for Residual Add operations.
 */
export const Residual3D = React.memo(function Residual3D({
  layerIndex: l,
  selectedTensor = null,
  activeOpKind = null,
  isActiveLayer = false,
  onSelectOp,
}: Residual3DProps) {
  const handleOp = (opKind: string) => {
    const opId = `op_l${l}_${opKind}`;
    onSelectOp?.(opId);
  };

  const isOpActive = (opKind: string) => isActiveLayer && activeOpKind === opKind;

  const ports = useMemo(() => getLayerPorts(l), [l]);
  const inp = ports.inputPorts;
  const out = ports.outputPorts;

  // Y positions
  const RES1_Y = -2.4;
  const RES2_Y = -7.2;

  // 1. Attention residual bypass curve: Norm1.input -> around Attention -> Res1.input
  const attnBypassCurve = useMemo(() => {
    const p1 = new THREE.Vector3(...inp.norm1);
    const pMid = new THREE.Vector3(LAYOUT.SPINE_X - 1.6, (inp.norm1[1] + inp.res1_attn[1]) / 2, LAYOUT.SPINE_Z + 1.2);
    const p2 = new THREE.Vector3(...inp.res1_attn);
    const curve = new THREE.QuadraticBezierCurve3(p1, pMid, p2);
    return curve.getPoints(24);
  }, [inp]);

  // 2. MLP residual bypass curve: Norm2.input -> around MLP -> Res2.input
  const mlpBypassCurve = useMemo(() => {
    const p1 = new THREE.Vector3(...inp.norm2);
    const pMid = new THREE.Vector3(LAYOUT.SPINE_X - 1.6, (inp.norm2[1] + inp.res2_mlp[1]) / 2, LAYOUT.SPINE_Z + 1.2);
    const p2 = new THREE.Vector3(...inp.res2_mlp);
    const curve = new THREE.QuadraticBezierCurve3(p1, pMid, p2);
    return curve.getPoints(24);
  }, [inp]);

  // 3. O.output -> Res1.input
  const oToRes1Line: [number, number, number][] = useMemo(() => [
    out.o,
    inp.res1_attn,
  ], [out.o, inp.res1_attn]);

  // 4. Down.output -> Res2.input
  const downToRes2Line: [number, number, number][] = useMemo(() => [
    out.down,
    inp.res2_mlp,
  ], [out.down, inp.res2_mlp]);

  // 5. Inter-layer connection: Res2.output -> Next Layer Norm1.input
  const toNextLayerLine: [number, number, number][] = useMemo(() => [
    out.res2,
    [0, -LAYOUT.LAYER_HEIGHT + inp.norm1[1], LAYOUT.NORM_Z],
  ], [out.res2, inp.norm1]);

  const isRes1Active = isOpActive("res_add1");
  const isRes2Active = isOpActive("res_add2");

  return (
    <group>
      {/* Attention Residual Bypass Curve */}
      <Line
        points={attnBypassCurve}
        color={isRes1Active ? "#ffffff" : "#737373"}
        lineWidth={isRes1Active ? 2.5 : 1.6}
        transparent
        opacity={isRes1Active ? 1.0 : isActiveLayer ? 0.95 : 0.5}
      />

      {/* MLP Residual Bypass Curve */}
      <Line
        points={mlpBypassCurve}
        color={isRes2Active ? "#ffffff" : "#737373"}
        lineWidth={isRes2Active ? 2.5 : 1.6}
        transparent
        opacity={isRes2Active ? 1.0 : isActiveLayer ? 0.95 : 0.5}
      />

      {/* O Proj Output -> Res1 Input Wire */}
      <Line
        points={oToRes1Line}
        color={isRes1Active ? "#ffffff" : "#525252"}
        lineWidth={isRes1Active ? 2.5 : 1.3}
        transparent
        opacity={isRes1Active ? 1.0 : isActiveLayer ? 0.85 : 0.4}
      />

      {/* Down Proj Output -> Res2 Input Wire */}
      <Line
        points={downToRes2Line}
        color={isRes2Active ? "#ffffff" : "#525252"}
        lineWidth={isRes2Active ? 2.5 : 1.3}
        transparent
        opacity={isRes2Active ? 1.0 : isActiveLayer ? 0.85 : 0.4}
      />

      {/* Inter-layer connection */}
      <Line
        points={toNextLayerLine}
        color="#737373"
        lineWidth={1.4}
        transparent
        opacity={isActiveLayer ? 0.9 : 0.45}
      />

      {/* ── Residual Add 1 Block (x = x + Attn) ── */}
      <SpatialMatrixPlane
        position={[LAYOUT.SPINE_X, RES1_Y, LAYOUT.SPINE_Z]}
        size={[LAYOUT.RES_SIZE[0], LAYOUT.RES_SIZE[1]]}
        depth={LAYOUT.RES_SIZE[2]}
        rows={1} cols={8}
        label="+ Residual 1"
        sublabel="x = x + Attn"
        accentColor="#ffffff"
        activeHighlight={isRes1Active}
        onClick={() => handleOp("res_add1")}
      />

      {/* ── Residual Add 2 Block (x = x + MLP) ── */}
      <SpatialMatrixPlane
        position={[LAYOUT.SPINE_X, RES2_Y, LAYOUT.SPINE_Z]}
        size={[LAYOUT.RES_SIZE[0], LAYOUT.RES_SIZE[1]]}
        depth={LAYOUT.RES_SIZE[2]}
        rows={1} cols={8}
        label="+ Residual 2"
        sublabel="x = x + MLP"
        accentColor="#ffffff"
        activeHighlight={isRes2Active}
        onClick={() => handleOp("res_add2")}
      />
    </group>
  );
});
