"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal, Globe } from "lucide-react";

export interface ApiEndpointDoc {
  method: "GET" | "POST" | "WEBSOCKET";
  path: string;
  category: "System" | "Model & Architecture" | "Hugging Face Hub" | "Inference & Analysis" | "Interpretability" | "Streaming & Collab";
  summary: string;
  description: string;
  requestBody?: string;
  responseBody: string;
  curlExample: string;
  pythonExample: string;
  jsExample: string;
}

export const API_ENDPOINTS: ApiEndpointDoc[] = [
  {
    method: "GET",
    path: "/health",
    category: "System",
    summary: "Service Health & Runtime Status",
    description: "Returns backend status, loaded model identifier, active device (cuda/mps/cpu), and Hugging Face ZeroGPU binding state.",
    responseBody: JSON.stringify(
      {
        status: "ok",
        model: "Qwen/Qwen2.5-0.5B-Instruct",
        device: "cpu",
        zerogpu: true,
        cpu_fallback: false,
      },
      null,
      2
    ),
    curlExample: "curl -X GET https://sudharsan112321-tokenprint-backend.hf.space/health",
    pythonExample: "import requests\n\nres = requests.get('https://sudharsan112321-tokenprint-backend.hf.space/health')\nprint(res.json())",
    jsExample: "const res = await fetch('https://sudharsan112321-tokenprint-backend.hf.space/health');\nconst data = await res.json();\nconsole.log(data);",
  },
  {
    method: "GET",
    path: "/architecture",
    category: "Model & Architecture",
    summary: "Full Model Parameter & Op Catalog",
    description: "Extracts every layer, parameter tensor shape, dtype, and total parameter count from named_parameters().",
    responseBody: JSON.stringify(
      {
        model_name: "Qwen/Qwen2.5-0.5B-Instruct",
        parameters: 494032768,
        layers: 24,
        heads: 14,
        kv_groups: 2,
        hidden_dim: 896,
        tensor_count: 290,
      },
      null,
      2
    ),
    curlExample: "curl -X GET https://sudharsan112321-tokenprint-backend.hf.space/architecture",
    pythonExample: "import requests\n\nres = requests.get('https://sudharsan112321-tokenprint-backend.hf.space/architecture')\nprint(res.json())",
    jsExample: "const res = await fetch('https://sudharsan112321-tokenprint-backend.hf.space/architecture');\nconst data = await res.json();\nconsole.log(data);",
  },
  {
    method: "POST",
    path: "/analyze",
    category: "Inference & Analysis",
    summary: "Forward Pass & Layer Extraction",
    description: "Executes model forward pass in eager mode, capturing 24 attention matrices, hidden states, and 3D PCA coordinates.",
    requestBody: JSON.stringify(
      {
        sentence: "The transformer mechanism inspects tokens in real time.",
      },
      null,
      2
    ),
    responseBody: JSON.stringify(
      {
        sentence: "The transformer mechanism inspects tokens in real time.",
        model: "Qwen/Qwen2.5-0.5B-Instruct",
        device: "cpu",
        num_layers: 24,
        num_heads: 14,
        hidden_size: 896,
        tokens: [
          { index: 0, text: "The", piece: "The", id: 785, is_special: false },
          { index: 1, text: "transformer", piece: "transformer", id: 42578, is_special: false },
        ],
      },
      null,
      2
    ),
    curlExample: 'curl -X POST https://sudharsan112321-tokenprint-backend.hf.space/analyze \\\n  -H "Content-Type: application/json" \\\n  -d \'{"sentence": "The transformer mechanism inspects tokens in real time."}\'',
    pythonExample: 'import requests\n\npayload = {"sentence": "The transformer mechanism inspects tokens in real time."}\nres = requests.post("https://sudharsan112321-tokenprint-backend.hf.space/analyze", json=payload)\nprint(res.json())',
    jsExample: 'const res = await fetch("https://sudharsan112321-tokenprint-backend.hf.space/analyze", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ sentence: "The transformer mechanism inspects tokens in real time." })\n});\nconst data = await res.json();\nconsole.log(data);',
  },
  {
    method: "POST",
    path: "/ablate/analyze",
    category: "Interpretability",
    summary: "Head & Layer Ablation Analysis",
    description: "Temporarily zeros specified attention heads or layers using forward hooks, measuring prediction entropy shift.",
    requestBody: JSON.stringify(
      {
        sentence: "The transformer mechanism inspects tokens in real time.",
        zero_heads: [[5, 3], [12, 7]],
        zero_layers: [18],
      },
      null,
      2
    ),
    responseBody: JSON.stringify(
      {
        sentence: "The transformer mechanism inspects tokens in real time.",
        ablated_heads: 2,
        ablated_layers: 1,
        entropy_shift: 0.412,
        logit_diff: -1.84,
      },
      null,
      2
    ),
    curlExample: 'curl -X POST https://sudharsan112321-tokenprint-backend.hf.space/ablate/analyze \\\n  -H "Content-Type: application/json" \\\n  -d \'{"sentence": "Hello", "zero_heads": [[5, 3]], "zero_layers": [18]}\'',
    pythonExample: 'import requests\n\npayload = {"sentence": "Hello", "zero_heads": [[5, 3]], "zero_layers": [18]}\nres = requests.post("https://sudharsan112321-tokenprint-backend.hf.space/ablate/analyze", json=payload)\nprint(res.json())',
    jsExample: 'const res = await fetch("https://sudharsan112321-tokenprint-backend.hf.space/ablate/analyze", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ sentence: "Hello", zero_heads: [[5, 3]], zero_layers: [18] })\n});\nconst data = await res.json();',
  },
  {
    method: "WEBSOCKET",
    path: "/ws/generate",
    category: "Streaming & Collab",
    summary: "Real-time Token Generation Stream",
    description: "High-throughput streaming generation with client backpressure over WebSockets, pushing frame payloads.",
    responseBody: JSON.stringify(
      {
        token: "world",
        token_id: 1879,
        top_k: [
          { token: "world", prob: 0.89 },
          { token: "there", prob: 0.05 },
        ],
        kv_cache_entries: 6,
      },
      null,
      2
    ),
    curlExample: "# Connect via websocat or browser WebSocket\nwebsocat wss://sudharsan112321-tokenprint-backend.hf.space/ws/generate",
    pythonExample: 'import asyncio, websockets, json\n\nasync def stream():\n    async with websockets.connect("wss://sudharsan112321-tokenprint-backend.hf.space/ws/generate") as ws:\n        await ws.send(json.dumps({"prompt": "Hello"}))\n        while True:\n            msg = await ws.recv()\n            print(json.loads(msg))\n\nasyncio.run(stream())',
    jsExample: 'const ws = new WebSocket("wss://sudharsan112321-tokenprint-backend.hf.space/ws/generate");\nws.onopen = () => ws.send(JSON.stringify({ prompt: "Hello" }));\nws.onmessage = (e) => console.log(JSON.parse(e.data));',
  },
];

