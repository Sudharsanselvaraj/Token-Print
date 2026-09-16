"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function getModalRoot(): HTMLElement {
  let el = document.getElementById("modal-root");
  if (!el) {
    el = document.createElement("div");
    el.id = "modal-root";
    document.body.appendChild(el);
  }
  return el;
}

/**
 * ModalPortal — the single mount point for every true modal in the app.
 *
 * Renders children into a global <div id="modal-root"> that lives at the end
 * of <body> (declared in app/layout.tsx, auto-created as a fallback). The root
 * carries the --z-modal-backdrop layer and is pinned over the full viewport,
 * so modal content always stacks above the 3D canvas and its scene labels,
 * regardless of which workspace is mounted underneath.
 */
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setRoot(getModalRoot());
  }, []);

  if (!root) return null;
  return createPortal(children, root);
}