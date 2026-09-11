"use client";

import React, { useState } from "react";
import ContributorsSection from "./ContributorsSection";

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

export default function ContributorDrawer({ open, onClose }: ContributorDrawerProps) {
  const [filter, setFilter] = useState<string>("All");

  if (!open) return null;

  const filtered = filter === "All" ? ISSUES : ISSUES.filter((i) => i.level === filter);

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        className="modal-content contributor-drawer"
        style={{ width: "840px", maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto", zIndex: 10001, background: "var(--bg, #0f1117)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Community & Open Issues</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Dynamic GitHub Contributors Section */}
        <ContributorsSection />

        <div className="side-title" style={{ marginTop: 24, marginBottom: 12, fontSize: 13 }}>
          Open Contributor Issues
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {["All", "Good First Issue", "Intermediate", "Advanced", "Research"].map((f) => (
            <button
              key={f}
              className={`chip-btn ${filter === f ? "on" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{ maxHeight: "40vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              style={{
                background: "var(--bg-secondary, #1e293b)",
                border: "1px solid var(--border, #334155)",
                borderRadius: "6px",
                padding: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontWeight: "700", color: "var(--accent)" }}>
                  {item.id} — {item.title}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background:
                      item.level === "Good First Issue"
                        ? "rgba(34,197,94,0.2)"
                        : item.level === "Intermediate"
                        ? "rgba(255,255,255,0.1)"
                        : item.level === "Advanced"
                        ? "rgba(239,68,68,0.2)"
                        : "rgba(168,85,247,0.2)",
                    color:
                      item.level === "Good First Issue"
                        ? "#4ade80"
                        : item.level === "Intermediate"
                        ? "var(--text)"
                        : item.level === "Advanced"
                        ? "#f87171"
                        : "#c084fc",
                  }}
                >
                  {item.level}
                </span>
              </div>
              <p style={{ margin: "4px 0", fontSize: "13px", color: "#cbd5e1" }}>{item.description}</p>
              <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
                Domain: {item.domain} · Target: {item.file}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            See <a href="https://github.com/Sudharsanselvaraj/Token-Print/blob/main/GOOD_FIRST_ISSUES.md" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>GOOD_FIRST_ISSUES.md</a> for full specs.
          </span>
          <a
            href="https://github.com/Sudharsanselvaraj/Token-Print/issues/new"
            target="_blank"
            rel="noreferrer"
            className="chip-btn on"
            style={{ textDecoration: "none" }}
          >
            + Create New Issue on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
