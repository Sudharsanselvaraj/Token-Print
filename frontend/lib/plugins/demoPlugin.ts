// Phase 5: Demo Plugin Registration
// Built-in plugin demonstrating how third-party plugins register themselves.

import { PluginRegistry } from "./PluginRegistry";
import React from "react";

export function registerDemoPlugins() {
  PluginRegistry.register({
    id: "layer-norm-tracker",
    name: "LayerNorm Drift Monitor",
    description: "Monitors residual stream norms layer-by-layer to catch vanishing/exploding gradients.",
    version: "1.0.0",
    author: "TokenPrint Team",
    slot: "sidebar",
    component: function LayerNormTrackerPlugin() {
      return React.createElement(
        "div",
        { className: "side-section plugin-box", style: { borderLeft: "3px solid #38bdf8", paddingLeft: "8px" } },
        React.createElement("div", { className: "side-title" }, "🔌 LayerNorm Drift Monitor"),
        React.createElement("div", { className: "side-note" }, "Live plugin active. Variance: 0.042 (Normal)")
      );
    },
  });

  PluginRegistry.enable("layer-norm-tracker");
}

if (typeof window !== "undefined") {
  registerDemoPlugins();
}
