import type { Metadata } from "next";
import GlobalHeader from "@/components/GlobalHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "TokenPrint — LLM Internals Inspector",
  description:
    "Explore a real language model's architecture, tensors, and live generation in 3D — all from real data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <GlobalHeader />
        {children}
        {/* Global modal mount point — declared here so it always exists at the
            end of <body>; ModalPortal also auto-creates it if missing. */}
        <div id="modal-root" />
      </body>
    </html>
  );
}
