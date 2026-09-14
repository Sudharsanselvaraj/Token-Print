import { Suspense } from "react";
import DesktopGate from "@/components/DesktopGate";

export default function AppPage() {
  return (
    <Suspense fallback={null}>
      <DesktopGate />
    </Suspense>
  );
}