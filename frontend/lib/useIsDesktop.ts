"use client";

import { useState, useEffect } from "react";

/**
 * Minimum viewport width required for the TokenPrint 3D workspace.
 * Based on requirement: Global Header + Left Sidebar (300px) + 3D Canvas (min ~400px) + Right Inspector (360px).
 */
export const MIN_DESKTOP_WIDTH = 1024;

export interface UseIsDesktopResult {
  isDesktop: boolean;
  isMounted: boolean;
}

export function useIsDesktop(minWidth = MIN_DESKTOP_WIDTH): UseIsDesktopResult {
  const [state, setState] = useState<UseIsDesktopResult>({
    isDesktop: true,
    isMounted: false,
  });

  useEffect(() => {
    const handleResize = () => {
      const match = window.innerWidth >= minWidth;
      setState({ isDesktop: match, isMounted: true });
    };

    // Initial evaluation on client mount
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [minWidth]);

  return state;
}
