"use client";

import React from "react";

export interface LogoItem {
  id: string;
  name: string;
  svg: React.ReactNode;
}

export const ECOSYSTEM_STACK: LogoItem[] = [
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
    id: "qwen",
    name: "Qwen",
    svg: (
      <svg height="26" viewBox="0 0 95 28" fill="currentColor" aria-label="Qwen">
        <circle cx="12" cy="14" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <circle cx="12" cy="14" r="3" fill="currentColor" />
        <path d="M17.2 17.2l4 4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <text x="30" y="19.5" fontFamily="Inter, system-ui, sans-serif" fontWeight="600" fontSize="16.5" letterSpacing="-0.02em">Qwen</text>
      </svg>
    ),
  },
  {
    id: "llama",
    name: "Llama",
    svg: (
      <svg height="26" viewBox="0 0 110 28" fill="currentColor" aria-label="Llama">
        <path d="M12.5 5.5C9.5 5.5 7 8 7 11.2c-1.8.8-3 2.5-3 4.6 0 2.3 1.9 4.2 4.2 4.2h8.6c2.3 0 4.2-1.9 4.2-4.2 0-2-1.1-3.8-2.8-4.6-.1-3.1-2.7-5.7-5.7-5.7z" />
        <path d="M14.8 5.5l.8-2.3M15.6 3.2h2l-1 2.3M10.2 5.5l-.8-2.3M8.4 3.2h2l1 2.3" />
        <path d="M13 13.5l2.5 2.5-2.5 2.5L11 16l2-2.5z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <text x="26" y="19.5" fontFamily="Inter, system-ui, sans-serif" fontWeight="600" fontSize="16.5" letterSpacing="-0.02em">Llama</text>
      </svg>
    ),
  },
  {
    id: "mistral",
    name: "Mistral",
    svg: (
      <svg height="26" viewBox="0 0 125 28" fill="currentColor" aria-label="Mistral">
        <path d="M5 7l3.5 13.5h3l2.4-8 2.5 8h3L23 7h-3l2.7 9.5L19.6 7h-2.8L14 15.6 11.2 7H8.4L6 16.5 8.7 7H5z" />
        <text x="29" y="19.5" fontFamily="Inter, system-ui, sans-serif" fontWeight="600" fontSize="16.5" letterSpacing="-0.02em">Mistral</text>
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
    id: "threejs",
    name: "Three.js",
    svg: (
      <svg height="26" viewBox="0 0 125 28" fill="currentColor" aria-label="Three.js">
        <circle cx="12" cy="14" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="12" cy="6.8" r="1.7" fill="currentColor" />
        <circle cx="6.4" cy="19.6" r="1.7" fill="currentColor" />
        <circle cx="17.6" cy="19.6" r="1.7" fill="currentColor" />
        <text x="28" y="19.5" fontFamily="Inter, system-ui, sans-serif" fontWeight="600" fontSize="16.5" letterSpacing="-0.02em">Three.js</text>
      </svg>
    ),
  },
  {
    id: "webgl",
    name: "WebGL",
    svg: (
      <svg height="26" viewBox="0 0 110 28" fill="currentColor" aria-label="WebGL">
        <rect x="2" y="6" width="22" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M7.5 12.5c1.4-1.5 3.6-1.5 5 0s3.6 1.5 5 0M6 16.5c1.7-1.8 4.7-1.8 6.5 0s1.7 1.8 0 0l6.5 0" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" />
        <text x="30" y="19.5" fontFamily="Inter, system-ui, sans-serif" fontWeight="600" fontSize="16.5" letterSpacing="-0.02em">WebGL</text>
      </svg>
    ),
  },
];
