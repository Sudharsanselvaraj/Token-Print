# Beginner contributions

Refreshed 2026-09-20. The previous catalog mixed shipped work with open work; do not use its old DOC/ENG labels as evidence that a feature is missing. Check [open beginner issues](https://github.com/Sudharsanselvaraj/Token-Print/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) and the implementation before starting.

## Open tracked task

- [#293 — Non-Latin tokenization view (Hindi/Tamil/CJK)](https://github.com/Sudharsanselvaraj/Token-Print/issues/293). Start with a small tokenizer fixture and inspect byte/token boundaries. Preserve the original token IDs and text; do not normalize away distinctions the tokenizer produces. Verify Tamil, Hindi, CJK, emoji, and whitespace cases.

## Small follow-up proposals

These are proposed scopes, not claims that GitHub issues have already been filed. Check for overlapping PRs first.

| Task | Starting files | Acceptance |
|---|---|---|
| Keyboard tour navigation | `frontend/components/ui/ReplayGuide.tsx` | All three steps reachable with keyboard, focus remains visible after routing, Escape dismisses help without stopping replay. |
| More recorded examples | `scripts/generate-demo-trace.py`, `frontend/lib/demo.ts` | Capture a real short trace with its architecture and analysis; load it with the backend blocked; include the exact prompt and model revision. |
| Accessible probability table | `examples/contributors/TokenProbabilityPanel.tsx` | Add sortable columns without changing probabilities; screen readers announce headers and sort order; missing data has a useful message. |
| Launcher troubleshooting examples | `docs/local-setup.md`, `scripts/start.py` | Reproduce and document a port conflict, interrupted download, and insufficient disk space on your OS. |

Use the [development container](.devcontainer/devcontainer.json) or the [one-command setup](docs/local-setup.md). Follow the [working panel and adapter examples](docs/contributor-examples.md). Browser inference expansion and new intervention hooks require measured correctness checks and are not beginner issues.
