"use client";

import React from "react";

export interface LogoItem {
  id: string;
  name: string;
  svg: React.ReactNode;
}

export const ECOSYSTEM_STACK: LogoItem[] = [
  {
    id: "github",
    name: "GitHub",
    svg: (
      <svg height="26" viewBox="0 0 105 28" fill="currentColor" aria-label="GitHub">
        <path d="M12 2A10 10 0 0 0 8.84 21.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5A10 10 0 0 0 12 2z" />
        <text x="30" y="19.5" fontFamily="Inter, system-ui, sans-serif" fontWeight="600" fontSize="16.5" letterSpacing="-0.02em">GitHub</text>
      </svg>
    ),
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    svg: (
      <svg height="26" viewBox="0 0 170 28" fill="currentColor" aria-label="Hugging Face">
        <path d="M14 2.5a11.5 11.5 0 1 0 0 23 11.5 11.5 0 0 0 0-23zm-3.5 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm7 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-3.5 9c-3.2 0-5.8-2.2-6.5-5.2h13c-.7 3-3.3 5.2-6.5 5.2z" />
        <path d="M2.5 14.5c.8-1.5 2.5-2.2 4-1.5s2.2 2.5 1.5 4l-1.5 3c-.8 1.5-2.5 2.2-4 1.5s-2.2-2.5-1.5-4l1.5-3zm23 0c-.8-1.5-2.5-2.2-4-1.5s-2.2 2.5-1.5 4l1.5 3c.8 1.5 2.5 2.2 4 1.5s2.2-2.5 1.5-4l-1.5-3z" opacity="0.8" />
        <text x="34" y="19.5" fontFamily="Inter, system-ui, sans-serif" fontWeight="600" fontSize="16.5" letterSpacing="-0.02em">Hugging Face</text>
      </svg>
    ),
  },
  {
    id: "pytorch",
    name: "PyTorch",
    svg: (
      <svg height="26" viewBox="0 0 120 28" fill="currentColor" aria-label="PyTorch">
        <path d="M12 3.5c-3.5 4.5-6 8-6 11.5 0 3.3 2.7 6 6 6s6-2.7 6-6c0-3.5-2.5-7-6-11.5zm.5 6.5a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z" />
        <text x="26" y="19.5" fontFamily="Inter, system-ui, sans-serif" fontWeight="600" fontSize="16.5" letterSpacing="-0.02em">PyTorch</text>
      </svg>
    ),
  },
  {
    id: "transformers",
    name: "Transformers",
    svg: (
      <svg height="26" viewBox="0 0 160 28" fill="currentColor" aria-label="Transformers">
        <path d="M12 2.5a11.5 11.5 0 1 0 0 23 11.5 11.5 0 0 0 0-23zm-3.5 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm7 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-3.5 9c-3.2 0-5.8-2.2-6.5-5.2h13c-.7 3-3.3 5.2-6.5 5.2z" />
        <text x="30" y="19.5" fontFamily="Inter, system-ui, sans-serif" fontWeight="600" fontSize="16.5" letterSpacing="-0.02em">Transformers</text>
      </svg>
    ),
  },
  {
    id: "gguf",
    name: "GGUF",
    svg: (
      <svg height="26" viewBox="0 0 100 28" fill="currentColor" aria-label="GGUF">
        <rect x="2" y="4" width="18" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M7 9h8M7 13h8M7 17h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <text x="28" y="19.5" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="16.5" letterSpacing="0.04em">GGUF</text>
      </svg>
    ),
  },
  {
    id: "llamacpp",
    name: "Llama.cpp",
    svg: (
      <svg height="26" viewBox="0 0 128 28" fill="currentColor" aria-label="Llama.cpp">
        <path d="M6 5.5h3.5v9h6v3.5H6v-12.5zM16.5 5.5h3.5v12.5h-3.5v-12.5z" />
        <text x="26" y="19.5" fontFamily="JetBrains Mono, monospace, system-ui" fontWeight="600" fontSize="15.5" letterSpacing="-0.02em">Llama.cpp</text>
      </svg>
    ),
  },
  {
    id: "fastapi",
    name: "FastAPI",
    svg: (
      <svg height="26" viewBox="0 0 115 28" fill="currentColor" aria-label="FastAPI">
        <circle cx="12" cy="14" r="10" />
        <path d="M13 7l-5.5 8h4.5l-1 6 5.5-8h-4.5l1-6z" fill="#000000" />
        <text x="29" y="19.5" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="16.5" letterSpacing="-0.02em">FastAPI</text>
      </svg>
    ),
  },
  {
    id: "nextjs",
    name: "Next.js",
    svg: (
      <svg height="26" viewBox="0 0 105 28" fill="currentColor" aria-label="Next.js">
        <path d="M12 3a11 11 0 1 0 0 22 11 11 0 0 0 0-22zm4.2 15.3l-5-6.8v6.8H9.7V9.7h1.7l5 6.8V9.7h1.5v8.6h-1.7z" />
        <text x="29" y="19.5" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="16.5" letterSpacing="-0.03em">Next.js</text>
      </svg>
    ),
  },
  {
    id: "r3f",
    name: "React Three Fiber",
    svg: (
      <svg height="26" viewBox="0 0 195 28" fill="currentColor" aria-label="React Three Fiber">
        <ellipse cx="12" cy="14" rx="9.5" ry="3.8" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(30 12 14)" />
        <ellipse cx="12" cy="14" rx="9.5" ry="3.8" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(90 12 14)" />
        <ellipse cx="12" cy="14" rx="9.5" ry="3.8" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(150 12 14)" />
        <circle cx="12" cy="14" r="1.8" />
        <text x="29" y="19.5" fontFamily="Inter, system-ui, sans-serif" fontWeight="600" fontSize="16.5" letterSpacing="-0.02em">React Three Fiber</text>
      </svg>
    ),
  },
];
