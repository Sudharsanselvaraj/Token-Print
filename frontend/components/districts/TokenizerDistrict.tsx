"use client";

import { useEffect, useMemo, useRef } from "react";
import { Billboard, RoundedBox, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Color, Group } from "three";

import { useStore } from "@/lib/store";
import { PRESET_PROMPTS, isByteFallbackToken } from "@/lib/prompts";
import type { Token } from "@/lib/types";

const SPACING = 2.6;

function label(t: Token): string {
  if (t.piece.startsWith("<0x") || t.piece.startsWith("<byte_") || t.piece.startsWith("byte:")) {
    return t.piece;
  }
  const s = t.text.replace(/\n/g, "\\n");
  const trimmed = s.trim();
  if (trimmed.length === 0 || trimmed === "") {
    return t.piece.trim() || "␣";
  }
  return trimmed;
}

function isByteFallback(t: Token): boolean {
  return isByteFallbackToken(t);
}

function chipColor(i: number, bytefallback: boolean): Color {
  if (bytefallback) return new Color().setHSL(0.08, 0.75, 0.5);
  return new Color().setHSL((i * 0.13) % 1, 0.5, 0.55);
}

/**
 * Tokenizer District: shows the raw input string, then its tokens "breaking
 * apart" into separate chips. The chips start clustered at the center and ease
 * out to their row positions (a simple lerp animation, not physics).
 * Surrounding chips surface preset prompts in Hindi, Tamil, CJK, and English.
 */
export default function TokenizerDistrict() {
  const data = useStore((s) => s.data);
  const analyze = useStore((s) => s.analyze);
  const tokens = data?.tokens ?? [];
  const n = tokens.length;

  const targets = useMemo(
    () => tokens.map((_, i) => (i - (n - 1) / 2) * SPACING),
    [n], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const refs = useRef<Array<Group | null>>([]);

  // On a new sentence, collapse chips to the center so they animate apart.
  useEffect(() => {
    refs.current.forEach((g) => g && (g.position.x = 0));
  }, [data?.sentence]);

  useFrame(() => {
    refs.current.forEach((g, i) => {
      if (g) g.position.x += (targets[i] - g.position.x) * 0.09;
    });
  });

  if (!data) return null;

  const byteFallbackCount = tokens.filter(isByteFallback).length;

  return (
    <group>
      {/* Interactive prompt presets surfaced in the 3D district */}
      <Billboard position={[0, 6.2, 0]}>
        <group>
          {PRESET_PROMPTS.map((p, i) => {
            const total = PRESET_PROMPTS.length;
            const x = (i - (total - 1) / 2) * 2.8;
            const isCurrent = data.sentence === p.text;
            return (
              <group
                key={p.label}
                position={[x, 0, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  analyze(p.text);
                }}
              >
                <RoundedBox args={[2.4, 0.65, 0.15]} radius={0.12} smoothness={3}>
                  <meshStandardMaterial
                    color={isCurrent ? "#2563eb" : "#181e2b"}
                    emissive={isCurrent ? "#1d4ed8" : "#0d131f"}
                    emissiveIntensity={isCurrent ? 0.6 : 0.15}
                    roughness={0.4}
                    metalness={0.2}
                  />
                </RoundedBox>
                <Text
                  position={[0, 0, 0.1]}
                  fontSize={0.26}
                  anchorX="center"
                  anchorY="middle"
                  color={isCurrent ? "#ffffff" : "#94a3b8"}
                >
                  {p.label}
                </Text>
              </group>
            );
          })}
        </group>
      </Billboard>

      {/* Raw input string above the tokens. */}
      <Billboard position={[0, 4.4, 0]}>
        <Text
          fontSize={0.6}
          maxWidth={30}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          color="#e6ecff"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {`“${data.sentence}”`}
        </Text>
        <Text position={[0, -0.9, 0]} fontSize={0.28} color="#8a97bd" anchorX="center">
          tokenizer → {n} tokens
          {byteFallbackCount > 0 && ` · ${byteFallbackCount} byte-fallback`}
        </Text>
      </Billboard>

      {tokens.map((t, i) => {
        const bf = isByteFallback(t);
        const c = chipColor(i, bf);
        return (
          <group key={i} ref={(el) => void (refs.current[i] = el)}>
            <RoundedBox args={[2.0, 1.0, 0.35]} radius={0.16} smoothness={3}>
              <meshStandardMaterial
                color={c}
                emissive={c}
                emissiveIntensity={bf ? 0.35 : 0.25}
                roughness={0.5}
                metalness={0.1}
              />
            </RoundedBox>
            <Billboard>
              <Text
                position={[0, bf ? 0.12 : 0, 0.24]}
                fontSize={0.38}
                maxWidth={1.8}
                anchorX="center"
                anchorY="middle"
                color="#0a0f1c"
              >
                {label(t)}
              </Text>
              {bf && (
                <Text
                  position={[0, -0.22, 0.24]}
                  fontSize={0.15}
                  anchorX="center"
                  anchorY="middle"
                  color="#7c2d12"
                >
                  byte-fallback
                </Text>
              )}
            </Billboard>
            <Text
              position={[0, -0.85, 0]}
              fontSize={0.22}
              anchorX="center"
              anchorY="middle"
              color="#5b678c"
            >
              #{t.id}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

