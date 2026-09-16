import unittest

import torch
from app.model import GenerationState


class DummyCache:
    """Mock DynamicCache for unit testing KV cache truncation."""
    def __init__(self, seq_len: int = 20, num_layers: int = 2):
        self.key_cache = [torch.randn(1, 4, seq_len, 16) for _ in range(num_layers)]
        self.value_cache = [torch.randn(1, 4, seq_len, 16) for _ in range(num_layers)]
        self._seen_tokens = seq_len


class TestGenerationState(unittest.TestCase):
    def test_initialization(self):
        state = GenerationState()
        self.assertIsNone(state.past_key_values)
        self.assertEqual(state.positions_done, 0)

    def test_trim_dummy_cache(self):
        cache = DummyCache(seq_len=20)
        state = GenerationState(past_key_values=cache, positions_done=20)

        # Trim to keep last 10 positions
        state.trim_cache(10)
        self.assertIsNotNone(state.past_key_values)
        self.assertEqual(state.past_key_values.key_cache[0].shape[-2], 10)
        self.assertEqual(state.past_key_values.value_cache[0].shape[-2], 10)

    def test_trim_tuple_cache(self):
        # Tuple format: tuple of (key, value) per layer
        layer1_k = torch.randn(1, 4, 15, 16)
        layer1_v = torch.randn(1, 4, 15, 16)
        layer2_k = torch.randn(1, 4, 15, 16)
        layer2_v = torch.randn(1, 4, 15, 16)
        tuple_cache = ((layer1_k, layer1_v), (layer2_k, layer2_v))

        state = GenerationState(past_key_values=tuple_cache, positions_done=15)
        state.trim_cache(8)

        self.assertEqual(state.past_key_values[0][0].shape[-2], 8)
        self.assertEqual(state.past_key_values[0][1].shape[-2], 8)
        self.assertEqual(state.past_key_values[1][0].shape[-2], 8)

    def test_rollback_speculative_drafts(self):
        cache = DummyCache(seq_len=20)
        # 16 prompt/pre-draft tokens + 4 draft tokens evaluated = 20 total
        state = GenerationState(past_key_values=cache, positions_done=20)

        # 1 draft token accepted out of gamma=4 (3 rejected)
        state.rollback_speculative_drafts(accepted_k=1, draft_gamma=4)

        # Target length should be 20 - (4 - 1) = 17 positions
        self.assertEqual(state.positions_done, 17)
        self.assertEqual(state.past_key_values.key_cache[0].shape[-2], 17)
        self.assertEqual(state.past_key_values.value_cache[0].shape[-2], 17)

    def test_rollback_all_accepted(self):
        cache = DummyCache(seq_len=20)
        state = GenerationState(past_key_values=cache, positions_done=20)

        # All 4 drafts accepted -> no rollback required
        state.rollback_speculative_drafts(accepted_k=4, draft_gamma=4)
        self.assertEqual(state.positions_done, 20)
        self.assertEqual(state.past_key_values.key_cache[0].shape[-2], 20)


if __name__ == "__main__":
    unittest.main()
