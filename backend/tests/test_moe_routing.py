"""Unit and integration tests for MoE (Mixture-of-Experts) routing visualization (Issue #294).

Tests:
1. Adapter matching and capability reporting (MixtralAdapter, DeepseekAdapter vs dense adapters).
2. Canonical math transformation helper (_routing_from_captured): softmax + top-k normalization.
3. Streaming generate_steps() with a synthetic MoE model double:
   - Real forward hook capture on gate module.
   - Per-token 'expert_routing' frames with correct top-k weights summing to 1.0.
   - Clean hook removal on completion and on early exit (try...finally).
4. Streaming generate_steps() with a dense model:
   - Verifies zero overhead: no 'expert_routing' key present in emitted frames.
"""

from __future__ import annotations

import types
from unittest.mock import MagicMock

import torch
from app.inference.adapters.deepseek import DeepseekAdapter
from app.inference.adapters.gemma import GemmaAdapter
from app.inference.adapters.generic import GenericCausalLMAdapter
from app.inference.adapters.gpt2 import GPT2Adapter
from app.inference.adapters.llama import LlamaAdapter
from app.inference.adapters.mistral import MistralAdapter
from app.inference.adapters.mixtral import MixtralAdapter
from app.inference.adapters.qwen import QwenAdapter
from app.model import ActivationEngine, ModelEngine
from torch import nn

# ---------------------------------------------------------------------------
# 1. Adapter Contract and Capability Tests
# ---------------------------------------------------------------------------

class TestMoEAdapters:
    def test_mixtral_adapter_matching(self):
        adapter = MixtralAdapter()
        # Direct model_type matches
        assert adapter.matches_config({"model_type": "mixtral"}) is True
        assert adapter.matches_config({"architectures": ["MixtralForCausalLM"]}) is True
        assert adapter.matches_config({"model_type": "mixtral", "architectures": ["MixtralForCausalLM"]}) is True

        # Disjoint from plain Mistral and other families
        assert adapter.matches_config({"model_type": "mistral"}) is False
        assert adapter.matches_config({"architectures": ["MistralForCausalLM"]}) is False
        assert adapter.matches_config({"model_type": "llama"}) is False
        assert adapter.matches_config({"model_type": "qwen2"}) is False

    def test_mixtral_capabilities(self):
        adapter = MixtralAdapter()
        config = {
            "model_type": "mixtral",
            "architectures": ["MixtralForCausalLM"],
            "num_local_experts": 8,
            "num_experts_per_tok": 2,
            "hidden_size": 4096,
            "num_hidden_layers": 32,
            "vocab_size": 32000,
        }
        caps = adapter.get_capabilities(config)
        assert caps.supports_moe_routing.supported is True
        assert caps.supports_moe_routing.confidence == "high"
        assert "Router logits captured" in caps.supports_moe_routing.reason

    def test_deepseek_adapter_matching(self):
        adapter = DeepseekAdapter()
        assert adapter.matches_config({"model_type": "deepseek_v2"}) is True
        assert adapter.matches_config({"architectures": ["DeepseekV2ForCausalLM"]}) is True
        assert adapter.matches_config({"architectures": ["DeepseekV3ForCausalLM"]}) is True

        # Does not match other architectures
        assert adapter.matches_config({"model_type": "mixtral"}) is False
        assert adapter.matches_config({"model_type": "mistral"}) is False

    def test_deepseek_capabilities_moe_vs_dense(self):
        adapter = DeepseekAdapter()
        # MoE variant (with n_routed_experts)
        moe_config = {
            "model_type": "deepseek_v2",
            "architectures": ["DeepseekV2ForCausalLM"],
            "n_routed_experts": 64,
            "num_experts_per_tok": 6,
            "hidden_size": 2048,
            "num_hidden_layers": 28,
            "vocab_size": 102400,
        }
        caps = adapter.get_capabilities(moe_config)
        assert caps.supports_moe_routing.supported is True
        assert caps.supports_moe_routing.confidence == "high"

        # Dense variant (no MoE keys)
        dense_config = {
            "model_type": "deepseek",
            "architectures": ["DeepseekForCausalLM"],
            "hidden_size": 2048,
            "num_hidden_layers": 28,
            "vocab_size": 102400,
        }
        caps_dense = adapter.get_capabilities(dense_config)
        assert caps_dense.supports_moe_routing.supported is False

    def test_dense_adapters_report_unsupported(self):
        adapters = [
            LlamaAdapter(),
            GPT2Adapter(),
            MistralAdapter(),
            GemmaAdapter(),
            QwenAdapter(),
            GenericCausalLMAdapter(),
        ]
        for a in adapters:
            config = {
                "model_type": a.family_name if a.family_name != "generic" else "unknown",
                "architectures": [f"{a.family_name.capitalize()}ForCausalLM"],
                "hidden_size": 1024,
                "num_hidden_layers": 12,
                "vocab_size": 32000,
            }
            caps = a.get_capabilities(config)
            assert caps.supports_moe_routing.supported is False
            assert caps.supports_moe_routing.confidence in ("high", "medium", "low")

    def test_qwen_capabilities_moe_vs_dense(self):
        adapter = QwenAdapter()
        # Dense Qwen config
        dense_config = {
            "model_type": "qwen2",
            "architectures": ["Qwen2ForCausalLM"],
            "hidden_size": 1024,
            "num_hidden_layers": 12,
            "vocab_size": 32000,
        }
        caps_dense = adapter.get_capabilities(dense_config)
        assert caps_dense.supports_moe_routing.supported is False

        # MoE Qwen config (qwen2_moe with num_experts)
        moe_config = {
            "model_type": "qwen2_moe",
            "architectures": ["Qwen2MoeForCausalLM"],
            "num_experts": 60,
            "num_experts_per_tok": 4,
            "hidden_size": 2048,
            "num_hidden_layers": 24,
            "vocab_size": 151936,
        }
        caps_moe = adapter.get_capabilities(moe_config)
        assert caps_moe.supports_moe_routing.supported is True
        assert caps_moe.supports_moe_routing.confidence == "high"
        assert "Router logits captured" in caps_moe.supports_moe_routing.reason


