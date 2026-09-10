// Phase 5: Plugin Registry
// Allows external code to register custom React panels and 3D overlays
// that are loaded at runtime and slotted into the TokenPrint shell.

import type { ComponentType } from "react";

export type PluginSlot = "sidebar" | "right-panel" | "bottom-bar" | "canvas-overlay";

export interface TokenPrintPlugin {
  /** Unique plugin ID. Must be globally unique. */
  id: string;
  /** Human-readable plugin name. */
  name: string;
  /** Short description shown in Plugin Manager. */
  description: string;
  /** Version string, e.g. "1.0.0" */
  version: string;
  /** Author name or org. */
  author?: string;
  /** URL to plugin homepage or docs. */
  homepage?: string;
  /** Where this plugin should be rendered in the shell. */
  slot: PluginSlot;
  /** The React component to render for this plugin. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
}

class PluginRegistryClass {
  private plugins: Map<string, TokenPrintPlugin> = new Map();
  private enabledIds: Set<string> = new Set();

  register(plugin: TokenPrintPlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginRegistry] Plugin "${plugin.id}" is already registered. Overwriting.`);
    }
    this.plugins.set(plugin.id, plugin);
    console.info(`[PluginRegistry] Registered plugin: ${plugin.name} (${plugin.id})`);
  }

  unregister(id: string): void {
    this.plugins.delete(id);
    this.enabledIds.delete(id);
  }

  enable(id: string): void {
    if (this.plugins.has(id)) this.enabledIds.add(id);
  }

  disable(id: string): void {
    this.enabledIds.delete(id);
  }

  isEnabled(id: string): boolean {
    return this.enabledIds.has(id);
  }

  getAll(): TokenPrintPlugin[] {
    return Array.from(this.plugins.values());
  }

  getEnabled(): TokenPrintPlugin[] {
    return Array.from(this.plugins.values()).filter((p) => this.enabledIds.has(p.id));
  }

  getBySlot(slot: PluginSlot): TokenPrintPlugin[] {
    return this.getEnabled().filter((p) => p.slot === slot);
  }
}

// Singleton registry exposed globally so external scripts can call:
//   window.TokenPrintPlugins.register({ id: "my-plugin", ... })
export const PluginRegistry = new PluginRegistryClass();

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).TokenPrintPlugins = PluginRegistry;
}
