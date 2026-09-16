"use client";

import React, { useState, useEffect } from "react";
import ContributorsSection from "./ContributorsSection";
import { MODAL_BACKDROP_Z } from "@/lib/layers";
import ModalPortal from "./ModalPortal";
import { TOKENS } from "./primitives";

interface IssueItem {
  id: string;
  title: string;
  level: "Good First Issue" | "Intermediate" | "Advanced" | "Research";
  domain: string;
  description: string;
  file: string;
}

const ISSUES: IssueItem[] = [
  {
    id: "DOC-04",
    title: "Update GGUF setup & optional dependencies",
    level: "Good First Issue",
    domain: "Python / Packaging",
    description: "Create requirements-gguf.txt and document optional llama-cpp-python installation.",
    file: "backend/requirements-gguf.txt",
  },
  {
    id: "DOC-05",
    title: "Document GGUF dequantization limitations",
    level: "Good First Issue",
    domain: "Docs / Frontend",
    description: "Add notices clarifying that Q4_K visualizations represent approximate reconstructions.",
    file: "docs/gguf-format.md",
  },
  {
    id: "DOC-06",
    title: "Fix stale trace_client.py endpoints",
    level: "Good First Issue",
    domain: "Python Scripting",
    description: "Update script to use current /trace and /ws/generate API routes.",
    file: "scripts/trace_client.py",
  },
  {
    id: "DESIGN-02",
    title: "Add capability-aware UI controls",
    level: "Good First Issue",
    domain: "React / TS",
    description: "Dynamically disable or show capability badges for unsupported model features.",
    file: "frontend/components/ui/Sidebar.tsx",
  },
  {
    id: "ENG-06",
    title: "Add Pytest unit test suite for backend",
    level: "Intermediate",
    domain: "PyTorch / FastAPI",
    description: "Expand backend/tests/ to cover logit lens outputs, PCA reduction, and ablation hooks.",
    file: "backend/tests/",
  },
  {
    id: "ENG-07",
    title: "Add Vitest frontend unit test suite",
    level: "Intermediate",
    domain: "Next.js / TS",
    description: "Setup Vitest to test lib/formulas.ts, lib/format.ts, and lib/playback.ts.",
    file: "frontend/lib/",
  },
  {
    id: "ENG-09",
    title: "GGUF upload file-size limits & cleanup",
    level: "Intermediate",
    domain: "FastAPI / Security",
    description: "Enforce MAX_GGUF_BYTES limits and temp file cleanup policy.",
    file: "backend/app/main.py",
  },
  {
    id: "DESIGN-05",
    title: "Build Provenance Inspector panel",
    level: "Intermediate",
    domain: "React / Zustand",
    description: "Clicking any displayed statistic shows exact tensor source, layer index, and math transform.",
    file: "frontend/components/ui/ProvenanceInspector.tsx",
  },
  {
    id: "ENG-03",
    title: "Whole-layer ablation residual semantics",
    level: "Advanced",
    domain: "PyTorch Hooks",
    description: "Zero sub-layer additive deltas while preserving residual tensor pass-through.",
    file: "backend/app/ablation.py",
  },
  {
    id: "ENG-14",
    title: "Model Capability Adapter abstraction",
    level: "Advanced",
    domain: "PyTorch Models",
    description: "Define base ModelAdapter class with standard methods for Llama, Qwen, Gemma, DeepSeek.",
    file: "backend/app/adapters/",
  },
  {
    id: "RES-01",
    title: "Causal RAG Attribution Interventions",
    level: "Research",
    domain: "Interpretability",
    description: "Perform activation patching on RAG context tokens to prove causal determination.",
    file: "backend/app/ablation.py",
  },
];

interface ContributorDrawerProps {
  open: boolean;
  onClose: () => void;
}

const FILTER_TAB_MAP: Record<string, string> = {
  ALL: "All",
  "GOOD FIRST ISSUE": "Good First Issue",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  RESEARCH: "Research",
};

