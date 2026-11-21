"use client";

import { useState } from "react";
import { Copy, Check, Terminal, Code2, Globe } from "lucide-react";

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
        device: "cuda",
        zerogpu: true,
        cpu_fallback: false,
      },
      null,
      2
    ),
    curlExample: "curl -X GET https://tokenprint-backend.hf.space/health",
    pythonExample: "import requests\n\nres = requests.get('https://tokenprint-backend.hf.space/health')\nprint(res.json())",
    jsExample: "const res = await fetch('https://tokenprint-backend.hf.space/health');\nconst data = await res.json();\nconsole.log(data);",
  },
  {
    method: "GET",
    path: "/architecture",
    category: "Model & Architecture",
    summary: "Full Model Parameter & Op Catalog",
    description: "Extracts every layer, parameter tensor shape, dtype, and total parameter count (494M on Qwen) from named_parameters().",
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
    curlExample: "curl -X GET https://tokenprint-backend.hf.space/architecture",
    pythonExample: "import requests\n\nres = requests.get('https://tokenprint-backend.hf.space/architecture')\nprint(res.json()['parameters'])",
    jsExample: "const res = await fetch('https://tokenprint-backend.hf.space/architecture');\nconst arch = await res.json();\nconsole.log(arch);",
  },
  {
    method: "GET",
    path: "/api/hub/models",
    category: "Hugging Face Hub",
    summary: "Discover Hugging Face Hub Models",
    description: "Searches official Hugging Face Hub repositories with SSRF validation, download filtering, and pagination.",
    responseBody: JSON.stringify(
      {
        models: [
          {
            id: "Qwen/Qwen2.5-0.5B-Instruct",
            author: "Qwen",
            downloads: 1420500,
            likes: 3120,
            pipeline_tag: "text-generation",
          },
        ],
        total: 1,
      },
      null,
      2
    ),
    curlExample: "curl -X GET 'https://tokenprint-backend.hf.space/api/hub/models?search=qwen&limit=10'",
    pythonExample: "import requests\n\nres = requests.get('https://tokenprint-backend.hf.space/api/hub/models', params={'search': 'qwen'})\nprint(res.json())",
    jsExample: "const res = await fetch('https://tokenprint-backend.hf.space/api/hub/models?search=qwen');\nconst models = await res.json();",
  },
  {
    method: "GET",
    path: "/api/model/compatibility/{model_id}",
    category: "Hugging Face Hub",
    summary: "Model Compatibility Verification",
    description: "Evaluates architectural suitability, estimated VRAM, ZeroGPU compliance heuristic, and required forward hooks.",
    responseBody: JSON.stringify(
      {
        model_id: "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        family: "llama",
        supported: true,
        estimated_vram_gb: 2.2,
        fits_zerogpu: true,
        architecture_recognized: true,
      },
      null,
      2
    ),
    curlExample: "curl -X GET https://tokenprint-backend.hf.space/api/model/compatibility/TinyLlama/TinyLlama-1.1B-Chat-v1.0",
    pythonExample: "import requests\n\nres = requests.get('https://tokenprint-backend.hf.space/api/model/compatibility/gpt2')\nprint(res.json())",
    jsExample: "const res = await fetch('https://tokenprint-backend.hf.space/api/model/compatibility/gpt2');\nconst compat = await res.json();",
  },
  {
    method: "POST",
    path: "/analyze",
    category: "Inference & Analysis",
    summary: "Full Forward Pass & Attention Extraction",
    description: "Executes a single forward pass, recording 24 layers of multi-head attention softmax weights, residual stream norms, and top-5 tokens.",
    requestBody: JSON.stringify(
      {
        prompt: "The capital of France is",
        top_k: 5,
        temperature: 0.7,
      },
      null,
      2
    ),
    responseBody: JSON.stringify(
      {
        tokens: ["The", " capital", " of", " France", " is"],
        attention_matrices: "<24 layers x 14 heads float arrays>",
        residual_stream: "<layer-by-layer hidden state norms>",
        top_k_predictions: [{ token: " Paris", probability: 0.94 }],
      },
      null,
      2
    ),
    curlExample: "curl -X POST https://tokenprint-backend.hf.space/analyze \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"prompt\": \"The capital of France is\"}'",
    pythonExample: "import requests\n\npayload = {'prompt': 'The capital of France is'}\nres = requests.post('https://tokenprint-backend.hf.space/analyze', json=payload)\nprint(res.json()['top_k_predictions'])",
    jsExample: "const res = await fetch('https://tokenprint-backend.hf.space/analyze', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ prompt: 'The capital of France is' })\n});\nconst result = await res.json();",
  },
  {
    method: "POST",
    path: "/ablate/analyze",
    category: "Interpretability",
    summary: "Head & Layer Ablation Intervention",
    description: "Temporarily disables target attention heads or layers via forward hooks and computes the probability shift on predicted tokens.",
    requestBody: JSON.stringify(
      {
        prompt: "When Mary and John went to the store, John gave a drink to",
        layer: 11,
        head: 3,
        ablation_type: "zero",
      },
      null,
      2
    ),
    responseBody: JSON.stringify(
      {
        baseline_token: " Mary",
        baseline_prob: 0.88,
        ablated_token: " John",
        ablated_prob: 0.42,
        logit_diff: -2.31,
      },
      null,
      2
    ),
    curlExample: "curl -X POST https://tokenprint-backend.hf.space/ablate/analyze \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"prompt\": \"...\", \"layer\": 11, \"head\": 3}'",
    pythonExample: "import requests\n\npayload = {'prompt': '...', 'layer': 11, 'head': 3}\nres = requests.post('https://tokenprint-backend.hf.space/ablate/analyze', json=payload)\nprint(res.json())",
    jsExample: "const res = await fetch('https://tokenprint-backend.hf.space/ablate/analyze', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ prompt: '...', layer: 11, head: 3 })\n});",
  },
  {
    method: "POST",
    path: "/patch/analyze",
    category: "Interpretability",
    summary: "Activation Patching Intervention",
    description: "Causal activation patching: extracts activations from a clean prompt and injects them into a corrupted prompt at a specified layer/token.",
    requestBody: JSON.stringify(
      {
        clean_prompt: "The Eiffel Tower is in",
        corrupted_prompt: "The Colosseum is in",
        target_layer: 8,
        patch_type: "residual",
      },
      null,
      2
    ),
    responseBody: JSON.stringify(
      {
        recovered_probability: 0.76,
        causal_effect: 0.62,
        target_token: " Paris",
      },
      null,
      2
    ),
    curlExample: "curl -X POST https://tokenprint-backend.hf.space/patch/analyze \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"clean_prompt\": \"...\", \"corrupted_prompt\": \"...\", \"target_layer\": 8}'",
    pythonExample: "import requests\n\nres = requests.post('https://tokenprint-backend.hf.space/patch/analyze', json={'clean_prompt': '...', 'corrupted_prompt': '...', 'target_layer': 8})\nprint(res.json())",
    jsExample: "const res = await fetch('https://tokenprint-backend.hf.space/patch/analyze', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ clean_prompt: '...', corrupted_prompt: '...', target_layer: 8 })\n});",
  },
  {
    method: "WEBSOCKET",
    path: "/ws/generate",
    category: "Streaming & Collab",
    summary: "Real-Time Token-by-Token Streaming",
    description: "Streams one WebSocket frame per token containing generated token text, top-5 logits distribution, and active attention heatmaps.",
    responseBody: JSON.stringify(
      {
        type: "step",
        step: 1,
        token: "Paris",
        prob: 0.94,
        top_k: [{ token: "Paris", prob: 0.94 }, { token: "France", prob: 0.03 }],
      },
      null,
      2
    ),
    curlExample: "# Connect via websocat:\nwebsocat wss://tokenprint-backend.hf.space/ws/generate",
    pythonExample: "import websockets, json, asyncio\n\nasync def stream():\n    async with websockets.connect('wss://tokenprint-backend.hf.space/ws/generate') as ws:\n        await ws.send(json.dumps({'prompt': 'Hello'}))\n        async for msg in ws:\n            print(json.loads(msg))\n\nasyncio.run(stream())",
    jsExample: "const ws = new WebSocket('wss://tokenprint-backend.hf.space/ws/generate');\nws.onopen = () => ws.send(JSON.stringify({ prompt: 'Hello' }));\nws.onmessage = (e) => console.log(JSON.parse(e.data));",
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
      // Fallback
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
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">GET</span>;
      case "POST":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">POST</span>;
      case "WEBSOCKET":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">WSS</span>;
    }
  };

  return (
    <div className="my-8 rounded-xl border border-slate-800 bg-[#090d16] overflow-hidden shadow-2xl">
      {/* Top Header */}
      <div className="px-5 py-4 border-b border-slate-800/80 bg-[#0d121f] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider font-mono">
            FastAPI Live Route Explorer
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Source: backend/app/main.py
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
        {/* Left endpoint list */}
        <div className="lg:col-span-4 border-r border-slate-800/80 bg-[#090d16]/80 p-2 overflow-y-auto max-h-[500px]">
          <div className="space-y-1">
            {API_ENDPOINTS.map((ep, idx) => (
              <button
                key={ep.path + ep.method}
                onClick={() => setSelectedIdx(idx)}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-2 ${
                  selectedIdx === idx
                    ? "bg-slate-800/90 text-slate-100 border border-cyan-500/30 shadow-inner"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                {renderBadge(ep.method)}
                <span className="truncate flex-1">{ep.path}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right details pane */}
        <div className="lg:col-span-8 p-5 flex flex-col justify-between bg-[#080b12]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {renderBadge(endpoint.method)}
              <code className="text-sm font-mono font-semibold text-slate-100">{endpoint.path}</code>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 font-mono ml-auto">
                {endpoint.category}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mb-1">{endpoint.summary}</p>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">{endpoint.description}</p>

            {/* Code Tabs */}
            <div className="rounded-lg border border-slate-800 bg-[#0b0f1a] overflow-hidden mb-4">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0e1322]">
                <div className="flex items-center gap-2">
                  <Terminal size={13} className="text-cyan-400" />
                  <div className="flex gap-1">
                    {(["curl", "python", "js"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase transition-colors ${
                          activeTab === tab
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(currentCode)}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <pre className="p-3 text-xs font-mono text-cyan-300/90 overflow-x-auto whitespace-pre leading-relaxed bg-[#06080f]">
                {currentCode}
              </pre>
            </div>

            {/* Sample Response */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mb-1.5">
                <Code2 size={13} className="text-slate-400" />
                <span>Example Response JSON</span>
              </div>
              <pre className="p-3 rounded-lg border border-slate-800/80 bg-[#05070d] text-[11px] font-mono text-emerald-300/80 overflow-x-auto max-h-[140px] leading-relaxed">
                {endpoint.responseBody}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