export default function DocsApiExplorer() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<"curl" | "python" | "js">("curl");
  const [copied, setCopied] = useState(false);

  const endpoint = API_ENDPOINTS[selectedIdx];

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const currentCode =
    activeTab === "curl"
      ? endpoint.curlExample
      : activeTab === "python"
      ? endpoint.pythonExample
      : endpoint.jsExample;

  const renderBadge = (method: ApiEndpointDoc["method"]) => {
    switch (method) {
      case "GET":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]">GET</span>;
      case "POST":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--card)] border border-[var(--border)] text-[var(--text)]">POST</span>;
      case "WEBSOCKET":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--card)] border border-[var(--border-strong)] text-white">WS</span>;
    }
  };

  return (
    <div className="my-8 rounded-[12px] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      {/* Top Header */}
      <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--sidebar)]">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-[var(--muted)]" strokeWidth={1.5} />
          <h3 className="text-[13px] font-medium text-[var(--text)] tracking-tight">
            FastAPI Live Route Explorer
          </h3>
        </div>
        <span className="text-[12px] font-mono text-[var(--muted)]">
          Source: backend/app/main.py
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
        {/* Left endpoint list */}
        <div className="lg:col-span-4 border-r border-[var(--border)] p-2 overflow-y-auto max-h-[500px]">
          <div className="space-y-1">
            {API_ENDPOINTS.map((ep, idx) => (
              <button
                key={ep.path + ep.method}
                onClick={() => setSelectedIdx(idx)}
                className={`w-full text-left p-2.5 rounded-md text-[13px] font-mono transition-colors flex items-center gap-2.5 ${
                  selectedIdx === idx
                    ? "bg-[var(--border)] text-[var(--text)] font-medium"
                    : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40"
                }`}
              >
                {renderBadge(ep.method)}
                <span className="truncate flex-1">{ep.path}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right details pane */}
        <div className="lg:col-span-8 p-6 flex flex-col justify-between bg-[var(--bg)]">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              {renderBadge(endpoint.method)}
              <code className="text-[14px] font-mono font-semibold text-[var(--text)]">{endpoint.path}</code>
            </div>
            <h4 className="text-[16px] font-medium text-[var(--text)] mb-1">
              {endpoint.summary}
            </h4>
            <p className="text-[14px] leading-relaxed text-[var(--muted)] mb-5">
              {endpoint.description}
            </p>

            {/* Request tabs */}
            <div className="border border-[var(--border)] rounded-[10px] overflow-hidden bg-[var(--card)] mb-5">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-1.5 bg-[var(--sidebar)]">
                <div className="flex gap-1">
                  {(["curl", "python", "js"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-2.5 py-1 text-[12px] font-mono rounded transition-colors ${
                        activeTab === tab
                          ? "bg-[var(--border)] text-[var(--text)] font-medium"
                          : "text-[var(--muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleCopy(currentCode)}
                  className="text-[var(--muted)] hover:text-[var(--text)] p-1 text-[12px] flex items-center gap-1"
                >
                  {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.5} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="p-4 text-[12.5px] font-mono text-[var(--text)] overflow-x-auto">
                <code>{currentCode}</code>
              </pre>
            </div>

            {/* Response Preview */}
            <div className="border border-[var(--border)] rounded-[10px] overflow-hidden bg-[var(--card)]">
              <div className="px-3.5 py-2 border-b border-[var(--border)] text-[12px] font-mono text-[var(--muted)] bg-[var(--sidebar)]">
                Sample JSON Response (200 OK)
              </div>
              <pre className="p-4 text-[12px] font-mono text-[var(--muted)] overflow-x-auto max-h-[160px]">
                <code>{endpoint.responseBody}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