export default function ContributorDrawer({ open, onClose }: ContributorDrawerProps) {
  const [activeFilterKey, setActiveFilterKey] = useState<string>("ALL");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const targetLevel = FILTER_TAB_MAP[activeFilterKey] ?? "All";
  const filtered = targetLevel === "All" ? ISSUES : ISSUES.filter((i) => i.level === targetLevel);

  const openIssueUrl = (issue: IssueItem) => {
    const searchParam = encodeURIComponent(issue.title);
    window.open(`https://github.com/Sudharsanselvaraj/Token-Print/issues?q=is%3Aissue+${searchParam}`, "_blank");
  };

  return (
    <ModalPortal>
      <div
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Community & Open Source"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: MODAL_BACKDROP_Z,
          padding: "20px",
        }}
      >
      <div
        style={{
          width: "720px",
          maxWidth: "100%",
          maxHeight: "85vh",
          background: "#0c0d10",
          border: "1px solid #26262b",
          borderRadius: 10,
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.9)",
          display: "flex",
          flexDirection: "column",
          color: "#f4f4f5",
          fontFamily: TOKENS.fontSans,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 20px 14px",
            borderBottom: "1px solid #26262b",
            background: "rgba(255,255,255,0.01)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: "1px solid #3c3c42",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.03)",
                color: "#f4f4f5",
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: "14.5px", fontWeight: 600, color: "#f4f4f5", lineHeight: 1.2 }}>
                Community & Open Source
              </h2>
              <div style={{ fontSize: "11px", color: "#71717a", marginTop: 2 }}>
                Contributors, open issues, and ways to help improve TokenPrint
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close (Esc)"
            style={{
              width: 28,
              height: 28,
              borderRadius: 5,
              border: "1px solid #26262b",
              background: "transparent",
              color: "#a1a1aa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.12s ease",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div
          style={{
            padding: "20px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Section 1: Contributors */}
          <ContributorsSection />

          <div style={{ height: "1px", background: "#26262b" }} />

          {/* Section 2: Open Issues */}
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "12px" }}>
              <div
                style={{
                  fontSize: "9.5px",
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  color: "#71717a",
                  fontFamily: TOKENS.fontSans,
                }}
              >
                OPEN CONTRIBUTOR ISSUES
              </div>
              <div style={{ fontSize: "11.5px", color: "#a1a1aa" }}>
                Select an issue to inspect details or claim on GitHub.
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "12px" }}>
              {["ALL", "GOOD FIRST ISSUE", "INTERMEDIATE", "ADVANCED", "RESEARCH"].map((tabKey) => {
                const isActive = activeFilterKey === tabKey;
                return (
                  <button
                    key={tabKey}
                    onClick={() => setActiveFilterKey(tabKey)}
                    style={{
                      padding: "4px 9px",
                      fontSize: "9.5px",
                      fontWeight: isActive ? 600 : 500,
                      fontFamily: TOKENS.fontSans,
                      letterSpacing: "0.04em",
                      borderRadius: "4px",
                      border: "1px solid " + (isActive ? "#ffffff" : "#26262b"),
                      background: isActive ? "#ffffff" : "transparent",
                      color: isActive ? "#000000" : "#a1a1aa",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tabKey}
                  </button>
                );
              })}
            </div>

            {/* Issue Rows Container */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => openIssueUrl(item)}
                  title={`Open "${item.title}" on GitHub`}
                  style={{
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid #26262b",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span
                        style={{
                          fontFamily: TOKENS.fontMono,
                          fontSize: "10.5px",
                          fontWeight: 700,
                          color: "#f4f4f5",
                          flexShrink: 0,
                        }}
                      >
                        {item.id}
                      </span>
                      <span
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 600,
                          color: "#f4f4f5",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.title}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: "9px",
                        fontFamily: TOKENS.fontMono,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        border: "1px solid #3c3c42",
                        color: "#a1a1aa",
                        flexShrink: 0,
                      }}
                    >
                      {item.level}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: "11.5px", color: "#a1a1aa", lineHeight: 1.4 }}>
                    {item.description}
                  </p>

                  <div
                    style={{
                      fontFamily: TOKENS.fontMono,
                      fontSize: "9.5px",
                      color: "#71717a",
                      letterSpacing: "0.03em",
                      marginTop: 2,
                    }}
                  >
                    DOMAIN: {item.domain} · TARGET: {item.file}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 20px",
            borderTop: "1px solid #26262b",
            background: "rgba(255,255,255,0.01)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <a
              href="https://github.com/Sudharsanselvaraj/Token-Print"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "11px", color: "#a1a1aa", textDecoration: "none" }}
            >
              View on GitHub ↗
            </a>
            <span style={{ color: "#3c3c42" }}>·</span>
            <a
              href="https://github.com/Sudharsanselvaraj/Token-Print/issues"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "11px", color: "#a1a1aa", textDecoration: "none" }}
            >
              Browse Issues ↗
            </a>
          </div>

          <a
            href="https://github.com/Sudharsanselvaraj/Token-Print/issues/new"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 600,
              fontFamily: TOKENS.fontSans,
              color: "#ffffff",
              background: "#26262b",
              border: "1px solid #3c3c42",
              borderRadius: 4,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "background 0.12s",
            }}
          >
            Create New Issue →
          </a>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
