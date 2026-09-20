# Your first TokenPrint change

Use Python 3.11/3.12 and Node 20.9+. Run `python3 scripts/start.py` from the repository root, or reopen the repository in its development container. The container installs dependencies without downloading weights; launch the model only when needed. For frontend-only work, run `npm ci && npm run dev` in `frontend/`, then choose **Try a recorded demo**.

## Add a visualization panel

1. Copy `examples/contributors/TokenProbabilityPanel.tsx` to `frontend/components/ui/TokenProbabilityPanel.tsx`. It reads actual recorded top-k probabilities, preserves their original normalization, and provides an empty state.
2. Add `{ id: "token_probability", label: "Token probabilities", purpose: "Inspect captured next-token probabilities." }` to the ANALYSIS tools in `frontend/lib/debuggerTools.ts`.
3. Import the component in `frontend/components/ui/DebuggerPane.tsx` and add `token_probability: <TokenProbabilityPanel />` to `views`.
4. Open the recorded demo, then Debugger → Token probabilities. Confirm values match `frontend/public/demo/hello-world.json`, that empty state works before loading, and that navigating away unmounts the panel.
5. Run `npm run test:unit` and `npm run build` in `frontend/`.

Keep inference outside React components. Declare missing measurements rather than deriving fake attention, timing, or causal evidence from unrelated values. Shared scene labels use `SceneHtml`; passive labels are collision-filtered and remain below dialogs.

## Add a model capability adapter

Run the small example:

```sh
PYTHONPATH=backend backend/.venv/bin/python examples/contributors/model_adapter.py
```

Copy its class to `backend/app/inference/adapters/<family>.py`, give it an exact `model_type` match, and add an instance to `SPECIFIC_ADAPTERS` in that directory's `__init__.py`. Register before the generic fallback. Add positive and negative config fixtures to `backend/tests/test_capabilities.py`.

A capability adapter describes support; it does **not** implement a new inference architecture. Before enabling a capability, implement and verify the corresponding runtime module layout in the engine/instrumentation adapters. Test against a real small checkpoint: compare attention to an independent forward pass, check layer/head shapes, ensure hooks are removed after errors, and demonstrate that an intervention changes the measured output. Keep unverified capabilities disabled with a reason, as the example does.

## Checks and a useful PR

`npm run test:unit` covers pure logic; `npm run test:store` covers streaming state. `backend/.venv/bin/python -m pytest backend/tests` runs backend tests (install pytest first). The browser tests require a frontend on port 3000; first-use tests deliberately block the backend. A PR should state the user-visible behavior, data source, and actual checks run. See [beginner tasks](../GOOD_FIRST_ISSUES.md) for current starting points.
