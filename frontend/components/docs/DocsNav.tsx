"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { DOC_SECTIONS } from "@/lib/docsNav";
import {
  BookOpen,
  Download,
  Zap,
  Play,
  Upload,
  LayoutDashboard,
  Hash,
  Layers,
  Brain,
  ScanLine,
  Eye,
  Shuffle,
  Network,
  RotateCcw,
  TrendingUp,
  GitBranch,
  GitMerge,
  Database,
  BarChart2,
  Search,
  Box,
  MessageSquare,
  Map,
  Bug,
  Code2,
  FileJson,
  Keyboard,
  Settings,
  CheckCircle,
  Users,
  Clock,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";

interface DocsNavProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

// Individual icon per page slug
const PAGE_ICONS: Record<string, React.ReactNode> = {
  // Getting Started
  "introduction":              <BookOpen size={15} strokeWidth={1.5} />,
  "installation":              <Download size={15} strokeWidth={1.5} />,
  "quick-start":               <Zap size={15} strokeWidth={1.5} />,
  "your-first-trace":          <Play size={15} strokeWidth={1.5} />,
  "loading-a-model":           <Upload size={15} strokeWidth={1.5} />,
  "understanding-the-interface": <LayoutDashboard size={15} strokeWidth={1.5} />,
  // Core Concepts
  "concepts/tokens":           <Hash size={15} strokeWidth={1.5} />,
  "concepts/embeddings":       <Layers size={15} strokeWidth={1.5} />,
  "concepts/transformer-layers": <Brain size={15} strokeWidth={1.5} />,
  "concepts/rmsnorm":          <ScanLine size={15} strokeWidth={1.5} />,
  "concepts/attention":        <Eye size={15} strokeWidth={1.5} />,
  "concepts/qkv":              <Shuffle size={15} strokeWidth={1.5} />,
  "concepts/gqa":              <Network size={15} strokeWidth={1.5} />,
  "concepts/rope":             <RotateCcw size={15} strokeWidth={1.5} />,
  "concepts/softmax":          <TrendingUp size={15} strokeWidth={1.5} />,
  "concepts/mlp-swiglu":       <GitBranch size={15} strokeWidth={1.5} />,
  "concepts/residual-streams": <GitMerge size={15} strokeWidth={1.5} />,
  "concepts/kv-cache":         <Database size={15} strokeWidth={1.5} />,
  "concepts/logits":           <BarChart2 size={15} strokeWidth={1.5} />,
  // Using TokenPrint
  "using/model-explorer":      <Search size={15} strokeWidth={1.5} />,
  "using/3d-architecture":     <Box size={15} strokeWidth={1.5} />,
  "using/generation":          <MessageSquare size={15} strokeWidth={1.5} />,
  "using/walkthrough":         <Map size={15} strokeWidth={1.5} />,
  "using/debugger":            <Bug size={15} strokeWidth={1.5} />,
  // Reference
  "api-reference":             <Code2 size={15} strokeWidth={1.5} />,
  "trace-schema":              <FileJson size={15} strokeWidth={1.5} />,
  "keyboard-shortcuts":        <Keyboard size={15} strokeWidth={1.5} />,
  "configuration":             <Settings size={15} strokeWidth={1.5} />,
  "verification":              <CheckCircle size={15} strokeWidth={1.5} />,
  "contributing":              <Users size={15} strokeWidth={1.5} />,
  "changelog":                 <Clock size={15} strokeWidth={1.5} />,
};

export default function DocsNav({
  mobileOpen,
  setMobileOpen,
  searchQuery = "",
  setSearchQuery,
}: DocsNavProps) {
  const pathname = usePathname();
  const [localQuery, setLocalQuery] = useState("");

  // Track which sections are collapsed (default all open)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const query = searchQuery || localQuery;
  const handleQueryChange = (val: string) => {
    setLocalQuery(val);
    if (setSearchQuery) setSearchQuery(val);
  };

  const toggleSection = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Derive slug from pathname: /docs/concepts/attention -> concepts/attention
  const currentSlug = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!query.trim()) return DOC_SECTIONS;
    const q = query.toLowerCase();
    return DOC_SECTIONS.map((sec) => ({
      ...sec,
      pages: sec.pages.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q)
      ),
    })).filter((sec) => sec.pages.length > 0);
  }, [query]);

  // When searching, auto-expand everything
  const isSearching = query.trim().length > 0;

  return (
    <>
      <nav
        className={`docs-nav${mobileOpen ? " docs-nav--open" : ""}`}
        aria-label="Documentation sidebar navigation"
      >
        {/* Search Input Box */}
        <div className="docs-nav-search-box">
          <Search
            className="docs-nav-search-icon"
            size={13}
            strokeWidth={1.75}
          />
          <input
            type="text"
            className="docs-nav-search-input"
            placeholder="Search..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            aria-label="Filter documentation pages"
          />
          {query && (
            <button
              className="docs-nav-search-clear"
              onClick={() => handleQueryChange("")}
              aria-label="Clear search"
            >
              <X size={11} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Section List */}
        {filteredSections.length === 0 ? (
          <div className="docs-nav-empty">No results</div>
        ) : (
          filteredSections.map((section) => (
            <div key={section.label} className="docs-nav-section">
              <div className="docs-nav-section-title">
                {section.label}
              </div>

              <ul className="docs-nav-list">
                {section.pages.map((page) => {
                  const active = currentSlug === page.slug;
                  const icon = PAGE_ICONS[page.slug];
                  return (
                    <li key={page.slug} className="docs-nav-item">
                      <Link
                        href={`/docs/${page.slug}`}
                        className={`docs-nav-link${active ? " docs-nav-link--active" : ""}`}
                        onClick={() => setMobileOpen(false)}
                      >
                        {icon && (
                          <span className="docs-nav-icon">{icon}</span>
                        )}
                        <span className="docs-nav-title">{page.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}

        {/* Footer */}
        <div className="docs-nav-footer">
          <a
            href="https://github.com/Sudharsanselvaraj/Token-Print"
            target="_blank"
            rel="noopener noreferrer"
            className="docs-nav-footer-link"
          >
            GitHub
          </a>
          <span className="docs-nav-footer-dot">•</span>
          <a
            href="https://github.com/Sudharsanselvaraj/Token-Print/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="docs-nav-footer-link"
          >
            Issues
          </a>
        </div>
      </nav>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="docs-nav-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
