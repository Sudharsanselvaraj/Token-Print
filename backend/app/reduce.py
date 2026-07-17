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
