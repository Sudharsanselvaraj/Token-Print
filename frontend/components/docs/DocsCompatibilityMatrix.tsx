"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Check, X, AlertCircle, Search, ExternalLink, ShieldCheck, Cpu } from "lucide-react";
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
    model_id: "gpt2",
    family: "gpt2",
    architecture_recognized: true,
    model_load_tested: true,
    forward_pass_tested: true,
    attention_extraction_tested: true,
    full_interpretability_tested: true,
    hf_space_deployment_verified: true,
    status: "fully_operational",
    supported_features: [
      "12 Layers Attention Matrix",
      "Residual Stream Trajectory",
      "Logit Lens Unembedding",
      "Head Ablation",
      "In-Browser WebGPU ONNX Execution",
    ],
    limitations: [
      "Classical MHA architecture; does not use RoPE or GQA",
    ],
    notes: "Verified classical baseline model; runs both in Python backend and client-side browser.",
  },
  {
    model_id: "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
    family: "llama",
    architecture_recognized: true,
    model_load_tested: true,
    forward_pass_tested: true,
    attention_extraction_tested: true,
    full_interpretability_tested: true,
    hf_space_deployment_verified: true,
    status: "fully_operational",
    supported_features: [
      "22 Layers Attention Matrix",
      "Rotary Positional Embeddings (RoPE)",
      "Residual Stream Trajectory",
      "Logit Lens",
      "Activation Patching",
    ],
    limitations: [
      "Requires ~2.2 GB VRAM for full FP16/FP32 forward hooks",
    ],
    notes: "Verified Llama-architecture candidate for compact edge deployments.",
  },
  {
    model_id: "google/gemma-2-2b",
    family: "gemma",
    architecture_recognized: true,
    model_load_tested: false,
    forward_pass_tested: false,
    attention_extraction_tested: false,
    full_interpretability_tested: false,
    hf_space_deployment_verified: false,
    status: "partially_supported",
    supported_features: ["Architecture Definition", "Gemma RMSNorm Scaling"],
    limitations: [
      "Requires sliding window attention masking and custom logit soft-capping",
      "Requires authenticated HF_TOKEN for gated access",
    ],
    notes: "Gated model family; adapter defined, requires live token to load.",
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
    supported_features: ["Architecture Definition", "Sliding Window Adapter"],
    limitations: [
      "Exceeds free ZeroGPU 14GB VRAM allocation without 4-bit quantization",
      "Not verified on Hugging Face Space free tier",
    ],
    notes: "Architecture recognized by adapter, but not verified on current zero-a10g space.",
  },
  {
    model_id: "deepseek-ai/DeepSeek-V3",
    family: "deepseek",
    architecture_recognized: true,
    model_load_tested: false,
    forward_pass_tested: false,
    attention_extraction_tested: false,
    full_interpretability_tested: false,
    hf_space_deployment_verified: false,
    status: "unsupported",
    supported_features: ["MLA Schema Definition", "MoE Routing Adapter"],
    limitations: [
      "Massive MoE model (671B); cannot run on single GPU node",
      "Requires distributed multi-node cluster",
    ],
    notes: "Architecture defined for schema compatibility only; cannot be loaded locally.",
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
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400">
          <Check size={13} strokeWidth={2.5} />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800/60 text-slate-500">
        <X size={13} strokeWidth={2} />
      </span>
    );
  };

  const renderStatus = (status: ModelCompatRow["status"]) => {
    switch (status) {
      case "fully_operational":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Verified Operational
          </span>
        );
      case "partially_supported":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/40 text-amber-300 border border-amber-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Partial / Gated
          </span>
        );
      case "unsupported":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Not Supported
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-950/40 text-indigo-300 border border-indigo-800/60">
            Experimental
          </span>
        );
    }
  };

  return (
    <div className="my-8 rounded-xl border border-slate-800 bg-[#090d16] overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-[#0d121f]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide uppercase">
                Model Verification Matrix
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Evidence-based compatibility verified across resident forward hooks, ZeroGPU execution, and local runtimes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter models or features..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-48 sm:w-60"
              />
            </div>
          </div>
        </div>

        {/* Family Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-slate-800/50">
          <span className="text-[11px] font-mono text-slate-400 mr-1">Family:</span>
          {families.map((fam) => {
            const brand = BRANDS[fam.toLowerCase()];
            return (
              <button
                key={fam}
                onClick={() => setSelectedFamily(fam)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedFamily === fam
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/60"
                }`}
              >
                {brand && (
                  <span className="w-3.5 h-3.5 relative inline-block">
                    <Image src={brand.iconPath} alt={brand.name} fill className="object-contain" />
                  </span>
                )}
                <span className="capitalize">{fam}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0b101c] text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Checkpoint</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-center">Architecture</th>
              <th className="py-3 px-3 text-center">Loaded</th>
              <th className="py-3 px-3 text-center">Forward</th>
              <th className="py-3 px-3 text-center">Attention</th>
              <th className="py-3 px-3 text-center">Ablation / Patch</th>
              <th className="py-3 px-3 text-center">HF Space</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No model checkpoints match your search query.
                </td>
              </tr>
            ) : (
              filteredData.map((row) => (
                <tr key={row.model_id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://huggingface.co/${row.model_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-slate-200 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                        >
                          <span>{row.model_id}</span>
                          <ExternalLink size={11} className="text-slate-500" />
                        </a>
                      </div>
                      <span className="text-[11px] text-slate-500 font-sans mt-0.5">{row.notes}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">{renderStatus(row.status)}</td>
                  <td className="py-3 px-3 text-center">{renderCheck(row.architecture_recognized)}</td>
                  <td className="py-3 px-3 text-center">{renderCheck(row.model_load_tested)}</td>
                  <td className="py-3 px-3 text-center">{renderCheck(row.forward_pass_tested)}</td>
                  <td className="py-3 px-3 text-center">{renderCheck(row.attention_extraction_tested)}</td>
                  <td className="py-3 px-3 text-center">{renderCheck(row.full_interpretability_tested)}</td>
                  <td className="py-3 px-3 text-center">{renderCheck(row.hf_space_deployment_verified)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-[#0b101c] border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <Cpu size={13} className="text-slate-400" />
          <span>Source: backend/app/inference/compatibility_registry.py:38</span>
        </div>
        <div>
          <span>Verification mode: STRICT FORENSIC (No unbacked claims)</span>
        </div>
      </div>
    </div>
  );
}
