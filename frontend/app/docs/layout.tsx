import type { Metadata } from "next";
import DocsAppShell from "@/components/docs/DocsAppShell";

export const metadata: Metadata = {
  title: {
    template: "%s — TokenPrint Docs",
    default: "TokenPrint Documentation",
  },
  description:
    "Technical documentation for TokenPrint — an interactive 3D visual debugger for transformer language model internals.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <DocsAppShell>{children}</DocsAppShell>;
}
