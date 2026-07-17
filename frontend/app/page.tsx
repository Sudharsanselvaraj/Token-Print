import AppShell from "@/components/AppShell";

// Server component. AppShell is the client shell (top bar + sidebar + canvas +
// right panel); the R3F Canvas lives under SceneLoader's ssr:false boundary.
export default function Page() {
  return <AppShell />;
}
