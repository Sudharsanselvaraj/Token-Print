"""Dimensionality reduction for the Embedding District (Phase 2).

We use **PCA** (scikit-learn) to project high-dimensional vectors to 3D:

  * deterministic — the same sentence always yields the same coordinates, which
    keeps the 3D world stable and revisitable (sklearn's PCA applies svd_flip so
    signs are stable too);
  * zero extra dependencies — scikit-learn is already installed;
  * instant at these sizes (<= 40 tokens x 896 dims).

Honesty caveat surfaced to the user in the UI: a 3D projection of 896-dim
vectors is an APPROXIMATION. UMAP's neighbourhood-preservation advantage only
matters at hundreds+ of points; at ~40 tokens any projection is impressionistic.
This is a projection, not the literal high-dimensional geometry.
"""

from __future__ import annotations

import numpy as np
from sklearn.decomposition import PCA

WORLD_HALF = 8.0  # projected coords are scaled to fit in a [-8, 8] box


def project_3d(vectors, world_half: float = WORLD_HALF) -> list[list[float]]:
    """PCA-project [n, dim] vectors to a scaled [n, 3] list of coordinates.

    Handles the small-n edge cases (n < 3) that would otherwise break PCA by
    projecting into as many components as are available and zero-padding the
    rest.
    """
    X = np.asarray(vectors, dtype=np.float64)
    if X.ndim != 2 or X.shape[0] == 0:
        return []

    n, dim = X.shape
    proj = np.zeros((n, 3), dtype=np.float64)

    n_components = min(3, n, dim)
    if n >= 2 and n_components >= 1:
        pca = PCA(n_components=n_components, svd_solver="full")
        fitted = pca.fit_transform(X)  # [n, n_components]
        proj[:, :n_components] = fitted
    # n == 1 (or degenerate) -> leave at origin.

    # Scale uniformly so the cloud fits the world box (preserves relative shape).
    max_abs = float(np.max(np.abs(proj))) if proj.size else 0.0
    if max_abs > 0:
        proj = proj / max_abs * world_half

    return [[round(float(v), 4) for v in row] for row in proj]


def explained_variance(vectors) -> list[float]:
    """Fraction of variance captured by each of the 3 PCA axes (diagnostic)."""
    X = np.asarray(vectors, dtype=np.float64)
    if X.ndim != 2 or X.shape[0] < 2:
        return []
    n_components = min(3, X.shape[0], X.shape[1])
    pca = PCA(n_components=n_components, svd_solver="full")
    pca.fit(X)
    return [round(float(v), 4) for v in pca.explained_variance_ratio_]


def _span_mass_matrix(
    attn: np.ndarray,
    target_indices: list[int],
    span: tuple[int, int],
) -> np.ndarray:
    """Return [layer, head, target] attention mass into an inclusive token span."""
    start, end = span
    if start < 0 or end < start or attn.shape[-1] == 0:
        return np.zeros((attn.shape[0], attn.shape[1], len(target_indices)))

    end = min(end, attn.shape[-1] - 1)
    clamped_targets = [i for i in target_indices if 0 <= i < attn.shape[-2]]
    if not clamped_targets:
        return np.zeros((attn.shape[0], attn.shape[1], 0))

    rows = attn[:, :, clamped_targets, :]  # [L, H, T, S]
    return rows[:, :, :, start : end + 1].sum(axis=-1)  # [L, H, T]


def _reduce_layer_head_mass(
    mass: np.ndarray,
) -> tuple[list[float], list[float]]:
    """Reduce [L, H, T] to per-target vectors for all-layers and last-layer."""
    if mass.size == 0:
        return [], []
    all_layers = mass.mean(axis=(0, 1))
    last_layer = mass[-1].mean(axis=0)
    return (
        [round(float(v), 6) for v in all_layers.tolist()],
        [round(float(v), 6) for v in last_layer.tolist()],
    )


