"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Billboard, Text, Line } from "@react-three/drei";
import { Color, Group, PerspectiveCamera, Vector3 } from "three";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { useStore } from "@/lib/store";
import { CHAPTERS } from "@/lib/walkthrough";
import TransformerStack, {
  type StackDims,
} from "./TransformerStack";
import { KIND_COLORS, type OpKind } from "@/lib/sceneColors";

const GAP = 3.4;

// ─── Flight dynamics ────────────────────────────────────────────────────────
// Purposefully tuned so long vertical transitions visibly travel through the
// model (never teleport) while close-up adjustments settle quickly.

const K_POS   = 2.4;   // position approach rate
const K_LOOK  = 2.0;   // look-at approach rate (slightly slower = camera leads)
const K_FOV   = 2.8;   // fov approach rate
const MAX_VEL = 24.0;  // max units/sec (keeps far jumps kinetic)
const CLOSE   = 0.03;  // snap threshold (stops jitter at rest)

// ─── World-space anchor resolution ──────────────────────────────────────────
// All anchors are named Object3D children of the TransformerStack rendered by
// WalkthroughScene. `scene.getObjectByName` is authoritative.

const tmpV = new Vector3();

function anchorPos(scene: THREE.Object3D, name: string | null): Vector3 | null {
  if (!name) return null;
  const obj = scene.getObjectByName(name);
  return obj ? obj.getWorldPosition(tmpV.clone()) : null;
}

// ─── Per-chapter camera shot ────────────────────────────────────────────────
// Camera offsets are *relative to the anchor's world position* — no hardcoded
// Y formulas, all positions resolved via scene traversal.

interface Shot {
  /** Returns the anchor Object3D name. `mid` is the stack midpoint layer index. */
  anchor: (mid: number) => string | null;
  /** Camera position = anchorWorld + camOffset. */
  camOffset: [number, number, number];
  /** Look-at target = anchorWorld + lookOffset. */
  lookOffset: [number, number, number];
  fov: number;
}
const OVERVIEW_FOV = 50;

const SHOTS: Record<string, Shot> = {
  overview: {
    anchor:      () => null, // special-cased
    camOffset:   [0, 0, 0],
    lookOffset:  [0, 0, 0],
    fov:         OVERVIEW_FOV,
  },
  tokenizer: {
    anchor:      () => "wt_embedding",
    camOffset:   [0, 2.8, 9.4],
    lookOffset:  [0, 1.4, 0],
    fov:         46,
  },
  embedding: {
    anchor:      () => "wt_embedding",
    camOffset:   [0.6, 1.8, 5.4],
    lookOffset:  [0, 0.15, 0],
    fov:         44,
  },
  norm: {
    anchor:      (mid) => `wt_norm_${mid}`,
    camOffset:   [3.8, 0.9, 7.8],
    lookOffset:  [0, 0.35, 0],
    fov:         42,
  },
  attention: {
    anchor:      (mid) => `wt_attn_${mid}`,
    camOffset:   [0.8, 0.85, 7.2],
    lookOffset:  [0, 0.2, 0.4],
    fov:         42,
  },
  mlp: {
    anchor:      (mid) => `wt_mlp_${mid}`,
    camOffset:   [3.6, 0.7, 7.4],
    lookOffset:  [0, 0.25, 0],
    fov:         42,
  },
  softmax: {
    anchor:      () => "wt_output",
    camOffset:   [2.8, 1.6, 9.2],
    lookOffset:  [0, 1.2, 0],
    fov:         44,
  },
};

/** Compute the overview camera goal from the embedding + output anchor Y bounds. */
function overviewGoal(
  scene: THREE.Object3D,
  nLayers: number,
): { position: [number, number, number]; target: [number, number, number]; fov: number } | null {
  const emb = anchorPos(scene, "wt_embedding");
  const out = anchorPos(scene, "wt_output");
  if (!emb || !out) return null;

  const stackTop    = emb.y + 0.5;
  const stackBot    = out.y - 0.55;
  const centerY     = (stackTop + stackBot) / 2;
  const height      = Math.max(stackTop - stackBot, 1);
  const halfFovRad  = (OVERVIEW_FOV / 2) * (Math.PI / 180);
  const dist        = (height / 2) / Math.tan(halfFovRad) * 1.18; // 18% margin for labels

  return {
    position: [dist * 0.34, centerY, dist],
    target:   [0, centerY, 0],
    fov:      OVERVIEW_FOV,
  };
}

// ─── Active operation mapping per chapter ───────────────────────────────────

