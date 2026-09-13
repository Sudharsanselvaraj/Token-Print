"use client";

import { Reveal } from "./motion/primitives/Reveal";

const INTEGRATIONS = [
  { name: "Hugging Face", role: "Model Registry & Weights" },
  { name: "GGUF", role: "Quantized Local Inference" },
  { name: "PyTorch", role: "Tensor Computation Engine" },
  { name: "FastAPI", role: "High-Performance Backend" },
  { name: "Next.js", role: "React Application Framework" },
  { name: "React Three Fiber", role: "3D GPU Canvas Engine" },
];

export function HomeProofStrip() {
  return (
    <section className="home-proof-section">
      <div className="home-container">
        <Reveal delay={0.05}>
          <span className="home-proof-eyebrow">BUILT ON WHAT IT DEBUGS</span>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="home-proof-grid">
            {INTEGRATIONS.map((item) => (
              <div key={item.name} className="home-proof-cell">
                <span className="home-proof-name">{item.name}</span>
                <span className="home-proof-role">{item.role}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