def chunk_attribution(
    attention: list[list[list[list[float]]]],
    target_span: tuple[int, int],
    chunk_spans: dict[str, tuple[int, int]],
) -> dict[str, list[list[float]]]:
    """Reduce full attention tensor into per-target-token, per-chunk attribution.

    Returns matrices shaped [target_token][chunk_id] for all-layers mean and
    last-layer mean.
    """
    attn = np.asarray(attention, dtype=np.float64)
    if attn.ndim != 4:
        return {
            "chunk_ids": [],
            "all_layers_mean": [],
            "last_layer": [],
        }

    t_start, t_end = target_span
    target_indices = [i for i in range(t_start, t_end + 1) if 0 <= i < attn.shape[-2]]
    if not target_indices:
        return {
            "chunk_ids": list(chunk_spans.keys()),
            "all_layers_mean": [],
            "last_layer": [],
        }

    chunk_ids = list(chunk_spans.keys())
    all_layers_cols: list[list[float]] = []
    last_layer_cols: list[list[float]] = []
    for chunk_id in chunk_ids:
        mass = _span_mass_matrix(attn, target_indices, chunk_spans[chunk_id])
        all_layers, last_layer = _reduce_layer_head_mass(mass)
        all_layers_cols.append(all_layers)
        last_layer_cols.append(last_layer)

    all_layers_rows = [list(row) for row in zip(*all_layers_cols)] if all_layers_cols else []
    last_layer_rows = [list(row) for row in zip(*last_layer_cols)] if last_layer_cols else []
    return {
        "chunk_ids": chunk_ids,
        "all_layers_mean": all_layers_rows,
        "last_layer": last_layer_rows,
    }


def query_self_attribution(
    attention: list[list[list[list[float]]]],
    target_span: tuple[int, int],
    query_span: tuple[int, int],
) -> dict[str, list[float]]:
    """Attention mass from each target token back to query token span."""
    attn = np.asarray(attention, dtype=np.float64)
    if attn.ndim != 4:
        return {"all_layers_mean": [], "last_layer": []}

    t_start, t_end = target_span
    target_indices = [i for i in range(t_start, t_end + 1) if 0 <= i < attn.shape[-2]]
    mass = _span_mass_matrix(attn, target_indices, query_span)
    all_layers, last_layer = _reduce_layer_head_mass(mass)
    return {"all_layers_mean": all_layers, "last_layer": last_layer}


def ungrounded_flags(
    attribution_rows: list[list[float]],
    query_self: list[float],
    threshold: float,
) -> list[bool]:
    """Flag tokens with weak chunk grounding relative to query-self attention."""
    if not attribution_rows:
        return []

    flags: list[bool] = []
    for i, row in enumerate(attribution_rows):
        max_chunk = max(row) if row else 0.0
        self_mass = query_self[i] if i < len(query_self) else 0.0
        flags.append(max_chunk < threshold and max_chunk < self_mass)
    return flags


def causal_chunk_scores(
    baseline_prob: float,
    patched_probs: dict[str, float],
    mode: str = "knockout",
    corrupted_prob: float = 0.0,
) -> dict[str, dict[str, float]]:
    """Compute causal attribution metrics from activation patching probabilities.

    Parameters:
        baseline_prob: Probability of target token under clean prompt.
        patched_probs: Map of chunk_id -> probability of target token under intervention.
        mode: "knockout" (measuring probability drop) or "restoration" (measuring recovery).
        corrupted_prob: Probability under corrupted prompt (used in restoration mode).

    Returns:
        Map of chunk_id -> {
            "patched_prob": float,
            "causal_effect": float,
            "relative_effect": float,
        }
    """
    scores: dict[str, dict[str, float]] = {}
    denom = max(baseline_prob - corrupted_prob, 1e-7) if mode == "restoration" else max(baseline_prob, 1e-7)

    for chunk_id, p_patched in patched_probs.items():
        if mode == "restoration":
            raw_effect = p_patched - corrupted_prob
            relative = max(0.0, min(1.0, raw_effect / denom))
        else:
            # Knockout mode: higher drop means higher causal importance
            raw_effect = baseline_prob - p_patched
            relative = max(0.0, min(1.0, raw_effect / denom))

        scores[chunk_id] = {
            "patched_prob": round(float(p_patched), 5),
            "causal_effect": round(float(raw_effect), 5),
            "relative_effect": round(float(relative), 5),
        }

    return scores

