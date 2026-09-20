"use client";
import { Html } from "@react-three/drei";
import { useEffect, useRef, type ComponentProps } from "react";
import { SCENE_OVERLAY_Z } from "@/lib/layers";

type SceneHtmlProps = ComponentProps<typeof Html> & { labelPriority?: number };
const labels = new Map<HTMLElement, number>();
let animation = 0;
function arrange() {
  const occupied: DOMRect[] = [];
  for (const [node] of [...labels].sort((a, b) => b[1] - a[1])) {
    const box = node.getBoundingClientRect();
    const visible =
      box.width > 0 &&
      box.height > 0 &&
      box.right > 0 &&
      box.bottom > 0 &&
      box.left < innerWidth &&
      box.top < innerHeight;
    const overlap = occupied.some(
      (r) =>
        box.left < r.right + 6 &&
        box.right > r.left - 6 &&
        box.top < r.bottom + 6 &&
        box.bottom > r.top - 6,
    );
    node.style.visibility = visible && !overlap ? "visible" : "hidden";
    if (visible && !overlap) occupied.push(box);
  }
  animation = requestAnimationFrame(arrange);
}
/** All scene DOM remains below dialogs. Passive labels share collision handling. */
export function SceneHtml({
  zIndexRange,
  labelPriority = 0,
  children,
  ...props
}: SceneHtmlProps) {
  const ref = useRef<HTMLDivElement>(null);
  const passive = props.style?.pointerEvents === "none" || labelPriority > 0;
  useEffect(() => {
    const node = ref.current;
    if (!node || !passive) return;
    labels.set(node, labelPriority);
    if (!animation) animation = requestAnimationFrame(arrange);
    return () => {
      labels.delete(node);
      if (!labels.size) {
        cancelAnimationFrame(animation);
        animation = 0;
      }
    };
  }, [passive, labelPriority]);
  return (
    <Html
      zIndexRange={[
        Math.min(zIndexRange?.[0] ?? SCENE_OVERLAY_Z, SCENE_OVERLAY_Z),
        0,
      ]}
      {...props}
    >
      <div ref={ref}>{children}</div>
    </Html>
  );
}
