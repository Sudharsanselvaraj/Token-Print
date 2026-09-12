"""Unit tests for remote Hugging Face model lookup restriction & caching (ENG-11)."""

import sys
from pathlib import Path
from unittest import mock

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Pre-mock heavy native deps before importing app.model
_HEAVY_MODS = [
    "torch", "torch.nn", "torch.nn.functional", "transformers", "sklearn", "sklearn.decomposition", "llama_cpp"
]
for _mod in _HEAVY_MODS:
    if _mod not in sys.modules:
        sys.modules[_mod] = mock.MagicMock()

import pytest
from app.model import ModelEngine


def test_validate_model_id_valid():
    assert ModelEngine._validate_model_id("Qwen/Qwen2.5-0.5B-Instruct") == "Qwen/Qwen2.5-0.5B-Instruct"
    assert ModelEngine._validate_model_id("meta-llama/Llama-2-7b-hf") == "meta-llama/Llama-2-7b-hf"
    assert ModelEngine._validate_model_id("gpt2") == "gpt2"


def test_validate_model_id_invalid_traversal():
    with pytest.raises(ValueError, match="Invalid model_id format"):
        ModelEngine._validate_model_id("../../../etc/passwd")


def test_validate_model_id_invalid_slashes():
    with pytest.raises(ValueError, match="Invalid model_id format"):
        ModelEngine._validate_model_id("/absolute/path")

    with pytest.raises(ValueError, match="Invalid model_id format"):
        ModelEngine._validate_model_id("trailing/slash/")


def test_validate_model_id_invalid_chars():
    with pytest.raises(ValueError, match="Invalid model_id characters"):
        ModelEngine._validate_model_id("model<script>alert(1)</script>")

    with pytest.raises(ValueError, match="Invalid model_id characters"):
        ModelEngine._validate_model_id("model with spaces")


def test_validate_model_id_empty():
    with pytest.raises(ValueError, match="non-empty string"):
        ModelEngine._validate_model_id("")


def test_cached_checkpoint_architecture():
    # Verify LRU cache works and returns cached objects for identical model IDs
    mock_config = mock.MagicMock()
    mock_config.hidden_size = 896
    mock_config.num_attention_heads = 14
    mock_config.num_hidden_layers = 24
    mock_config.vocab_size = 151936
    mock_config.model_type = "qwen2"

    with mock.patch("transformers.AutoConfig.from_pretrained", return_value=mock_config) as mock_from_pretrained:
        res1 = ModelEngine.checkpoint_architecture("test-org/dummy-model")
        ModelEngine.checkpoint_architecture("test-org/dummy-model")

        assert res1["model"] == "test-org/dummy-model"
        assert res1["metadata"]["num_layers"] == 24
        # Assert AutoConfig.from_pretrained was called only ONCE due to LRU caching
        assert mock_from_pretrained.call_count == 1
