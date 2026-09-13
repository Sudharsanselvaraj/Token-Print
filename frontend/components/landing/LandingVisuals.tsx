"use client";

import React, { useId, useMemo } from "react";
import { Plus } from "lucide-react";
import { generateHeroPointCloud, generateAttentionConnections } from "@/lib/landing/visuals";

// 1. Large Computational Hero Visual
export function ComputationalHeroVisual() {
  const maskId = useId();
  const points = useMemo(() => generateHeroPointCloud(180), []);
  const lines = useMemo(() => generateAttentionConnections(14), []);

  return (
    <div className="landing-hero-visual-wrapper" aria-hidden="true">
      {/* High-fidelity 3D Point-Cloud Tensor Background Image from user */}
      <img
        src="/backgrounds/hero-pointcloud.png"
        alt="TokenPrint computational 3D tensor field"
        className="landing-hero-bg-img"
      />

      {/* Layered SVG animation points over top for subtle deterministic motion */}
      <svg className="landing-hero-svg-overlay" viewBox="0 0 900 500" fill="none">
        <defs>
          <radialGradient id={maskId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g mask={`url(#${maskId})`}>
          {lines.map((l, i) => (
            <line
              key={`h-line-${i}`}
              x1={l.x1 + 240}
              y1={l.y1 + 100}
              x2={l.x2 + 240}
              y2={l.y2 + 100}
              stroke="#4C86FF"
              strokeWidth="0.75"
              strokeOpacity={l.opacity * 0.5}
              strokeDasharray={i % 3 === 0 ? "4 4" : undefined}
            />
          ))}
          {points.map((p, idx) => (
            <circle
              key={`p-${idx}`}
              cx={p.x + 450}
              cy={p.y + 250}
              r={p.size * 0.7}
              fill={idx % 9 === 0 ? "#4C86FF" : "#F3F5F8"}
              fillOpacity={p.alpha * 0.6}
            />
          ))}
        </g>
      </svg>

      {/* Deep vignette overlays blending image to #000000 black canvas */}
      <div className="landing-hero-vignette" />
    </div>
  );
}

// 2. Center Stage Visual for Pinned Storyteller (driven by active step index 0..4)
export function PinnedStoryVisual({ stepIndex }: { stepIndex: number }) {
  const gradientId = useId();

  return (
    <div className="landing-pinned-visual-wrap">
      <svg className="landing-pinned-svg" viewBox="0 0 540 380" fill="none">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4C86FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#F3F5F8" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Outer Frame Lines */}
        <rect x="20" y="20" width="500" height="340" rx="6" stroke="#262B35" strokeWidth="1" fill="#0A0A0A" />

        {/* State 0: Tokenization */}
        {stepIndex === 0 && (
          <g className="visual-fade-in">
            <text x="40" y="55" fill="#767E8C" fontFamily="monospace" fontSize="11" letterSpacing="2">
              VOCABULARY MAPPING [BPE ENCODING]
            </text>
            {Array.from({ length: 48 }).map((_, i) => {
              const row = Math.floor(i / 8);
              const col = i % 8;
              const cx = 70 + col * 55;
              const cy = 90 + row * 45;
              const isSelected = i === 14 || i === 27 || i === 38;
              return (
                <g key={`tok-${i}`}>
                  <rect
                    x={cx - 18}
                    y={cy - 12}
                    width="36"
                    height="24"
                    rx="3"
                    fill={isSelected ? "#12151B" : "#0A0A0A"}
                    stroke={isSelected ? "#4C86FF" : "#262B35"}
                    strokeWidth={isSelected ? "1.5" : "1"}
                  />
                  <text
                    x={cx}
                    y={cy + 3}
                    textAnchor="middle"
                    fill={isSelected ? "#4C86FF" : "#AEB5C2"}
                    fontFamily="monospace"
                    fontSize="10"
                  >
                    #{1024 + i * 37}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* State 1: Embedding */}
        {stepIndex === 1 && (
          <g className="visual-fade-in">
            <text x="40" y="55" fill="#767E8C" fontFamily="monospace" fontSize="11" letterSpacing="2">
              D_MODEL VECTOR SPACE + RoPE PHASE
            </text>
            {Array.from({ length: 16 }).map((_, i) => {
              const y = 90 + i * 16;
              const val = Math.sin(i * 0.6) * 120 + 200;
              return (
                <g key={`emb-${i}`}>
                  <line x1="60" y1={y} x2="480" y2={y} stroke="#262B35" strokeWidth="0.5" />
                  <rect x="60" y={y - 3} width={val} height="6" rx="2" fill="#4C86FF" fillOpacity={0.4 + (i % 4) * 0.15} />
                  <circle cx={60 + val} cy={y} r="3" fill="#F3F5F8" />
                </g>
              );
            })}
          </g>
        )}

        {/* State 2: Attention */}
        {stepIndex === 2 && (
          <g className="visual-fade-in">
            <text x="40" y="55" fill="#767E8C" fontFamily="monospace" fontSize="11" letterSpacing="2">
              ATTENTION MASS MATRIX [Q × K^T / √d_k]
            </text>
            {Array.from({ length: 8 }).map((_, r) =>
              Array.from({ length: 8 }).map((_, c) => {
                const opacity = (r === c ? 0.9 : Math.abs(r - c) < 3 ? 0.45 : 0.1);
                return (
                  <rect
                    key={`att-${r}-${c}`}
                    x={130 + c * 38}
                    y={85 + r * 32}
                    width="32"
                    height="26"
                    rx="2"
                    fill={r === c ? "#4C86FF" : "#F3F5F8"}
                    fillOpacity={opacity}
                    stroke="#262B35"
                    strokeWidth="0.5"
                  />
                );
              })
            )}
          </g>
        )}

        {/* State 3: MLP */}
        {stepIndex === 3 && (
          <g className="visual-fade-in">
            <text x="40" y="55" fill="#767E8C" fontFamily="monospace" fontSize="11" letterSpacing="2">
              SwiGLU DUAL-PATH PROJECTION & RESIDUAL
            </text>
            <path d="M 60 190 C 150 190, 180 110, 270 110" stroke="#4C86FF" strokeWidth="2" fill="none" />
            <path d="M 60 190 C 150 190, 180 270, 270 270" stroke="#F3F5F8" strokeWidth="2" fill="none" strokeDasharray="4 4" />
            <rect x="270" y="90" width="80" height="40" rx="4" fill="#12151B" stroke="#4C86FF" strokeWidth="1.5" />
            <text x="310" y="114" textAnchor="middle" fill="#4C86FF" fontFamily="monospace" fontSize="11">Gate(W_g)</text>
            <rect x="270" y="250" width="80" height="40" rx="4" fill="#12151B" stroke="#262B35" strokeWidth="1.5" />
            <text x="310" y="274" textAnchor="middle" fill="#AEB5C2" fontFamily="monospace" fontSize="11">Up(W_u)</text>
            <path d="M 350 110 C 410 110, 420 190, 480 190" stroke="#4C86FF" strokeWidth="2" fill="none" />
            <path d="M 350 270 C 410 270, 420 190, 480 190" stroke="#F3F5F8" strokeWidth="2" fill="none" />
            <circle cx="480" cy="190" r="12" fill="#12151B" stroke="#4C86FF" strokeWidth="1.5" />
            <text x="480" y="194" textAnchor="middle" fill="#F3F5F8" fontSize="14">⊗</text>
          </g>
        )}

        {/* State 4: Generation */}
        {stepIndex === 4 && (
          <g className="visual-fade-in">
            <text x="40" y="55" fill="#767E8C" fontFamily="monospace" fontSize="11" letterSpacing="2">
              AUTOREGRESSIVE SAMPLING & KV CACHE
            </text>
            {Array.from({ length: 12 }).map((_, i) => {
              const x = 50 + i * 38;
              const height = 30 + (i === 11 ? 140 : Math.sin(i * 1.2) * 50 + 60);
              const isLatest = i === 11;
              return (
                <rect
                  key={`gen-${i}`}
                  x={x}
                  y={310 - height}
                  width="26"
                  height={height}
                  rx="3"
                  fill={isLatest ? "#4C86FF" : "#12151B"}
                  stroke={isLatest ? "#4C86FF" : "#262B35"}
                  strokeWidth="1"
                />
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
}

// 3. Enormous Data Field Visual (Signature Visual Section)
export function LargeDataFieldVisual() {
  const points = useMemo(() => generateHeroPointCloud(300), []);

  return (
    <div className="landing-large-data-wrapper" aria-hidden="true">
      <img
        src="/backgrounds/hero-pointcloud.png"
        alt="Computational tensor pointcloud background"
        className="landing-large-data-bg-img"
      />
      <svg className="landing-large-data-svg" viewBox="0 0 1100 320" fill="none">
        {/* Wave background paths */}
        <path
          d="M 0 160 Q 275 40, 550 160 T 1100 160"
          stroke="#4C86FF"
          strokeWidth="1"
          strokeOpacity="0.4"
          fill="none"
        />
        <path
          d="M 0 160 Q 275 280, 550 160 T 1100 160"
          stroke="#F3F5F8"
          strokeWidth="0.75"
          strokeOpacity="0.25"
          fill="none"
        />

        {/* Matrix Points */}
        {points.map((p, idx) => (
          <circle
            key={`ldp-${idx}`}
            cx={((p.x + 400) * 1.3) % 1100}
            cy={((p.y + 200) * 0.6) % 320}
            r={p.size * 0.7}
            fill={idx % 5 === 0 ? "#4C86FF" : "#F3F5F8"}
            fillOpacity={p.alpha * 0.6}
          />
        ))}
      </svg>
      <div className="landing-large-data-vignette" />
    </div>
  );
}

// 4. Marshal Split Section Micro Visuals
export function MicroDotGridVisual() {
  const rows = 18;
  const cols = 32;
  const maxDist = Math.sqrt(cols * cols + rows * rows);

  return (
    <div className="marshal-tile-visual image-visual">
      <svg className="marshal-dot-grid-svg" viewBox="0 0 380 220" preserveAspectRatio="xMidYMid slice" fill="none" suppressHydrationWarning>
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const dx = cols - 1 - c;
            const dy = r;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const normDist = dist / maxDist;
            const radius = Math.max(0.6, 6.2 * Math.pow(1 - normDist, 1.8));
            const opacity = Math.max(0.08, Math.min(1, Math.pow(1 - normDist, 1.4) * 0.95 + 0.08));

            return (
              <circle
                key={`dot-${r}-${c}`}
                cx={12 + c * 11.6}
                cy={12 + r * 11.4}
                r={radius}
                fill="#FFFFFF"
                fillOpacity={opacity}
                suppressHydrationWarning
              />
            );
          })
        )}
      </svg>
    </div>
  );
}

export function MicroCrosshairVisual() {
  return (
    <div className="marshal-card-micro-visual crosshair">
      <div className="crosshair-top-bar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E96A4" strokeWidth="1.5">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="2" x2="12" y2="7" />
          <line x1="12" y1="17" x2="12" y2="22" />
          <line x1="2" y1="12" x2="7" y2="12" />
          <line x1="17" y1="12" x2="22" y2="12" />
        </svg>
        <Plus size={16} className="text-[#64748B]" />
      </div>
      <div className="crosshair-grid-lines">
        <div className="grid-line horizontal" />
        <div className="grid-line vertical" />
      </div>
    </div>
  );
}

export function MicroTargetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.5">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  );
}

export function MicroLightningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.5">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}


