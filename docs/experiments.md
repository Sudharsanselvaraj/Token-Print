# Portable experiments

Debugger → **Experiments** saves the current generation, imports an experiment, replays captured results, or re-runs and verifies them. Completed activation-patching and ablation runs appear in its recent list automatically; export them before reloading the page. The list is session-only; downloaded JSON files are the durable copy.

Version 1 bundles include exact prompts, model ID and resolved revision, runtime/device, decoding settings (including seed), intervention parameters, results and an optional complete replay trace. A SHA-256 checksum over canonical JSON detects accidental modification. It is an integrity check, not an authenticity signature.

Replay requires no model or backend. Verification runs actual inference and checks the same model revision, token IDs/logits/probabilities or intervention logit-lens results at absolute/relative tolerance `1e-4`. Timing is intentionally excluded. Cross-device or quantized-kernel differences may fail this strict experiment check; inspect the result rather than declaring success. Use the original environment for strict reproduction.

A missing revision, old trace without its exact prompt, unseeded sampling, unavailable backend, or output mismatch produces an explicit error. Restart the backend with `python3 scripts/start.py --model MODEL --revision COMMIT` to match an imported experiment. Files are limited to 32 MB. Importing never runs inference; use **Re-run and verify** explicitly.
