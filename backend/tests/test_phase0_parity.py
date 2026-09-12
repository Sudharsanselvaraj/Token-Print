"""Regression test ensuring 100% parity between raw ModelEngine and HFLocalBackend."""

import pytest
from app.inference.backends.hf_local import HFLocalBackend


class DummyModelEngine:
    def __init__(self):
        self.model_id = "Qwen/Qwen2.5-0.5B-Instruct"
        self.device = "cpu"
        self.mode = "causal_lm"
        self.model_type = "qwen2"
        self.num_layers = 2
        self.num_heads = 2
        self.hidden_size = 128
        self.is_loaded = True
        self.revision = "abc123sha"

    def analyze(self, sentence: str):
        from app.schemas import AnalyzeResponse, Token
        return AnalyzeResponse(
            sentence=sentence,
            model=self.model_id,
            device=self.device,
            mode=self.mode,
            model_type=self.model_type,
            num_layers=self.num_layers,
            num_heads=self.num_heads,
            hidden_size=self.hidden_size,
            tokens=[
                Token(index=0, text="Hello", piece="Hello", id=101, is_special=False),
                Token(index=1, text="world", piece="world", id=102, is_special=False),
            ],
            attention=[[[[0.5, 0.5], [0.5, 0.5]]]],
        )


@pytest.mark.asyncio
async def test_hf_local_backend_parity():
    dummy_engine = DummyModelEngine()
    raw_response = dummy_engine.analyze("Hello world")

    backend = HFLocalBackend(engine=dummy_engine)
    backend_response = await backend.analyze("Hello world")

    assert backend_response.sentence == raw_response.sentence
    assert backend_response.model == raw_response.model
    assert backend_response.device == raw_response.device
    assert backend_response.num_layers == raw_response.num_layers
    assert backend_response.num_heads == raw_response.num_heads
    assert backend_response.tokens == raw_response.tokens
    assert backend_response.attention == raw_response.attention

    # Ensure Phase 0 ProvenanceInfo is attached
    assert backend_response.provenance is not None
    assert backend_response.provenance.source_type == "REAL"
    assert backend_response.provenance.backend == "hf_local"
    assert backend_response.provenance.model_revision == "abc123sha"
