"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

// The R3F <Canvas> touches WebGL / `window` and cannot be server-rendered.
// `ssr: false` is only allowed inside a Client Component, which is exactly
// what this wrapper is — it's the SSR boundary for the whole 3D scene.
const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => null,
});

/** True if this browser/tab can actually create a WebGL context right now. */
function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      c.getContext("webgl2") ||
      c.getContext("webgl") ||
      c.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

/**
 * Hosts the 3D canvas and keeps it alive across WebGL context loss — which
 * otherwise leaves a dead canvas (the browser's broken-image glyph) after a
 * dev-server reload, a GPU hiccup, or too many live contexts. On loss we ask
 * the browser to restore; if it can't within a moment, we remount the canvas
 * (a fresh <canvas> = a brand-new context). If WebGL can't init at all, we show
 * a readable fallback with the real fix instead of a broken icon.
 */
export default function SceneLoader() {
  // null = not checked yet (avoid a flash before the mount-time probe).
  const [available, setAvailable] = useState<boolean | null>(null);
  const [status, setStatus] = useState<"ok" | "lost">("ok");
  const [sceneKey, setSceneKey] = useState(0);
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAvailable(webglAvailable());
    return () => {
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
    // Give the browser ~1.2s to restore the same context; if it doesn't fire
    // webglcontextrestored by then, hard-remount a fresh canvas.
    if (restoreTimer.current) clearTimeout(restoreTimer.current);
    restoreTimer.current = setTimeout(remount, 1200);
  }, [remount]);

  const onContextRestored = useCallback(() => {
    if (restoreTimer.current) clearTimeout(restoreTimer.current);
    restoreTimer.current = null;
    setStatus("ok");
  }, []);

  if (available === false) {
    return (
      <div className="webgl-fallback">
        <div className="webgl-fallback-title">3D view needs WebGL</div>
        <p>
          This tab couldn&rsquo;t start hardware-accelerated graphics, so the 3D
          scene can&rsquo;t render. The rest of the app (panels, playback, real
          numbers) works normally.
        </p>
        <p className="webgl-fallback-steps">
          Enable <b>chrome://settings/system → “Use graphics acceleration when
          available”</b>, then <b>Relaunch</b> — or check{" "}
          <b>chrome://gpu</b> shows WebGL as <i>Hardware accelerated</i>.
        </p>
        <button
          className="chip-btn"
          onClick={() => {
            setAvailable(webglAvailable());
            remount();
          }}
        >
          Retry 3D
        </button>
      </div>
    );
  }

  return (
    <>
      <Scene
        key={sceneKey}
        onContextLost={onContextLost}
        onContextRestored={onContextRestored}
      />
      {status === "lost" && (
        <div className="webgl-lost">
          <span>Restoring 3D…</span>
          <button className="chip-btn" onClick={remount}>
            Reload 3D
          </button>
        </div>
      )}
    </>
  );
}
