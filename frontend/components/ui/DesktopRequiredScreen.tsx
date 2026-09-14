"use client";

import Link from "next/link";
import { assetUrl } from "@/lib/assets";
import { Monitor, ArrowLeft, BookOpen } from "lucide-react";

export default function DesktopRequiredScreen() {
  return (
    <main className="desktop-required-wrapper" role="main" aria-label="Desktop Required">
      <div className="desktop-required-card">
        {/* TokenPrint Logo */}
        <div className="desktop-required-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl("/tokenprint-logo.png")}
            alt="TokenPrint Logo"
            className="desktop-required-logo"
          />
        </div>

        {/* Minimal Monospace Tag */}
        <div className="desktop-required-badge">
          <Monitor size={12} strokeWidth={1.5} className="desktop-required-badge-icon" />
          <span>DESKTOP VIEWPORT REQUIRED</span>
        </div>

        {/* Title */}
        <h1 className="desktop-required-title">Best experienced on desktop.</h1>

        {/* Description */}
        <p className="desktop-required-description">
          TokenPrint&apos;s interactive 3D model visualization, tensor inspection,
          generation controls, and debugging workspace require a larger screen.
        </p>

        <p className="desktop-required-subtext">
          Please open TokenPrint on a desktop or laptop browser (minimum 1024px width).
        </p>

        {/* Minimal Navigation Actions */}
        <div className="desktop-required-actions">
          <Link href="/" className="desktop-required-btn desktop-required-btn--primary">
            <ArrowLeft size={13} strokeWidth={1.5} />
            <span>Back to Home</span>
          </Link>
          <Link href="/docs" className="desktop-required-btn desktop-required-btn--secondary">
            <BookOpen size={13} strokeWidth={1.5} />
            <span>Documentation</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