function activeOp(
  sceneKey: string,
  mid: number,
  nLayers: number,
): { activeLayer: number | null; activeKind: OpKind | null } {
  switch (sceneKey) {
    case "embedding":
    case "tokenizer": return { activeLayer: -1, activeKind: "embedding" };
    case "norm":      return { activeLayer: mid, activeKind: "norm" };
    case "attention": return { activeLayer: mid, activeKind: "attn" };
    case "mlp":       return { activeLayer: mid, activeKind: "mlp" };
    case "softmax":   return { activeLayer: nLayers, activeKind: "output" };
    default:          return { activeLayer: null, activeKind: null };
  }
}

// ─── Debug overlay div ref (created once, updated via DOM) ──────────────────
let debugDiv: HTMLDivElement | null = null;

function ensureDebugDiv() {
  if (debugDiv) return debugDiv;
  debugDiv = document.createElement("div");
Object.assign(debugDiv.style, {
      position:    "fixed",
      top:         "68px",
      left:        "312px",
      width:       "280px",
      padding:     "7px 9px",
      background:  "rgba(5,5,5,0.88)",
      border:      "1px solid #2a2a2a",
      borderRadius:"4px",
      color:       "#9ca3af",
      fontFamily:  "ui-monospace, 'JetBrains Mono', 'Fira Code', monospace",
      fontSize:    "10px",
      lineHeight:  "1.55",
      whiteSpace:  "pre",
      pointerEvents: "none",
      zIndex:      "40",
      display:     "none",
    });
    debugDiv.id = "wt-debug";
    debugDiv.setAttribute("data-wt-debug", "1");
  document.body.appendChild(debugDiv);
  return debugDiv;
}

// ─── Authoritative walkthrough camera controller ────────────────────────────

