"use client";

import React from "react";
import {
  Compass,
  Sliders,
  Graph,
  Stack,
  Lightning,
  Bug,
  GitFork,
  Cpu,
  Table,
  Cube,
  Browsers,
  Gear,
  TerminalWindow,
  Cloud,
  ShieldCheck,
  BookOpen,
  Command,
  Eye,
  FileCode,
  ClockCounterClockwise,
  GitPullRequest,
  ActivityIcon,
  FileText,
  DownloadSimple,
  Code,
  GraduationCap,
  Lifebuoy,
  File,
} from "@phosphor-icons/react";

interface LinearIconProps {
  name?: string;
  size?: number;
  className?: string;
  weight?: "fill" | "regular" | "bold";
}

const ICON_MAP: Record<string, React.ElementType> = {
  Compass,
  Sliders,
  Graph,
  Layers: Stack,
  Stack,
  Lightning,
  Bug,
  GitFork,
  Cpu,
  Table,
  Cube,
  Browsers,
  Gear,
  TerminalWindow,
  Cloud,
  ShieldCheck,
  BookOpen,
  Command,
  Eye,
  FileCode,
  ClockCounterClockwise,
  GitPullRequest,
  Activity: ActivityIcon,
  ActivityIcon,
  FileText,
  DownloadSimple,
  Code,
  GraduationCap,
  Lifebuoy,
  File,
};

export default function LinearIcon({
  name,
  size = 20,
  className = "",
  weight = "fill",
}: LinearIconProps) {
  if (!name || !ICON_MAP[name]) {
    return <File size={size} weight={weight} className={className} />;
  }
  const Component = ICON_MAP[name];
  return <Component size={size} weight={weight} className={className} />;
}
