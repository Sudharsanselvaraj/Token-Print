"""Unit tests for ProvenanceInfo schema validation."""

from app.schemas import ProvenanceInfo


def test_provenance_info_validation():
    prov = ProvenanceInfo(
        source_type="REAL",
        backend="hf_local",
        device="cpu",
        model_id="Qwen/Qwen2.5-0.5B-Instruct",
        model_revision="abc123sha",
        operation="forward_pass",
        layer=5,
        head=2,
        tensor="attention_weights",
        dtype="float32",
        shape=[1, 16, 12, 12],
        notes="Executed on CPU instrumented backend.",
    )

    assert prov.source_type == "REAL"
    assert prov.backend == "hf_local"
    assert prov.model_revision == "abc123sha"
    assert prov.layer == 5
    assert prov.head == 2
    assert prov.shape == [1, 16, 12, 12]
