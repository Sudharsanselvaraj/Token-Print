import { events, type RootStore } from "@react-three/fiber";

/** Canvas configures its renderer asynchronously. Its DOM ref can be cleared by
 * a route change or Suspense before Provider connects events. R3F's default
 * manager assumes that ref is still mounted; let Provider use its canvas
 * fallback, or finish unmounting, instead of attaching to a missing element.
 */
export function canvasEvents(store: RootStore) {
  const manager = events(store);
  return {
    ...manager,
    connect(target: HTMLElement | null) {
      if (target?.isConnected) manager.connect?.(target);
    },
  };
}
