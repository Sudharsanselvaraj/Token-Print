"""Unit tests for ModelAdapter capability abstractions (ENG-14).

Verifies capabilities flags and analysis output augmentation across CausalLMAdapter,
EncoderAdapter, and VisionAdapter architectures.
"""

from app.adapters import (
    CausalLMAdapter,
    EncoderAdapter,
    VisionAdapter,
    get_model_adapter,
)


def test_causal_lm_adapter_capabilities():
    adapter = CausalLMAdapter()
    caps = adapter.capabilities()
    assert caps["causal_generation"] is True
    assert caps["logit_lens"] is True
    assert caps["attention_maps"] is True
    assert caps["sentence_pooling"] is False
    assert caps["image_processing"] is False

    processed = adapter.process_analysis({"model": "test-causal"})
    assert "capabilities" in processed
    assert processed["capabilities"]["logit_lens"] is True


def test_encoder_adapter_capabilities():
    adapter = EncoderAdapter()
    caps = adapter.capabilities()
    assert caps["causal_generation"] is False
    assert caps["logit_lens"] is False
    assert caps["sentence_pooling"] is True
    assert caps["image_processing"] is False


def test_vision_adapter_capabilities():
    adapter = VisionAdapter()
    caps = adapter.capabilities()
    assert caps["image_processing"] is True
    assert caps["causal_generation"] is False


def test_get_model_adapter_factory():
    causal = get_model_adapter("causal_lm")
    assert isinstance(causal, CausalLMAdapter)

    encoder = get_model_adapter("encoder")
    assert isinstance(encoder, EncoderAdapter)

    vision = get_model_adapter("vision")
    assert isinstance(vision, VisionAdapter)

    # Fallback to CausalLMAdapter for unknown mode
    unknown = get_model_adapter("unknown")
    assert isinstance(unknown, CausalLMAdapter)
