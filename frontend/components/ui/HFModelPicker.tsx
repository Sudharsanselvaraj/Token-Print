"use client";

import React, { useState, useEffect } from "react";
import {
  CuratedModel,
  HFInspectResponse,
  HFModelMeta,
  HFSearchResponse,
} from "../../lib/types";
import { fetchHFCurated, searchHFModels, inspectHFModel } from "../../lib/api";

// Clean inline SVG icon helpers to avoid external package dependencies
const IconSparkles = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const IconSearch = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const IconX = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconShieldCheck = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const IconInfo = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconCpu = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const IconCloud = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 001-9.9 5 5 0 00-9.5-1.4A4.002 4.002 0 003 15z" />
  </svg>
);

const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const IconAlert = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const IconDownload = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const IconHeart = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

interface HFModelPickerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelectModel?: (modelId: string) => void;
}

export function HFModelPicker({ isOpen = true, onClose = () => {}, onSelectModel }: HFModelPickerProps) {
  const [activeTab, setActiveTab] = useState<"curated" | "search">("curated");
  const [curatedModels, setCuratedModels] = useState<CuratedModel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<HFModelMeta[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedModelId, setSelectedModelId] = useState<string | null>("Qwen/Qwen2.5-0.5B-Instruct");
  const [inspectData, setInspectData] = useState<HFInspectResponse | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Fetch curated models on mount
  useEffect(() => {
    if (!isOpen) return;
    fetchHFCurated()
      .then((data) => {
        if (data.models && Array.isArray(data.models)) {
          setCuratedModels(data.models);
        }
      })
      .catch((err) => console.error("Failed to load curated models:", err));
  }, [isOpen]);

  // Debounced HF Hub search
  useEffect(() => {
    if (!searchQuery.trim() || activeTab !== "search") return;
    const timer = setTimeout(() => {
      setIsSearching(true);
      searchHFModels(searchQuery, 12)
        .then((data: HFSearchResponse) => {
          setSearchResults(data.models || []);
          setIsSearching(false);
        })
        .catch((err) => {
          console.error("HF search error:", err);
          setIsSearching(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Fetch model capability inspection when selected model changes
  useEffect(() => {
    if (!selectedModelId) return;
    setIsInspecting(true);
    setInspectError(null);
    inspectHFModel(selectedModelId)
      .then((data: HFInspectResponse) => {
        setInspectData(data);
        setIsInspecting(false);
      })
      .catch((err) => {
        console.error("HF inspect error:", err);
        setInspectError(`Failed to inspect model capabilities for ${selectedModelId}: ${err.message || err}`);
        setIsInspecting(false);
      });
  }, [selectedModelId]);

  if (!isOpen) return null;

  const getCompatibilityBadge = (level: string) => {
    switch (level) {
      case "High":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "Partial":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "Basic":
        return "bg-sky-500/20 text-sky-300 border-sky-500/30";
      default:
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <IconSparkles />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                Hugging Face Model Explorer
              </h2>
              <p className="text-xs text-slate-400">
                Discover models, inspect internal capabilities, and evaluate TokenPrint compatibility
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <IconX />
          </button>
        </div>

        {/* Body grid: 2 columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Navigation + Catalog/Search */}
          <div className="md:col-span-5 border-r border-slate-800/80 flex flex-col bg-slate-950/30 overflow-hidden">
            
            {/* Tabs */}
            <div className="p-3 border-b border-slate-800/60 flex gap-2">
              <button
                onClick={() => setActiveTab("curated")}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "curated"
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <IconSparkles /> Curated Models
              </button>
              <button
                onClick={() => setActiveTab("search")}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "search"
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <IconSearch /> Search Hub
              </button>
            </div>

            {/* Content area */}
            {activeTab === "curated" ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Recommended Compatible Models
                </div>
                {curatedModels.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModelId(m.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      selectedModelId === m.id
                        ? "bg-purple-950/40 border-purple-500/50 shadow-lg shadow-purple-950/20"
                        : "bg-slate-900/40 border-slate-800/60 hover:border-slate-700/80 hover:bg-slate-900/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-200 font-mono truncate">
                        {m.id}
                      </span>
                      {m.recommended && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Curated
                        </span>
                      )}
                    </div>
                    {m.description && (
                      <p className="text-xs text-slate-400 mb-2 line-clamp-2">{m.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Family: <span className="text-slate-300 uppercase font-mono">{m.family}</span></span>
                      <span>Min VRAM: <span className="text-slate-300 font-mono">{m.minimum_memory_gb} GB</span></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden p-3">
                <div className="relative mb-3">
                  <div className="absolute left-3 top-2.5 text-slate-400">
                    <IconSearch />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Hugging Face Hub (e.g. qwen, llama, gpt2)..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {isSearching ? (
                    <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      Searching Hugging Face Hub...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedModelId(item.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          selectedModelId === item.id
                            ? "bg-purple-950/40 border-purple-500/50 shadow-lg"
                            : "bg-slate-900/40 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/80"
                        }`}
                      >
                        <div className="font-mono text-xs font-semibold text-slate-200 truncate mb-1">
                          {item.id}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <IconDownload /> {item.downloads.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <IconHeart /> {item.likes.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400">
                      {searchQuery ? "No models found matching query." : "Type a model name to search HF Hub."}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Model Capabilities & Inspection Details */}
          <div className="md:col-span-7 p-6 overflow-y-auto flex flex-col bg-slate-900/50">
            {isInspecting ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs gap-3 py-20">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span>Evaluating architecture & deterministic capability matrix...</span>
              </div>
            ) : inspectError ? (
              <div className="flex-1 flex flex-col items-center justify-center text-rose-400 text-xs gap-2 py-20">
                <IconAlert />
                <span>{inspectError}</span>
              </div>
            ) : inspectData ? (
              <div className="space-y-6">
                
                {/* Selected Model Card */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-base font-semibold font-mono text-slate-100">{inspectData.model_id}</h3>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Revision SHA: <code className="text-slate-300">{inspectData.revision.substring(0, 12)}</code></span>
                        <span>•</span>
                        <span>Arch: <code className="text-slate-300">{inspectData.architecture}</code></span>
                      </div>
                    </div>

                    {/* Compatibility Badge */}
                    <div className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${getCompatibilityBadge(inspectData.compatibility_level)}`}>
                      <IconShieldCheck />
                      <span>Estimated TokenPrint Compatibility: {inspectData.compatibility_level}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/50 flex items-start gap-1.5">
                    <span className="text-purple-400 mt-0.5"><IconInfo /></span>
                    <span>{inspectData.compatibility_reason}</span>
                  </p>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center">
                    <div className="text-[10px] uppercase text-slate-400 tracking-wider">Params</div>
                    <div className="text-sm font-semibold text-slate-200 font-mono mt-0.5">
                      {inspectData.parameter_count ? `${(inspectData.parameter_count / 1e6).toFixed(1)}M` : "Unknown"}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center">
                    <div className="text-[10px] uppercase text-slate-400 tracking-wider">Max Context</div>
                    <div className="text-sm font-semibold text-slate-200 font-mono mt-0.5">
                      {inspectData.max_context_length} tokens
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center">
                    <div className="text-[10px] uppercase text-slate-400 tracking-wider">Est. VRAM</div>
                    <div className="text-sm font-semibold text-slate-200 font-mono mt-0.5">
                      ~{inspectData.estimated_vram_gb} GB
                    </div>
                  </div>
                </div>

                {/* Capability Matrix Breakdown */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <span className="text-purple-400"><IconCpu /></span> Internal Instrumentation Capabilities
                  </h4>

                  <div className="grid grid-cols-2 gap-2.5">
                    {Object.entries(inspectData.capabilities).map(([key, item]: [string, any]) => {
                      if (typeof item !== "object" || item === null) return null;
                      const capTitle = key
                        .replace("supports_", "")
                        .replace("_", " ")
                        .toUpperCase();

                      return (
                        <div
                          key={key}
                          className={`p-3 rounded-xl border flex flex-col justify-between ${
                            item.supported
                              ? "bg-slate-950/40 border-slate-800/70"
                              : "bg-slate-950/20 border-slate-800/40 opacity-75"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-200 tracking-wide font-mono">
                              {capTitle}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                item.supported
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              }`}
                            >
                              {item.supported ? "Supported" : "Unavailable"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                            {item.reason}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3 mt-auto">
                  <button
                    disabled
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800/40 border border-slate-700/40 text-slate-500 text-xs font-medium flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <IconCloud /> Run in Cloud (Phase 2/3)
                  </button>

                  <button
                    onClick={() => {
                      if (onSelectModel && selectedModelId) {
                        onSelectModel(selectedModelId);
                        onClose();
                      }
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <IconCheck /> Use Locally
                  </button>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                Select a model on the left to inspect capabilities.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