# ---------------------------------------------------------------------------
# 2. Canonical Routing Helper: _routing_from_captured
# ---------------------------------------------------------------------------

class TestRoutingFromCaptured:
    def test_softmax_topk_math(self):
        # 8 experts, top-2 used
        blocks = [{"layer": 0, "n_experts": 8, "used": 2}]
        # Distinct unnormalized logits for 1 token position
        logits = torch.tensor([[[2.0, 1.0, 0.0, -1.0, 5.0, 0.5, -2.0, 3.0]]])  # shape [1, 1, 8]
        captured = {0: logits}

        routing = ModelEngine._routing_from_captured(captured, blocks)

        assert "per_layer" in routing
        assert len(routing["per_layer"]) == 1
        layer0 = routing["per_layer"][0]
        assert layer0["layer"] == 0
        assert layer0["n_experts"] == 8
        assert layer0["used"] == 2
        assert len(layer0["routing"]) == 1

        entry = layer0["routing"][0]
        assert entry["token"] == 0
        experts = entry["experts"]
        assert len(experts) == 2

        # In the input logits, expert 4 (5.0) and expert 7 (3.0) are top 2
        exp_indices = [e["idx"] for e in experts]
        assert exp_indices == [4, 7]

        # Weights are softmax probabilities of top-k experts out of the router distribution
        weights = [e["weight"] for e in experts]
        assert weights[0] > weights[1]
        assert sum(weights) <= 1.0
        assert round(weights[0], 2) == 0.82
        assert round(weights[1], 2) == 0.11

    def test_handles_2d_and_3d_tensors(self):
        blocks = [{"layer": 1, "n_experts": 4, "used": 1}]
        # 2D tensor [seq, n_experts]
        logits_2d = torch.tensor([[10.0, 5.0, 1.0, 0.0]])
        routing = ModelEngine._routing_from_captured({1: logits_2d}, blocks)
        assert routing["per_layer"][0]["routing"][0]["experts"][0]["idx"] == 0
        assert round(routing["per_layer"][0]["routing"][0]["experts"][0]["weight"], 2) == 0.99


