"use client";

import dynamic from "next/dynamic";
import React, { Component, ReactNode, useCallback, useEffect, useRef, useState } from "react";

const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => null,
});

interface ErrorBoundaryProps {
  fallback: (error: Error, reset: () => void) => ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("[WebGLErrorBoundary] WebGL Canvas initialization failed:", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}

function webglAvailable(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ||
               c.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ||
               c.getContext("experimental-webgl", { failIfMajorPerformanceCaveat: false });
    return gl !== null;
  } catch {
    return true;
  }
}

export default function SceneLoader() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [status, setStatus] = useState<"ok" | "lost">("ok");
  const [sceneKey, setSceneKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAvailable(webglAvailable());
    // Defer Canvas mount by one animation frame to allow AppShell DOM & controls to paint immediately
    const frameId = requestAnimationFrame(() => setMounted(true));
    return () => {
      cancelAnimationFrame(frameId);
      if (restoreTimer.current) clearTimeout(restoreTimer.current);
    };
  }, []);

  const remount = useCallback(() => {
    if (restoreTimer.current) clearTimeout(restoreTimer.current);
    restoreTimer.current = null;
    setStatus("ok");
    setSceneKey((k) => k + 1);
  }, []);

  const onContextLost = useCallback(() => {
    setStatus("lost");
    if (restoreTimer.current) clearTimeout(restoreTimer.current);
    restoreTimer.current = setTimeout(remount, 1200);
  }, [remount]);

  const onContextRestored = useCallback(() => {
    if (restoreTimer.current) clearTimeout(restoreTimer.current);
    restoreTimer.current = null;
    setStatus("ok");
  }, []);

  const renderFallback = (error?: Error, reset?: () => void) => (
    <div className="webgl-fallback">
      <div className="webgl-fallback-title">3D View Requires WebGL</div>
      <p>
        This browser couldn&rsquo;t initialize a WebGL graphics context. The rest of the panels and debug views work normally.
      </p>
      <button
        className="chip-btn"
        onClick={() => {
          reset?.();
          setAvailable(webglAvailable());
          remount();
        }}
      >
        Retry WebGL
      </button>
    </div>
  );

  if (available === false) {
    return renderFallback();
  }

  return (
    <WebGLErrorBoundary fallback={(err, reset) => renderFallback(err, reset)}>
      {!mounted ? (
        <div
          className="canvas-loading-placeholder"
          style={{
            position: "absolute",
            inset: 0,
            background: "#000000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#71717A",
              fontSize: "12px",
              fontFamily: "Inter, system-ui, sans-serif",
              letterSpacing: "0.04em",
            }}
          >
            <div
              style={{
                width: "14px",
                height: "14px",
                border: "2px solid #27272A",
                borderTopColor: "#A1A1AA",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span>Initializing 3D viewport…</span>
          </div>
        </div>
      ) : (
        <Scene
          key={sceneKey}
          onContextLost={onContextLost}
          onContextRestored={onContextRestored}
        />
      )}
      {status === "lost" && (
        <div className="webgl-lost">
          <span>Restoring WebGL Canvas…</span>
          <button className="chip-btn" onClick={remount}>
            Reload Scene
          </button>
        </div>
      )}
    </WebGLErrorBoundary>
  );
}
