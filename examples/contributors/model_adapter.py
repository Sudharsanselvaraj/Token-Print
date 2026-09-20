"""Working capability-adapter example; no model download or invented measurements.

Run: PYTHONPATH=backend backend/.venv/bin/python examples/contributors/model_adapter.py
This adapter recognizes an explicit example family but enables no unverified hooks.
"""

from app.inference.adapters.base import ModelAdapter
from app.inference.capabilities import CapabilityStatus, ModelCapabilities


class ExampleAdapter(ModelAdapter):
    family_name = "example_decoder"

    def matches_config(self, config):
        return config.get("model_type") == "example_decoder"

    def get_capabilities(self, config):
        unavailable = CapabilityStatus(
            supported=False,
            confidence="high",
            reason="Example adapter: no runtime capture hooks have been verified.",
        )
        return ModelCapabilities(
            supports_attention=unavailable,
            supports_hidden_states=unavailable,
            supports_logit_lens=unavailable,
            supports_head_ablation=unavailable,
            supports_layer_ablation=unavailable,
            supports_activation_patch=unavailable,
            max_context_length=config.get("max_position_embeddings", 0),
            parameter_count=self._extract_param_count(config),
            architecture="ExampleDecoder",
            vram_estimate=self.estimate_vram(config),
        )


if __name__ == "__main__":
    adapter = ExampleAdapter()
    assert adapter.matches_config({"model_type": "example_decoder"})
    assert not adapter.matches_config({"model_type": "gpt2"})
    capabilities = adapter.get_capabilities({"max_position_embeddings": 1024})
    assert not capabilities.supports_activation_patch.supported
    print(capabilities.model_dump_json(indent=2))