# ---------------------------------------------------------------------------
# 3. Streaming generate_steps with Synthetic Models
# ---------------------------------------------------------------------------

class MockMoEMlp(nn.Module):
    def __init__(self, hidden_dim: int, n_experts: int):
        super().__init__()
        self.gate = nn.Linear(hidden_dim, n_experts, bias=False)
        self.experts = nn.ModuleList([nn.Linear(hidden_dim, hidden_dim) for _ in range(n_experts)])

    def forward(self, x):
        _ = self.gate(x)
        return x


class MockMoEDecoderLayer(nn.Module):
    def __init__(self, hidden_dim: int, n_experts: int):
        super().__init__()
        self.mlp = MockMoEMlp(hidden_dim, n_experts)

    def forward(self, x):
        return self.mlp(x)


class SyntheticMoEModel(nn.Module):
    """Minimal MoE model matching HF / TokenPrint detection patterns."""
    def __init__(self, n_experts: int = 4, used: int = 2, vocab_size: int = 50):
        super().__init__()
        self.config = types.SimpleNamespace(
            num_local_experts=n_experts,
            num_experts_per_tok=used,
            vocab_size=vocab_size,
            hidden_size=16,
            is_encoder_decoder=False,
            model_type="mixtral",
        )
        self.embed = nn.Embedding(vocab_size, 16)
        self.layers = nn.ModuleList([MockMoEDecoderLayer(16, n_experts)])
        self.lm_head = nn.Linear(16, vocab_size, bias=False)

    def forward(self, input_ids, past_key_values=None, use_cache=True, output_hidden_states=True):
        x = self.embed(input_ids)
        for layer in self.layers:
            x = layer(x)

        logits = self.lm_head(x)
        hidden_states = (x,)
        if past_key_values is None and use_cache:
            past_key_values = (((torch.zeros(1, 1, 16, 4), torch.zeros(1, 1, 16, 4)),))
        out = types.SimpleNamespace(
            logits=logits,
            past_key_values=past_key_values,
            hidden_states=hidden_states,
        )
        return out


class SyntheticDenseModel(nn.Module):
    """Minimal dense model without any MoE blocks."""
    def __init__(self, vocab_size: int = 50):
        super().__init__()
        self.config = types.SimpleNamespace(
            vocab_size=vocab_size,
            hidden_size=16,
            is_encoder_decoder=False,
            model_type="llama",
        )
        self.embed = nn.Embedding(vocab_size, 16)
        self.layers = nn.ModuleList([nn.Linear(16, 16)])
        self.lm_head = nn.Linear(16, vocab_size, bias=False)

    def forward(self, input_ids, past_key_values=None, use_cache=True, output_hidden_states=True):
        x = self.embed(input_ids)
        x = self.layers[0](x)
        logits = self.lm_head(x)
        hidden_states = (x,)
        return types.SimpleNamespace(
            logits=logits,
            past_key_values=past_key_values,
            hidden_states=hidden_states,
        )


