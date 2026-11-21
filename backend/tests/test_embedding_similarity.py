"""Prompt-level embedding similarity for encoder models (issue #298).

The engine tests run a real forward pass through a real ``BertModel`` with a
real WordPiece tokenizer. The model is built locally from a small config with
seeded weights, so the suite needs no network and is fully deterministic.
Expected values are recomputed independently (``last_hidden_state`` +
``torch.nn.functional.cosine_similarity``) rather than copied from the code
under test.
"""

from __future__ import annotations

import sys
import threading
from pathlib import Path
from unittest import mock

import pytest

torch = pytest.importorskip("torch")
transformers = pytest.importorskip("transformers")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from starlette.testclient import TestClient

import app.main as main_module
from app.adapters import get_model_adapter
from app.model import ModelEngine, TokenizedTooLong

WORDS = [
    "the", "a", "cat", "dog", "sat", "on", "mat", "rug", "stock", "market",
    "fell", "today", "sharply", "kitten", "slept", "bank", "river", "money",
]
SENTENCES = ["the cat sat on the mat", "a kitten slept on a rug", "the stock market fell sharply today"]


@pytest.fixture(scope="module")
def tiny_bert(tmp_path_factory):
    """A real BertModel + WordPiece tokenizer, seeded, built offline."""
    vocab = ["[PAD]", "[UNK]", "[CLS]", "[SEP]", "[MASK]", *WORDS]
    vocab_file = tmp_path_factory.mktemp("bert") / "vocab.txt"
    vocab_file.write_text("\n".join(vocab) + "\n")
    tokenizer = transformers.BertTokenizerFast(vocab_file=str(vocab_file))
    config = transformers.BertConfig(
        vocab_size=len(vocab),
        hidden_size=32,
        num_hidden_layers=2,
        num_attention_heads=2,
        intermediate_size=64,
        max_position_embeddings=64,
    )
    torch.manual_seed(0)
    model = transformers.BertModel(config).eval()
    return model, tokenizer


def _engine(model, tokenizer, mode: str = "encoder") -> ModelEngine:
    eng = ModelEngine.__new__(ModelEngine)
    eng.model = model
    eng.tokenizer = tokenizer
    eng.device = "cpu"
    eng.mode = mode
    eng.model_id = "local/tiny-bert"
    eng.revision = "test-rev"
    eng.num_layers = model.config.num_hidden_layers
    eng.num_heads = model.config.num_attention_heads
    eng.hidden_size = model.config.hidden_size
    eng.model_type = "bert"
    eng.adapter = get_model_adapter(mode)
    eng._lock = threading.Lock()
    return eng


def _reference_matrix(model, tokenizer, sentences):
    """Independent recomputation: per-sentence mean of last_hidden_state, then cosine."""
    vecs = []
    with torch.no_grad():
        for s in sentences:
            enc = tokenizer(s, return_tensors="pt")
            vecs.append(model(**enc).last_hidden_state[0].mean(0))
    n = len(vecs)
    return [
        [float(torch.nn.functional.cosine_similarity(vecs[i], vecs[j], dim=0)) for j in range(n)]
        for i in range(n)
    ]


# --------------------------------------------------------------------------- #
# Engine: real forward pass
# --------------------------------------------------------------------------- #

class TestEmbedSimilarityEngine:
    def test_matches_independent_computation(self, tiny_bert):
        model, tokenizer = tiny_bert
        out = _engine(model, tokenizer).embed_similarity(SENTENCES)
        expected = _reference_matrix(model, tokenizer, SENTENCES)

        for i in range(3):
            for j in range(3):
                assert out["matrix"][i][j] == pytest.approx(expected[i][j], abs=1e-4)

    def test_matrix_is_a_valid_cosine_matrix(self, tiny_bert):
        model, tokenizer = tiny_bert
        m = _engine(model, tokenizer).embed_similarity(SENTENCES)["matrix"]

        assert len(m) == 3 and all(len(row) == 3 for row in m)
        for i in range(3):
            assert m[i][i] == pytest.approx(1.0, abs=1e-4)
            for j in range(3):
                assert -1.0 <= m[i][j] <= 1.0
                assert m[i][j] == pytest.approx(m[j][i], abs=1e-6)

    def test_identical_sentences_score_one(self, tiny_bert):
        model, tokenizer = tiny_bert
        m = _engine(model, tokenizer).embed_similarity(["the cat sat", "the cat sat"])["matrix"]
        assert m[0][1] == pytest.approx(1.0, abs=1e-4)

    def test_pair_score_does_not_depend_on_other_sentences(self, tiny_bert):
        """One forward pass per sentence: no padding or batch effects leak in."""
        model, tokenizer = tiny_bert
        eng = _engine(model, tokenizer)
        pair = eng.embed_similarity(SENTENCES[:2])["matrix"][0][1]
        triple = eng.embed_similarity(SENTENCES)["matrix"][0][1]
        assert pair == triple

    def test_reports_provenance_and_token_counts(self, tiny_bert):
        model, tokenizer = tiny_bert
        out = _engine(model, tokenizer).embed_similarity(SENTENCES[:2])

        assert out["model"] == "local/tiny-bert"
        assert out["mode"] == "encoder"
        assert out["model_revision"] == "test-rev"
        assert out["pooling"] == "mean" and out["similarity"] == "cosine"
        assert out["embedding_dim"] == 32
        for item, s in zip(out["sentences"], SENTENCES[:2]):
            assert item["text"] == s
            assert item["num_tokens"] == len(tokenizer(s)["input_ids"])  # incl. [CLS]/[SEP]

    @pytest.mark.parametrize("mode", ["causal_lm", "vision"])
    def test_rejects_non_encoder_models(self, tiny_bert, mode):
        model, tokenizer = tiny_bert
        with pytest.raises(ValueError, match="encoder"):
            _engine(model, tokenizer, mode=mode).embed_similarity(SENTENCES[:2])

    def test_token_cap_is_enforced(self, tiny_bert):
        model, tokenizer = tiny_bert
        long_sentence = " ".join(["cat"] * 200)
        with pytest.raises(TokenizedTooLong):
            _engine(model, tokenizer).embed_similarity(["the cat", long_sentence])


