"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Check, X, MagnifyingGlass, ShieldCheck } from "@phosphor-icons/react";
import { BRANDS } from "@/lib/brands";

export interface ModelCompatRow {
  model_id: string;
  family: string;
  architecture_recognized: boolean;
  model_load_tested: boolean;
  forward_pass_tested: boolean;
  attention_extraction_tested: boolean;
  full_interpretability_tested: boolean;
  hf_space_deployment_verified: boolean;
  status: "fully_operational" | "partially_supported" | "unsupported" | "experimental";
  supported_features: string[];
  limitations: string[];
  notes: string;
}

export const VERIFIED_COMPATIBILITY_DATA: ModelCompatRow[] = [
  {
    model_id: "Qwen/Qwen2.5-0.5B-Instruct",
    family: "qwen",
    architecture_recognized: true,
    model_load_tested: true,
    forward_pass_tested: true,
    attention_extraction_tested: true,
    full_interpretability_tested: true,
    hf_space_deployment_verified: true,
    status: "fully_operational",
    supported_features: [
      "24 Layers Attention Matrix",
      "Residual Stream Trajectory",
      "Logit Lens Unembedding",
      "Head & Layer Ablation",
      "Activation Patching",
      "ZeroGPU CUDA Acceleration",
      "CPU Fallback",
      "WebSocket Streaming",
    ],
    limitations: [
      "ZeroGPU cold starts take ~15-25s",
      "Subject to Hugging Face Free ZeroGPU daily quota limits per IP",
    ],
    notes: "Primary resident model loaded on Hugging Face Spaces production backend.",
  },
  {
    model_id: "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
    family: "llama",
    architecture_recognized: true,
    model_load_tested: true,
    forward_pass_tested: true,
    attention_extraction_tested: true,
    full_interpretability_tested: true,
    hf_space_deployment_verified: false,
    status: "partially_supported",
    supported_features: [
      "22 Layers Attention Matrix",
      "Rotary Embeddings (RoPE)",
      "Residual Stream Vectors",
      "Local PyTorch Runtime",
    ],
    limitations: [
      "Not resident on free Hugging Face Space (local PyTorch execution only)",
      "Requires local GPU for low-latency generation",
    ],
    notes: "Verified on local CUDA / Apple Silicon MPS devices. Full attention extraction operational.",
  },
  {
    model_id: "google/gemma-2-2b",
    family: "gemma",
    architecture_recognized: true,
    model_load_tested: true,
    forward_pass_tested: true,
    attention_extraction_tested: true,
    full_interpretability_tested: false,
    hf_space_deployment_verified: false,
    status: "partially_supported",
    supported_features: [
      "Sliding Window Attention (SWA)",
      "Logit Soft-capping",
      "Gemma 2 Layer Hooks",
    ],
    limitations: [
      "Gated Hugging Face Hub checkpoint requiring user access token",
      "Higher VRAM footprint (~5.2 GB float32)",
    ],
    notes: "Gemma attention hooks verified; logit soft-capping requires custom normalization handling.",
  },
  {
    model_id: "mistralai/Mistral-7B-v0.1",
    family: "mistral",
    architecture_recognized: true,
    model_load_tested: false,
    forward_pass_tested: false,
    attention_extraction_tested: false,
    full_interpretability_tested: false,
    hf_space_deployment_verified: false,
    status: "unsupported",
    supported_features: [
      "Architecture Pattern Matching in hf_guard.py",
      "Curated Model Metadata in config/curated_models.yaml",
    ],
    limitations: [
      "Exceeds free Hugging Face Space RAM (14 GB float16 footprint)",
      "Cannot be loaded without high-memory GPU node or GGUF quantization",
    ],
    notes: "Recognized in compatibility registry; unsupported on default free-tier deployments.",
  },
  {
    model_id: "deepseek-ai/DeepSeek-V2-Lite",
    family: "deepseek",
    architecture_recognized: true,
    model_load_tested: false,
    forward_pass_tested: false,
    attention_extraction_tested: false,
    full_interpretability_tested: false,
    hf_space_deployment_verified: false,
    status: "experimental",
    supported_features: [
      "Multi-head Latent Attention (MLA) Architecture Parsing",
      "Sparse MoE Layer Topology Discovery",
    ],
    limitations: [
      "MLA projection hook not yet wired to 3D query-key renderer",
      "Requires high-memory environment",
    ],
    notes: "Experimental adapter available in app/inference/adapters/deepseek.py.",
  },
  {
    model_id: "openai-community/gpt2",
    family: "gpt2",
    architecture_recognized: true,
    model_load_tested: true,
    forward_pass_tested: true,
    attention_extraction_tested: true,
    full_interpretability_tested: true,
    hf_space_deployment_verified: false,
    status: "fully_operational",
    supported_features: [
      "In-browser ONNX Runtime Web Execution",
      "WebGPU Hardware Acceleration",
      "Client-side Tokenization",
      "Zero-install Demo",
    ],
    limitations: [
      "Desktop browsers with WebGPU only",
      "Older absolute position embedding scheme without RoPE",
    ],
    notes: "Runs 100% client-side in the browser via WebGPU ONNX Runtime.",
  },
];

