"use client";

import React from "react";

export function InspectLighting() {
  return (
    <group>
      {/* Studio Key Light */}
      <directionalLight position={[10, 20, 15]} intensity={2.2} color="#ffffff" castShadow />
      {/* Studio Fill Light */}
      <directionalLight position={[-15, -10, 10]} intensity={1.0} color="#e4e4e7" />
      {/* Back Rim Light */}
      <directionalLight position={[0, 15, -15]} intensity={1.4} color="#ffffff" />
      {/* Ambient Lighting */}
      <ambientLight intensity={0.7} />
    </group>
  );
}
