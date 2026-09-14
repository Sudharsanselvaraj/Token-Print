"use client";

import { useIsDesktop } from "@/lib/useIsDesktop";
import AppShell from "./AppShell";
import DesktopRequiredScreen from "./ui/DesktopRequiredScreen";

export default function DesktopGate() {
  const { isDesktop, isMounted } = useIsDesktop();

  // Prevent flash and prevent 3D canvas mount until viewport capability is verified on client
  if (!isMounted) {
    return (
      <div
        className="desktop-gate-placeholder"
        style={{
          minHeight: "calc(100vh - 48px)",
          backgroundColor: "#050505",
        }}
      />
    );
  }

  // Viewport < 1024px minimum desktop width
  if (!isDesktop) {
    return <DesktopRequiredScreen />;
  }

  // Viewport >= 1024px: mount full interactive 3D workspace
  return <AppShell />;
}
