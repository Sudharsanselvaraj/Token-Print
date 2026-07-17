"""NeuroScope backend — FastAPI service serving REAL language-model internals.

Every value this package emits (attention weights, hidden-state stats, logits)
comes from an actual forward pass of a real open-weight model. Nothing here is
synthetic or hardcoded to stand in for model internals.
"""
