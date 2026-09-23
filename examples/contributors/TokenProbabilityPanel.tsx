"use client";
// Copy into frontend/components/ui/ and register it as described in docs/contributor-examples.md.
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";

type SortField = "token" | "prob";
type SortOrder = "asc" | "desc";

export default function TokenProbabilityPanel() {
  const frame = useStore((s) => s.genFrames[Math.max(s.playIndex, 0)]);
  const [sortField, setSortField] = useState<SortField>("prob");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const sortedTopk = useMemo(() => {
    if (!frame?.topk?.length) return [];
    return [...frame.topk].sort((a, b) => {
      if (sortField === "token") {
        const textA = a.text ?? "";
        const textB = b.text ?? "";
        return sortOrder === "asc"
          ? textA.localeCompare(textB)
          : textB.localeCompare(textA);
      }
      return sortOrder === "asc" ? a.prob - b.prob : b.prob - a.prob;
    });
  }, [frame?.topk, sortField, sortOrder]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder(field === "token" ? "asc" : "desc");
    }
  }

  if (!frame?.topk?.length) {
    return (
      <div role="status" aria-live="polite" className="workspace-empty">
        <p>
          No token probabilities recorded for this step. Open the trace gallery or
          generate a token to inspect next-token distributions.
        </p>
      </div>
    );
  }

  const tokenSortAria =
    sortField === "token"
      ? sortOrder === "asc"
        ? "ascending"
        : "descending"
      : "none";

  const probSortAria =
    sortField === "prob"
      ? sortOrder === "asc"
        ? "ascending"
        : "descending"
      : "none";

  return (
    <div className="token-probability-panel">
      <table aria-label="Captured next-token probabilities (top-k subset)">
        <caption>
          Captured next-token probabilities (top-k subset) — Sorted by{" "}
          {sortField === "token" ? "Token text" : "Probability"} (
          {sortOrder === "asc" ? "ascending" : "descending"})
        </caption>
        <thead>
          <tr>
            <th scope="col" aria-sort={tokenSortAria}>
              <button
                type="button"
                onClick={() => handleSort("token")}
                aria-label={`Sort by token text, currently ${tokenSortAria === "none" ? "unsorted" : tokenSortAria}`}
              >
                Token {sortField === "token" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
              </button>
            </th>
            <th scope="col" aria-sort={probSortAria}>
              <button
                type="button"
                onClick={() => handleSort("prob")}
                aria-label={`Sort by probability, currently ${probSortAria === "none" ? "unsorted" : probSortAria}`}
              >
                Probability {sortField === "prob" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTopk.map((token) => (
            <tr key={token.id}>
              <td>{JSON.stringify(token.text)}</td>
              <td>{(token.prob * 100).toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