def _make_dummy_service(model: nn.Module) -> ModelEngine:
    import threading
    service = ModelEngine.__new__(ModelEngine)
    service.model = model
    service.device = "cpu"
    service.model_id = "test-model"
    service.mode = "causal_lm"
    service._lock = threading.Lock()
    service.num_layers = len(getattr(model, "layers", [])) or 1
    service.num_heads = 1
    service.hidden_size = 16
    service.revision = "test-rev"
    service.activation_engine = ActivationEngine()
    service._layer_elapsed = {}
    service._layer_timing_lock = threading.Lock()

    tokenizer = MagicMock()
    tokenizer.side_effect = lambda prompt, **kw: {"input_ids": torch.tensor([[1, 2, 3]])}
    tokenizer.encode.return_value = [1, 2, 3]
    tokenizer.decode.side_effect = lambda ids, **kw: f"tok_{ids[0] if ids else ''}"
    tokenizer.eos_token_id = 9999
    service.tokenizer = tokenizer
    service._catalog = None
    return service


class TestGenerateStepsMoE:
    def test_moe_streaming_frames_contain_expert_routing(self):
        moe_model = SyntheticMoEModel(n_experts=4, used=2)
        service = _make_dummy_service(moe_model)

        frames = list(
            service.generate_steps(
                prompt="test prompt",
                max_new_tokens=3,
                top_k=5,
                use_chat_template=False,
                include_catalog=False,
                decoding_mode="greedy",
            )
        )

        token_frames = [f for f in frames if f.get("type") == "token"]
        assert len(token_frames) == 3

        for i, frame in enumerate(token_frames):
            assert "expert_routing" in frame, f"Frame {i} missing expert_routing"
            routing = frame["expert_routing"]
            assert "per_layer" in routing
            assert len(routing["per_layer"]) == 1

            layer_info = routing["per_layer"][0]
            assert layer_info["layer"] == 0
            assert layer_info["n_experts"] == 4
            assert layer_info["used"] == 2
            assert len(layer_info["routing"]) >= 1

            # Check experts top-k
            experts = layer_info["routing"][-1]["experts"]
            assert len(experts) == 2
            weights = [e["weight"] for e in experts]
            assert weights[0] >= weights[1]
            assert sum(weights) <= 1.0

        # Verify hook handles were removed cleanly after generator completes
        gate = moe_model.layers[0].mlp.gate
        assert len(gate._forward_hooks) == 0

    def test_dense_model_has_zero_overhead_no_expert_routing(self):
        dense_model = SyntheticDenseModel()
        service = _make_dummy_service(dense_model)

        frames = list(
            service.generate_steps(
                prompt="dense test",
                max_new_tokens=3,
                top_k=5,
                use_chat_template=False,
                include_catalog=False,
                decoding_mode="greedy",
            )
        )

        token_frames = [f for f in frames if f.get("type") == "token"]
        assert len(token_frames) == 3

        for i, frame in enumerate(token_frames):
            assert "expert_routing" not in frame, f"Dense frame {i} unexpectedly has expert_routing"

    def test_hook_cleanup_on_generator_close(self):
        moe_model = SyntheticMoEModel(n_experts=4, used=2)
        service = _make_dummy_service(moe_model)

        gen = service.generate_steps(
            prompt="break test",
            max_new_tokens=5,
            top_k=5,
            use_chat_template=False,
            include_catalog=False,
            decoding_mode="greedy",
        )

        # Consume only meta frame and 1 token frame, then close early
        next(gen)  # meta frame
        next(gen)  # first token frame
        gen.close()

        # Verify hook handles are removed even on early exit
        gate = moe_model.layers[0].mlp.gate
        assert len(gate._forward_hooks) == 0

    def test_speculative_decoding_moe_frames(self):
        moe_model = SyntheticMoEModel(n_experts=4, used=2)
        service = _make_dummy_service(moe_model)

        frames = list(
            service.generate_steps(
                prompt="test speculative prompt",
                max_new_tokens=4,
                top_k=5,
                use_chat_template=False,
                include_catalog=False,
                decoding_mode="speculative",
                draft_gamma=2,
            )
        )

        token_frames = [f for f in frames if f.get("type") == "token"]
        assert len(token_frames) >= 2
        for f in token_frames:
            assert "expert_routing" in f, "Speculative MoE frame missing expert_routing"
            assert "per_layer" in f["expert_routing"]

    def test_op_catalog_moe_support(self):
        class CatalogMoELayer(nn.Module):
            def __init__(self, hidden_dim: int, n_experts: int):
                super().__init__()
                self.input_layernorm = nn.LayerNorm(hidden_dim)
                self.self_attn = types.SimpleNamespace(
                    q_proj=nn.Linear(hidden_dim, hidden_dim),
                    k_proj=nn.Linear(hidden_dim, hidden_dim),
                    v_proj=nn.Linear(hidden_dim, hidden_dim),
                    o_proj=nn.Linear(hidden_dim, hidden_dim),
                )
                # MoE block without gate_proj/up_proj/down_proj (e.g. Qwen2-MoE, DeepSeek)
                self.mlp = MockMoEMlp(hidden_dim, n_experts)

        class CatalogMoEModel(nn.Module):
            def __init__(self):
                super().__init__()
                self.config = types.SimpleNamespace(
                    num_local_experts=4,
                    num_experts_per_tok=2,
                    vocab_size=50,
                    hidden_size=16,
                    is_encoder_decoder=False,
                    model_type="qwen2_moe",
                )
                self.model = types.SimpleNamespace(
                    embed_tokens=nn.Embedding(50, 16),
                    layers=nn.ModuleList([CatalogMoELayer(16, 4)]),
                    norm=nn.LayerNorm(16),
                )
                self.lm_head = nn.Linear(16, 50, bias=False)

            def forward(self, input_ids, past_key_values=None, use_cache=True, output_hidden_states=True):
                x = self.model.embed_tokens(input_ids)
                for l in self.model.layers:
                    x = l.mlp(x)
                logits = self.lm_head(x)
                return types.SimpleNamespace(
                    logits=logits,
                    past_key_values=past_key_values,
                    hidden_states=(x,),
                )

        cat_model = CatalogMoEModel()
        service = _make_dummy_service(cat_model)
        frames = list(
            service.generate_steps(
                prompt="test catalog",
                max_new_tokens=1,
                include_catalog=True,
                use_chat_template=False,
            )
        )
        meta_frame = next(f for f in frames if f.get("type") == "meta")
        assert "op_catalog" in meta_frame
        ops = meta_frame["op_catalog"]
        op_keys = [op["op_key"] for op in ops]
        assert "mlp.gate" in op_keys

    def test_analyze_forward_only_moe_routing_2d_and_3d(self):
        moe_model = SyntheticMoEModel(n_experts=4, used=2)
        service = _make_dummy_service(moe_model)

        blocks = [{"layer": 0, "n_experts": 4, "used": 2}]
        # 2D capture [seq_len, n_experts]
        captured_2d = {0: torch.tensor([[0.1, 2.5, 0.3, 0.9], [1.8, 0.2, 0.4, 0.1]])}
        # 3D capture [batch_size, seq_len, n_experts]
        captured_3d = {0: torch.tensor([[[0.1, 2.5, 0.3, 0.9], [1.8, 0.2, 0.4, 0.1]]])}

        routing_2d = service._routing_from_captured(captured_2d, blocks)
        routing_3d = service._routing_from_captured(captured_3d, blocks)

        assert routing_2d == routing_3d
        assert "per_layer" in routing_2d
        per_layer = routing_2d["per_layer"]
        assert len(per_layer) == 1
        assert per_layer[0]["layer"] == 0
        assert per_layer[0]["n_experts"] == 4
        assert per_layer[0]["used"] == 2
        assert len(per_layer[0]["routing"]) == 2
        assert per_layer[0]["routing"][0]["token"] == 0
        assert per_layer[0]["routing"][0]["experts"][0]["idx"] == 1
        assert per_layer[0]["routing"][1]["token"] == 1
        assert per_layer[0]["routing"][1]["experts"][0]["idx"] == 0


