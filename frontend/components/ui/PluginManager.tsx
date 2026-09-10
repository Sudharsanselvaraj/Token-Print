"use client";

import { useState, useEffect } from "react";
import { PluginRegistry } from "@/lib/plugins/PluginRegistry";
import type { TokenPrintPlugin } from "@/lib/plugins/PluginRegistry";

interface PluginManagerProps {
  open: boolean;
  onClose: () => void;
}

export default function PluginManager({ open, onClose }: PluginManagerProps) {
  const [plugins, setPlugins] = useState<TokenPrintPlugin[]>([]);
  const [enabledIds, setEnabledIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setPlugins(PluginRegistry.getAll());
      setEnabledIds(new Set(PluginRegistry.getEnabled().map((p) => p.id)));
    }
  }, [open]);

  const toggle = (id: string) => {
    if (enabledIds.has(id)) {
      PluginRegistry.disable(id);
      setEnabledIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    } else {
      PluginRegistry.enable(id);
      setEnabledIds((prev) => new Set([...prev, id]));
    }
  };

  if (!open) return null;

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
        className="modal-content plugin-manager"
        style={{ zIndex: 10001, background: "var(--bg, #0f1117)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>🔌 Plugin Manager</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="pm-body">
          {plugins.length === 0 ? (
            <div className="pm-empty">
              <div className="pm-empty-icon">🔌</div>
              <p>No plugins registered yet.</p>
              <p className="pm-hint">
                External plugins can register themselves by calling:<br />
                <code>window.TokenPrintPlugins.register(&#123; id, name, component, slot, … &#125;)</code>
              </p>
              <p className="pm-hint">
                See the <a href="https://github.com/Sudharsanselvaraj/Token-Print/wiki/Developer-Guide-Plugin-API" target="_blank" rel="noopener noreferrer">Plugin API docs</a> to build your first plugin.
              </p>
            </div>
          ) : (
            <div className="pm-list">
              {plugins.map((p) => (
                <div key={p.id} className={`pm-item ${enabledIds.has(p.id) ? "enabled" : ""}`}>
                  <div className="pm-info">
                    <div className="pm-name">{p.name} <span className="pm-ver">v{p.version}</span></div>
                    <div className="pm-desc">{p.description}</div>
                    <div className="pm-meta">
                      Slot: <code>{p.slot}</code>
                      {p.author && <span> · by {p.author}</span>}
                      {p.homepage && (
                        <a href={p.homepage} target="_blank" rel="noopener noreferrer"> · docs</a>
                      )}
                    </div>
                  </div>
                  <label className="pm-toggle" title={enabledIds.has(p.id) ? "Disable plugin" : "Enable plugin"}>
                    <input
                      type="checkbox"
                      checked={enabledIds.has(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                    <span className="pm-toggle-slider" />
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
