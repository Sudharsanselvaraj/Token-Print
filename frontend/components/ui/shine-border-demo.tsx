"use client";

import React from "react";
import FocusFrameBorder from "@/components/ui/shine-border-06";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crosshair } from "lucide-react";

export default function ShineBorderDemo() {
  return (
    <div className="flex items-center justify-center w-full min-h-screen p-8">
      <FocusFrameBorder
        duration={2.4}
        color="var(--color-blue-500, #38BDF8)"
        className="w-full max-w-sm"
      >
        <Card className="relative h-full rounded-[inherit] border-0 ring-0 bg-transparent p-0 gap-0">
          <CardContent className="p-10 flex flex-col items-center text-center gap-3">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Crosshair className="size-6 text-primary" />
            </div>
            <Badge variant="secondary">Focus Frame</Badge>
            <h3 className="text-lg font-semibold text-foreground">
              Locked into focus
            </h3>
            <p className="text-sm text-muted-foreground max-w-60">
              Corner brackets pulse in sequence like a camera locking focus.
            </p>
          </CardContent>
        </Card>
      </FocusFrameBorder>
    </div>
  );
}