# --------------------------------------------------------------------------- #
# API: POST /analyze/similarity
# --------------------------------------------------------------------------- #

@pytest.fixture()
def client_for():
    """Return a TestClient factory whose lifespan loads the given engine."""
    stack = []

    def make(engine):
        p = mock.patch.object(main_module, "ModelEngine", return_value=engine)
        p.start()
        c = TestClient(main_module.app)
        c.__enter__()
        stack.append((p, c))
        return c

    yield make
    for p, c in stack:
        c.__exit__(None, None, None)
        p.stop()


class TestSimilarityEndpoint:
    def test_happy_path_returns_real_matrix(self, tiny_bert, client_for):
        model, tokenizer = tiny_bert
        client = client_for(_engine(model, tokenizer))

        resp = client.post("/analyze/similarity", json={"sentences": SENTENCES})

        assert resp.status_code == 200, resp.text
        body = resp.json()
        expected = _reference_matrix(model, tokenizer, SENTENCES)
        assert body["matrix"][0][2] == pytest.approx(expected[0][2], abs=1e-4)
        assert [s["text"] for s in body["sentences"]] == SENTENCES

    def test_sentences_are_trimmed(self, tiny_bert, client_for):
        model, tokenizer = tiny_bert
        client = client_for(_engine(model, tokenizer))
        resp = client.post("/analyze/similarity", json={"sentences": ["  the cat ", "a dog\n"]})
        assert resp.status_code == 200
        assert [s["text"] for s in resp.json()["sentences"]] == ["the cat", "a dog"]

    @pytest.mark.parametrize(
        "sentences",
        [["only one"], ["a"] * 9, ["the cat", "   "], []],
        ids=["too-few", "too-many", "blank", "empty"],
    )
    def test_invalid_input_is_422(self, tiny_bert, client_for, sentences):
        model, tokenizer = tiny_bert
        client = client_for(_engine(model, tokenizer))
        resp = client.post("/analyze/similarity", json={"sentences": sentences})
        assert resp.status_code == 422

    def test_non_encoder_model_is_400(self, tiny_bert, client_for):
        model, tokenizer = tiny_bert
        client = client_for(_engine(model, tokenizer, mode="causal_lm"))
        resp = client.post("/analyze/similarity", json={"sentences": SENTENCES[:2]})
        assert resp.status_code == 400
        assert "encoder" in resp.json()["detail"]

    def test_too_many_tokens_is_400(self, tiny_bert, client_for):
        model, tokenizer = tiny_bert
        client = client_for(_engine(model, tokenizer))
        resp = client.post(
            "/analyze/similarity", json={"sentences": ["the cat", " ".join(["cat"] * 200)]}
        )
        assert resp.status_code == 400


def test_response_schema_only_allows_encoder_mode():
    """The endpoint only serves encoder models, and the contract says so."""
    from pydantic import ValidationError

    from app.schemas import SimilarityResponse

    base = {
        "model": "m",
        "pooling": "mean",
        "pooling_note": "n",
        "similarity": "cosine",
        "embedding_dim": 2,
        "sentences": [{"text": "a", "num_tokens": 1}, {"text": "b", "num_tokens": 1}],
        "matrix": [[1.0, 0.5], [0.5, 1.0]],
    }
    assert SimilarityResponse(mode="encoder", **base).mode == "encoder"
    with pytest.raises(ValidationError):
        SimilarityResponse(mode="causal_lm", **base)
