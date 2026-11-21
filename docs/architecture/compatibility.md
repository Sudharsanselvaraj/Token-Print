# TokenPrint — Model Compatibility & Verification Engine

**Status:** Current Production Engine  
**Module Root:** `backend/app/inference/compatibility_engine.py`, `backend/app/inference/compatibility_registry.py`  
**Verification Matrices:** 4 Compatibility Levels & 12 Discrete Capabilities  

---

## 1. 4-Level Model Capability Hierarchy

TokenPrint enforces an explicit 4-level capability classification hierarchy for all models discovered or loaded:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Level 4: ADVANCED (Mechanistic Interpretability & Interventions)            │
│   • Attention Extraction  • Residual Stream Trajectory  • Logit Lens        │
│   • Head Ablation         • Layer Ablation              • Activation Patch  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Level 3: INSTRUMENTED (Native Weight Inspection & State Extraction)        │
│   • Hidden State Vectors  • Weight Introspection        • Latency Timing    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Level 2: LOADABLE (Standard Autoregressive Inference)                      │
│   • Tokenization          • Text Generation             • Next-Token Logits │
├─────────────────────────────────────────────────────────────────────────────┤
│ Level 1: DISCOVERABLE (Repository Metadata & Feasibility Verified)         │
│   • Configuration Parsing • VRAM Estimation             • Architecture Id   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 12 Discrete Model Capabilities

The dynamic compatibility engine evaluates 12 discrete capabilities against a candidate model's architecture, config, and weights:

1. `supports_tokenization`: Tokenizer vocabulary and chat template compatibility.
2. `supports_text_generation`: Autoregressive next-token sampling via CausalLM.
3. `supports_logits`: Final linear projection to vocabulary logits.
4. `supports_hidden_states`: Intermediate residual vectors via `output_hidden_states=True`.
5. `supports_attention`: Layer-wise multi-head attention weights via `output_attentions=True`.
6. `supports_logit_lens`: Intermediate residual projection onto the unembedding matrix.
7. `supports_head_ablation`: PyTorch pre-hook targeting of attention head outputs.
8. `supports_layer_ablation`: Residual bypass pass-through of transformer blocks.
9. `supports_activation_patch`: Clean-to-corrupted tensor substitution via forward hooks.
10. `supports_residual_stream`: Dimensionality reduction and 3D trajectory extraction.
11. `supports_moe_routing`: Sparse mixture-of-experts gating router observation.
12. `supports_kv_cache`: Past key/value caching for sequential generation acceleration.

---

## 3. Verified Model Compatibility Matrix

| Model Checkpoint | Family | Architecture | Params | Level | ZeroGPU Feasible | Attention | Logit Lens | Ablation | Patching | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`Qwen/Qwen2.5-0.5B-Instruct`** | `qwen` | `Qwen2ForCausalLM` | 494M | **Level 4** | **YES** | **YES** | **YES** | **YES** | **YES** | **FULLY OPERATIONAL** |
| **`gpt2`** | `gpt2` | `GPT2LMHeadModel` | 124M | **Level 4** | **YES** | **YES** | **YES** | **YES** | **YES** | **FULLY OPERATIONAL** |
| **`TinyLlama/TinyLlama-1.1B-Chat`** | `llama` | `LlamaForCausalLM` | 1.1B | **Level 4** | **YES** | **YES** | **YES** | **YES** | **YES** | **FULLY OPERATIONAL** |
| **`google/gemma-2-2b`** | `gemma` | `Gemma2ForCausalLM` | 2.6B | **Level 3** | **YES** | **YES** | **PARTIAL** | **YES** | **YES** | **PARTIALLY SUPPORTED** |
| **`microsoft/phi-2`** | `phi` | `PhiForCausalLM` | 2.7B | **Level 4** | **YES** | **YES** | **YES** | **YES** | **YES** | **FULLY OPERATIONAL** |
| **`mistralai/Mistral-7B-v0.1`** | `mistral` | `MistralForCausalLM` | 7.2B | **Level 4** | **NO (VRAM)** | **YES** | **YES** | **YES** | **YES** | **LOCAL ONLY (VRAM > 14GB)**|
| **`mistralai/Mixtral-8x7B-v0.1`** | `mixtral` | `MixtralForCausalLM` | 46.7B | **Level 4** | **NO (VRAM)** | **YES** | **YES** | **YES** | **YES** | **CLUSTER REQUIRED** |
| **`deepseek-ai/DeepSeek-V3`** | `deepseek` | `DeepseekV3ForCausalLM` | 671B | **Level 1** | **NO (VRAM)** | **N/A** | **N/A** | **N/A** | **N/A** | **METADATA ONLY** |

---

## 4. Hardware Feasibility & VRAM Estimation Formula

The dynamic compatibility engine estimates memory requirements using the model configuration parameters:

$$\text{VRAM}_{\text{estimated}} = \left( P \times B_{\text{dtype}} + \text{Overhead} + \text{KV}_{\text{cache}} \right) \times 1.25$$

Where:
- $P$: Total model parameter count.
- $B_{\text{dtype}}$: Bytes per weight element (e.g. 2 for `bfloat16`/`float16`, 4 for `float32`, 0.5 for 4-bit quantization).
- $\text{KV}_{\text{cache}} = 2 \times L \times H_{\text{kv}} \times D_{\text{head}} \times C_{\text{context}} \times B_{\text{dtype}}$.
- $1.25$: PyTorch CUDA runtime activation buffer headroom.

If $\text{VRAM}_{\text{estimated}} \le 14.0\text{ GB}$, `zerogpu_feasible` evaluates to `True`.  
If $P \le 1.5\times 10^9$, `cpu_feasible` evaluates to `True`.