export default function DocsCompatibilityMatrix() {
  const [search, setSearch] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<string>("all");

  const families = useMemo(() => {
    const list = Array.from(new Set(VERIFIED_COMPATIBILITY_DATA.map((d) => d.family)));
    return ["all", ...list];
  }, []);

  const filteredData = useMemo(() => {
    return VERIFIED_COMPATIBILITY_DATA.filter((row) => {
      const matchFamily = selectedFamily === "all" || row.family.toLowerCase() === selectedFamily.toLowerCase();
      const matchSearch =
        search === "" ||
        row.model_id.toLowerCase().includes(search.toLowerCase()) ||
        row.family.toLowerCase().includes(search.toLowerCase()) ||
        row.supported_features.some((f) => f.toLowerCase().includes(search.toLowerCase()));
      return matchFamily && matchSearch;
    });
  }, [search, selectedFamily]);

  const renderCheck = (val: boolean) => {
    if (val) {
      return (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--border)] text-white">
          <Check size={11} weight="bold" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--card)] text-[var(--faint)]">
        <X size={11} weight="bold" />
      </span>
    );
  };

  const renderStatus = (status: ModelCompatRow["status"]) => {
    switch (status) {
      case "fully_operational":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--card)] border border-[var(--border)] text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Verified
          </span>
        );
      case "partially_supported":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Partial
          </span>
        );
      case "unsupported":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--card)] border border-[var(--border)] text-[var(--faint)]">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            Unsupported
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]">
            Experimental
          </span>
        );
    }
  };

  return (
    <div className="my-8 rounded-[12px] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-[var(--border)] bg-[var(--sidebar)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} weight="fill" className="text-[var(--muted)]" />
              <h3 className="text-[13px] font-medium text-[var(--text)] tracking-tight">
                Model Verification Matrix
              </h3>
            </div>
            <p className="text-[13px] text-[var(--muted)] mt-1">
              Evidence-based compatibility verified across resident forward hooks, ZeroGPU execution, and local runtimes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <MagnifyingGlass size={14} weight="bold" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter models or features..."
                className="pl-8 pr-3 py-1.5 rounded-md bg-[var(--bg)] border border-[var(--border)] text-[12.5px] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--border-strong)] w-48 sm:w-60"
              />
            </div>
          </div>
        </div>

        {/* Family Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-[var(--border)]">
          <span className="text-[11px] font-mono text-[var(--muted)] mr-1">Family:</span>
          {families.map((fam) => {
            const brand = BRANDS[fam.toLowerCase()];
            return (
              <button
                key={fam}
                onClick={() => setSelectedFamily(fam)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-mono transition-colors ${
                  selectedFamily === fam
                    ? "bg-[var(--border)] text-[var(--text)] font-medium"
                    : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40"
                }`}
              >
                {brand?.iconPath && (
                  <Image src={brand.iconPath} alt={brand.name} width={12} height={12} className="object-contain" />
                )}
                <span>{fam.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--sidebar)] text-[11px] font-mono uppercase tracking-wider text-[var(--muted)]">
              <th className="py-3 px-4">Model Checkpoint</th>
              <th className="py-3 px-3 text-center">Recognized</th>
              <th className="py-3 px-3 text-center">Loaded</th>
              <th className="py-3 px-3 text-center">Forward</th>
              <th className="py-3 px-3 text-center">Attention</th>
              <th className="py-3 px-3 text-center">Interp</th>
              <th className="py-3 px-3 text-center">ZeroGPU</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] text-[13px] font-mono">
            {filteredData.map((row) => (
              <tr key={row.model_id} className="hover:bg-[var(--sidebar)]/50 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-[var(--text)]">
                  {row.model_id}
                </td>
                <td className="py-3.5 px-3 text-center">{renderCheck(row.architecture_recognized)}</td>
                <td className="py-3.5 px-3 text-center">{renderCheck(row.model_load_tested)}</td>
                <td className="py-3.5 px-3 text-center">{renderCheck(row.forward_pass_tested)}</td>
                <td className="py-3.5 px-3 text-center">{renderCheck(row.attention_extraction_tested)}</td>
                <td className="py-3.5 px-3 text-center">{renderCheck(row.full_interpretability_tested)}</td>
                <td className="py-3.5 px-3 text-center">{renderCheck(row.hf_space_deployment_verified)}</td>
                <td className="py-3.5 px-4">{renderStatus(row.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