function WalkthroughCameraController({
}: {
}) {
  const { camera: rawCamera, scene } = useThree();
  const cam = rawCamera as unknown as PerspectiveCamera;
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const chapterIdx  = useStore((s) => s.wtChapter);
  const nLayers     = useStore((s) => s.arch?.metadata?.num_layers) ?? 24;
  const archMeta    = useStore((s) => s.arch?.metadata);
  const wtPlaying   = useStore((s) => s.wtPlaying);
  const wtCamMode   = useStore((s) => s.wtCamMode);
  const setWtCamMode = useStore((s) => s.setWtCamMode);
  const wtCamDebug  = useStore((s) => s.wtCamDebug);

  const ch = CHAPTERS[Math.min(chapterIdx, CHAPTERS.length - 1)];
  const mid = Math.floor(nLayers / 2);

  // Current computed goal (set on chapter/mode changes, updated for overview)
  const goalPos  = useRef(new Vector3());
  const goalLook = useRef(new Vector3());
  const goalFov  = useRef(OVERVIEW_FOV);
  const goalSet  = useRef(false);

  const tmpPos  = useRef(new Vector3());
  const tmpLook = useRef(new Vector3());

  // Compute new goal whenever chapter or mode demands it
  const computeGoal = useCallback(() => {
    const shot = SHOTS[ch.scene];
    if (!shot) return;
    if (ch.scene === "overview") {
      const g = overviewGoal(scene, nLayers);
      if (g) {
        goalPos.current.set(...g.position);
        goalLook.current.set(...g.target);
        goalFov.current = g.fov;
        goalSet.current = true;
      }
      return;
    }
    const anchorName = shot.anchor(mid);
    const wp = anchorPos(scene, anchorName);
    if (!wp) return;
    goalPos.current.set(
      wp.x + shot.camOffset[0],
      wp.y + shot.camOffset[1],
      wp.z + shot.camOffset[2],
    );
    goalLook.current.set(
      wp.x + shot.lookOffset[0],
      wp.y + shot.lookOffset[1],
      wp.z + shot.lookOffset[2],
    );
    goalFov.current = shot.fov;
    goalSet.current = true;
  }, [ch.scene, mid, nLayers, scene]);

  // Trigger cinematic on chapter transition or when entering cinematic mode
  useEffect(() => {
    if (wtCamMode === "CINEMATIC") computeGoal();
  }, [wtCamMode, computeGoal]);

  // Chapter change always enters cinematic (acceptance: playback ticks continuously update state)
  useEffect(() => {
    setWtCamMode("CINEMATIC");
  }, [chapterIdx, setWtCamMode]);

  // Detect user orbit → MANUAL
  useEffect(() => {
    if (!controls) return;
    const onStart = () => setWtCamMode("MANUAL");
    controls.addEventListener("start", onStart);
    return () => controls.removeEventListener("start", onStart);
  }, [controls, setWtCamMode]);

  // Overview goal must recompute when anchors settle (after data loads); re-check periodically
  useEffect(() => {
    if (ch.scene !== "overview") return;
    // Anchor objects may not exist on first mount (Suspense); retry briefly.
    let frame = 0;
    const iv = setInterval(() => {
      computeGoal();
      frame++;
      if (frame > 120 || goalSet.current) clearInterval(iv);
    }, 50);
    return () => clearInterval(iv);
  }, [ch.scene, computeGoal]);

  // Mount retry: any chapter's anchors may not be committed on the very first
  // render; keep trying until the goal resolves (acceptance: playback ticks
  // continuously update the cinematic state).
  useEffect(() => {
    if (goalSet.current) return;
    let frame = 0;
    const iv = setInterval(() => {
      computeGoal();
      frame++;
      if (frame > 200 || goalSet.current) clearInterval(iv);
    }, 50);
    return () => clearInterval(iv);
  }, [computeGoal, goalSet]);

  // ─── Frame loop: damped cinematic flight ──────────────────────────────────
  useFrame((_, delta) => {
    if (wtCamMode === "MANUAL" || !goalSet.current || !controls) {
      updateDebug(wtCamDebug, ch, cam, controls, goalPos.current, goalLook.current, goalFov.current, wtCamMode);
      return;
    }

    const dt = Math.min(delta, 0.1); // clamp delta to avoid huge jumps after tab-away

    // ─ position ─
    const distPos = cam.position.distanceTo(goalPos.current);
    if (distPos > CLOSE) {
      const step = Math.min(K_POS * distPos, MAX_VEL) * dt;
      tmpPos.current.copy(goalPos.current).sub(cam.position).normalize();
      cam.position.addScaledVector(tmpPos.current, Math.min(step, distPos));
    }

    // ─ look-at ─
    const distLook = controls.target.distanceTo(goalLook.current);
    if (distLook > CLOSE) {
      const step = Math.min(K_LOOK * distLook, MAX_VEL * 0.7) * dt;
      tmpLook.current.copy(goalLook.current).sub(controls.target).normalize();
      controls.target.addScaledVector(tmpLook.current, Math.min(step, distLook));
    }

    // ─ fov ─
    const fovDelta = goalFov.current - cam.fov;
    if (Math.abs(fovDelta) > 0.02) {
      cam.fov += fovDelta * Math.min(K_FOV * dt, 0.35);
      cam.updateProjectionMatrix();
    }

    controls.update();

    // ─ overview goal re-resolves every frame (anchors may not exist initially) ─
    if (ch.scene === "overview") computeGoal();

    updateDebug(wtCamDebug, ch, cam, controls, goalPos.current, goalLook.current, goalFov.current, wtCamMode);
  });

  // Debug div cleanup
  useEffect(() => {
    return () => {
      if (debugDiv?.parentNode) debugDiv.parentNode.removeChild(debugDiv);
      debugDiv = null;
    };
  }, []);

  // Initial snap (first frame, before any lerp kicks in)
  useEffect(() => {
    computeGoal();
    if (goalSet.current) {
      cam.position.copy(goalPos.current);
      if (controls) {
        controls.target.copy(goalLook.current);
        controls.update();
      }
      cam.fov = goalFov.current;
      cam.updateProjectionMatrix();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/** Write camera state into the debug overlay div (no React re-render). */
function updateDebug(
  on: boolean,
  ch: { title: string; scene: string; id: string },
  camera: THREE.PerspectiveCamera,
  ctrl: OrbitControlsImpl | null,
  goalPos: Vector3,
  goalLook: Vector3,
  goalFov: number,
  camMode: string,
) {
  const div = ensureDebugDiv();
  if (!on) { div.style.display = "none"; return; }
  div.style.display = "block";
  const p = camera.position;
  const t = ctrl?.target;
  div.textContent =
    `CH ${ch.id.toUpperCase()} · ${ch.title.toUpperCase()}\n` +
    `ANCHOR goal  [${goalPos.x.toFixed(2)}, ${goalPos.y.toFixed(2)}, ${goalPos.z.toFixed(2)}]\n` +
    `CAM pos  [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}]\n` +
    `TGT look [${(t?.x ?? 0).toFixed(2)}, ${(t?.y ?? 0).toFixed(2)}, ${(t?.z ?? 0).toFixed(2)}]\n` +
    `FOV ${goalFov.toFixed(1)} (cam ${camera.fov.toFixed(1)})\n` +
    `MODE ${camMode}`;
}

// ─── Main scene ─────────────────────────────────────────────────────────────

export default function WalkthroughScene() {
  const chapterIdx  = useStore((s) => s.wtChapter);
  const archMeta    = useStore((s) => s.arch?.metadata);
  const data        = useStore((s) => s.data);
  const loading     = useStore((s) => s.loading);
  const ch    = CHAPTERS[Math.min(chapterIdx, CHAPTERS.length - 1)];
  const m     = archMeta;
  const nLayers = m?.num_layers ?? 24;
  const mid   = Math.floor(nLayers / 2);

  const dims: StackDims = useMemo(
    () => ({
      numHeads:  m?.num_heads ?? 14,
      kvHeads:   m?.num_kv_heads ?? 2,
      headDim:   m?.head_dim ?? 64,
      hidden:    m?.hidden_size ?? 896,
      ffn:       m?.ffn_size ?? 4864,
      vocab:     m?.vocab_size ?? 151936,
    }),
    [m],
  );

  const { activeLayer, activeKind } = activeOp(ch.scene, mid, nLayers);
  const opColor = (activeKind && KIND_COLORS[activeKind]) || [0.5, 0.6, 0.8];

  const tokens = data?.tokens ?? [];

  // ─── Gate: no data yet ────────────────────────────────────────────────────
  if (!data) {
    return (
      <Billboard>
        <Text
          fontSize={0.9}
          color="#5b678c"
          anchorX="center"
          anchorY="middle"
          maxWidth={14}
          textAlign="center"
        >
          {loading
            ? "Running forward pass…\n(loading real data)"
            : "No data yet.\nClick a chapter to load the example."}
        </Text>
      </Billboard>
    );
  }

  return (
    <group>
      {/* ── Camera controller ──────────────────────────────────────────── */}
      <WalkthroughCameraController />

      {/* ── Backdrop ───────────────────────────────────────────────────── */}
      {(() => {
        const stackH = (nLayers + 2) * GAP + 3;
        const homeY  = -stackH / 2;
        return (
          <mesh position={[0, homeY, 0]}>
            <boxGeometry args={[17, stackH + 3, 6]} />
            <meshBasicMaterial color="#262a33" transparent opacity={0.38} depthWrite={false} />
          </mesh>
        );
      })()}

      {/* ── Active-region emphasis band ─────────────────────────────────── */}
      {activeLayer != null && (
        <mesh position={[0, -(activeLayer + 1) * GAP, 0]}>
          <boxGeometry args={[11, GAP * 1.5, 3.2]} />
          <meshBasicMaterial
            color={new Color(...opColor)}
            transparent
            opacity={0.14}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* ── Transformer stack ──────────────────────────────────────────── */}
      <TransformerStack
        nLayers={nLayers}
        dims={dims}
        activeLayer={activeLayer}
        activeKind={activeKind}
        opColor={opColor}
        statNorm={0.7}
        gap={GAP}
      />

      {/* ── Token beads (real sentence → token IDs, visible on input-focused chapters) ─── */}
      {(ch.scene === "tokenizer" || ch.scene === "embedding" || ch.scene === "overview") && tokens.length > 0 && (
        <group position={[0, -GAP * 1.2, 1.4]}>
          {tokens.slice(0, 12).map((tok, i) => {
            const n   = Math.min(tokens.length, 12);
            const x   = (i - (n - 1) / 2) * 1.15;
            const lbl = tok.text.replace(/\n/g, "⏎").trim() || "␣";
            return (
              <group key={i} position={[x, 0, 0]}>
                <mesh>
                  <sphereGeometry args={[lbl.length <= 1 ? 0.12 : 0.16, 12, 12]} />
                  <meshBasicMaterial
                    color={ch.scene === "tokenizer" ? "#bfa8e8" : "#70c4b8"}
                    transparent
                    opacity={0.82}
                  />
                </mesh>
                <Billboard position={[0, -0.42, 0]}>
                  <Text
                    fontSize={0.22}
                    anchorX="center"
                    color="#8892a4"
                    outlineWidth={0.01}
                    outlineColor="#000000"
                  >
                    {lbl.length > 8 ? lbl.slice(0, 7) + "…" : lbl}
                  </Text>
                </Billboard>
              </group>
            );
          })}
        </group>
      )}

      {/* ── Token packet travelling through the stack ───────────────────── */}
      <group position={[2.2, 0, 0]}>
        <TokenPacket sceneKey={ch.scene} gap={GAP} nLayers={nLayers} />
      </group>

      {/* ── Endpoint labels (subtle scientific annotations) ─────────────── */}
      <Billboard position={[-4.2, 0, 0]}>
        <Text fontSize={0.22} anchorX="right" color="#6b7590">
          embeddings
        </Text>
      </Billboard>
      <Billboard position={[-3.2, -(nLayers + 1) * GAP, 0]}>
        <Text fontSize={0.22} anchorX="right" color="#6b7590">
          lm_head
        </Text>
      </Billboard>

      {/* ── Chapter accent (small scientific annotation anchored near op) ── */}
      <ChapterLabel sceneKey={ch.scene} title={ch.title} nLayers={nLayers} gap={GAP} />

      {/* ── Output prediction line (softmax chapter only) ────────────────── */}
      {ch.scene === "softmax" && data.logit_lens?.length > 0 && (
        <Billboard position={[0, -(nLayers + 2.4) * GAP, 0]}>
          <Text
            fontSize={0.28}
            anchorX="center"
            color="#8a97bd"
            outlineWidth={0.01}
            outlineColor="#000000"
          >
            {(() => {
              const top1 = data.logit_lens[data.logit_lens.length - 1][0]?.[0];
              return top1
                ? `P(next) = \u201c${top1.text}\u201d  ·  ${(top1.prob * 100).toFixed(1)}%`
                : "predicting next token\u2026";
            })()}
          </Text>
        </Billboard>
      )}

    </group>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

/** Animated token packet that tracks the active operation down the stack. */
function TokenPacket({
  sceneKey,
  gap,
  nLayers,
}: {
  sceneKey: string;
  gap: number;
  nLayers: number;
}) {
  const mid = Math.floor(nLayers / 2);
  const ref = useRef<Group>(null);
  const y   = useRef(0);
  const pulse = useRef(0);
  const wtPlaying = useStore((s) => s.wtPlaying);

  const targetY = useMemo(() => {
    switch (sceneKey) {
      case "tokenizer":
      case "embedding":
      case "overview": return -gap * 0.6;
      case "norm":
      case "attention":
      case "mlp":      return -(mid + 1) * gap + 0.6;
      case "softmax":  return -(nLayers + 1) * gap;
      default:         return -gap;
    }
  }, [sceneKey, gap, mid, nLayers]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    y.current += (targetY - y.current) * Math.min(delta * 2.2, 1);
    ref.current.position.y = y.current;
    pulse.current += delta * (wtPlaying ? 3 : 1.4);
    const s = 1 + 0.11 * Math.sin(pulse.current);
    ref.current.scale.set(s, s, s);
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial color="#70c4b8" transparent opacity={0.92} />
      </mesh>
      <Line
        points={[new Vector3(0, -2.6, 0), new Vector3(0, 0, 0)]}
        color="#70c4b8"
        lineWidth={1}
        transparent
        opacity={0.24}
      />
    </group>
  );
}

/**
 * Small chapter accent label positioned near the active operation.
 * Rendered as a monospace scientific annotation — NOT a giant UI title.
 */
function ChapterLabel({
  sceneKey,
  title,
  nLayers,
  gap,
}: {
  sceneKey: string;
  title: string;
  nLayers: number;
  gap: number;
}) {
  const scene = useThree((s) => s.scene);
  const ref = useRef<Group>(null);

  // Resolve anchor world position each render (chapter change). This label is
  // lightweight so per-render resolution is acceptable.
  const pos = useMemo(() => {
    const mid   = Math.floor(nLayers / 2);
    let anchor: string | null = null;
    switch (sceneKey) {
      case "tokenizer":
      case "embedding": anchor = "wt_embedding"; break;
      case "norm":      anchor = `wt_norm_${mid}`; break;
      case "attention": anchor = `wt_attn_${mid}`; break;
      case "mlp":       anchor = `wt_mlp_${mid}`; break;
      case "softmax":   anchor = "wt_output"; break;
      default:          anchor = null;
    }
    const wp = anchorPos(scene, anchor);
    if (wp) return [wp.x - 3.4, wp.y + 0.25, wp.z + 5] as [number, number, number];
    // Fallback (overview): centered, upper third of stack
    const homeY = -((nLayers + 1) * gap) / 2;
    return [-3.4, homeY + 8, 5] as [number, number, number];
  }, [sceneKey, scene, nLayers, gap]);

  return (
    <group ref={ref} position={pos}>
      <Billboard>
        <Text
          fontSize={0.18}
          anchorX="right"
          color="#6b7590"
          outlineWidth={0.008}
          outlineColor="#000000"
        >
          {title.toUpperCase()}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── End of file ─────────────────────────────────────────────────────────────
