import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
