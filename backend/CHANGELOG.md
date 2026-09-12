# Changelog

## [0.2.0](https://github.com/Sudharsanselvaraj/Token-Print/compare/token-print-backend-v0.1.0...token-print-backend-v0.2.0) (2026-09-12)


### Features

* activate real activation patching between two prompts ([#75](https://github.com/Sudharsanselvaraj/Token-Print/issues/75)) ([36f3d5f](https://github.com/Sudharsanselvaraj/Token-Print/commit/36f3d5f006a56f593761d643525ec8b654cf6ed8))
* **audit:** implement Track A docs & contributor funnel and Track B P0 engineering & provenance system ([ba58030](https://github.com/Sudharsanselvaraj/Token-Print/commit/ba580308594a64ee7f63ddf8635de041a67d28c4))
* **backend:** FastAPI endpoints — /analyze, /architecture, WS generation ([dcf0cea](https://github.com/Sudharsanselvaraj/Token-Print/commit/dcf0ceaa72ab1f2b4275c132b25e35c4e8745160))
* **backend:** real Qwen model engine (attention, hidden states, generation) ([9ee7ab4](https://github.com/Sudharsanselvaraj/Token-Print/commit/9ee7ab4b2283ffb01a6967678b43b0d8cd576498))
* **debugger:** real per-layer timing readout in HUD ([#18](https://github.com/Sudharsanselvaraj/Token-Print/issues/18)) ([a2beafd](https://github.com/Sudharsanselvaraj/Token-Print/commit/a2beafd310ef027db1e8cabcbfa37605440489e9))
* **decoding:** speculative, sliding-window, and long-context needle modes ([#86](https://github.com/Sudharsanselvaraj/Token-Print/issues/86)) ([fd5cb05](https://github.com/Sudharsanselvaraj/Token-Print/commit/fd5cb05be0ae4a7dec29fceb0f57474c0c1e408b))
* **inference:** stream real KV-cache phase (prefill vs decode) per token ([7ce98fb](https://github.com/Sudharsanselvaraj/Token-Print/commit/7ce98fb455ab90fc59c3464685bf4e1d6b826caa))
* MoE routing visualization with real router capture ([#83](https://github.com/Sudharsanselvaraj/Token-Print/issues/83)) ([cc57a91](https://github.com/Sudharsanselvaraj/Token-Print/commit/cc57a91c663824cd349728e39ece8522cadc2367))
* **rag:** causal activation patching interventions for retrieved context ([20d27f5](https://github.com/Sudharsanselvaraj/Token-Print/commit/20d27f551528c3e1b90abdaec2bd88f4a4455899)), closes [#115](https://github.com/Sudharsanselvaraj/Token-Print/issues/115)
* real quantized GGUF execution via llama.cpp ([#85](https://github.com/Sudharsanselvaraj/Token-Print/issues/85)) ([6f3b7e7](https://github.com/Sudharsanselvaraj/Token-Print/commit/6f3b7e759ee8022c2c9ef1d66b5f7cc1b8d2d558))
* v2 visualization engine, inference backends, and test suite ([046e43c](https://github.com/Sudharsanselvaraj/Token-Print/commit/046e43c04169cdfb3f1824078d7c1a0054b50eda))
* vision-transformer and embedding-model modes ([#87](https://github.com/Sudharsanselvaraj/Token-Print/issues/87)) ([92e9c41](https://github.com/Sudharsanselvaraj/Token-Print/commit/92e9c4145f2bcbe680a6f738667df87f663d1931))


### Bug Fixes

* **backend:** correct logit_lens schema nesting for /analyze ([#92](https://github.com/Sudharsanselvaraj/Token-Print/issues/92)) ([698bb52](https://github.com/Sudharsanselvaraj/Token-Print/commit/698bb522a37226a0b35ecf120a27de33ce95051e))
* **backend:** enforce GGUF upload size limit and cleanup (ENG-09) ([8143199](https://github.com/Sudharsanselvaraj/Token-Print/commit/8143199fde0ca47817fee4cf22c885d96ac5af22))
* **ci:** handle read-only permissions on fork PRs and resolve ruff lints ([e1aa7e7](https://github.com/Sudharsanselvaraj/Token-Print/commit/e1aa7e77a0794aec6ee61404ae6ae27876d0ba5d))
* **ci:** repair branch protection checks, pin ruff, auto-update contributors ([b7e8a0c](https://github.com/Sudharsanselvaraj/Token-Print/commit/b7e8a0c57f0b337e963aa1f54e2453ed9230de9c))
* **ci:** repair branch protection checks, pin ruff, auto-update contributors ([b7e8a0c](https://github.com/Sudharsanselvaraj/Token-Print/commit/b7e8a0c57f0b337e963aa1f54e2453ed9230de9c))
* **ci:** repair required checks, pin ruff, lint backend tests, gate dependabot ([91349ab](https://github.com/Sudharsanselvaraj/Token-Print/commit/91349ab14e5e6eb7b9eacb898df510bb064b8d93))
* **lint:** remove shebang from activation_patch_rag.py to satisfy Ruff EXE001 ([0f6eff6](https://github.com/Sudharsanselvaraj/Token-Print/commit/0f6eff6c08c885a2cf7b69b84a40c778b967e871))
* resolve frontend type-check build failures and sync CI Node version ([86d9771](https://github.com/Sudharsanselvaraj/Token-Print/commit/86d9771cc551216e4458ca3b04d8d4c176b40e90))
* satisfy backend lint on v2 HF endpoints ([37c0f2c](https://github.com/Sudharsanselvaraj/Token-Print/commit/37c0f2cc0cbce93ef828c36ca4669b726d274430))
* **security:** add SSRF protection for remote image loading (ENG-10) ([000817c](https://github.com/Sudharsanselvaraj/Token-Print/commit/000817c18a377d354049b80e7cc51d418e2b9e8e))
* **security:** resolve all CodeQL alerts (taint tracking, ineffectual await, unused T) ([4f78a60](https://github.com/Sudharsanselvaraj/Token-Print/commit/4f78a60a42a0352f3a7f965e6c8e337e963d820d))
* **security:** resolve all open CodeQL alerts (path injection, empty except, unused vars) ([d6d2cad](https://github.com/Sudharsanselvaraj/Token-Print/commit/d6d2cad68d0ad9d3c82e7988f7d213197dbc83fe))
* **security:** resolve CodeQL security alerts (path traversal, log injection, unused imports/variables) ([073c3a8](https://github.com/Sudharsanselvaraj/Token-Print/commit/073c3a80c4a4c2932a0b3b35bcacd1a9af0bf15f))
* **security:** resolve final CodeQL alerts (valid_map lookup, await worker_task) ([7e67ecf](https://github.com/Sudharsanselvaraj/Token-Print/commit/7e67ecfbf9d3bd0931b9e76d7589313f5e853af9))
* **security:** resolve ineffectual await alert via asyncio.gather ([d80ae3d](https://github.com/Sudharsanselvaraj/Token-Print/commit/d80ae3de1febbeb23aada9c7abf0dd56e7754bfa))
* **security:** restrict remote Hugging Face model lookup & add LRU cache (ENG-11) ([57a9dd8](https://github.com/Sudharsanselvaraj/Token-Print/commit/57a9dd8ce49fe18c009feb8d485857d1ad773676))
* visual regression workflow infra + /analyze crash; make suite non-blocking ([ac7662b](https://github.com/Sudharsanselvaraj/Token-Print/commit/ac7662bec50a218ca930d9dd2ac9528973bedec5))


### Documentation

* **gguf:** update GGUF setup and add requirements-gguf.txt (DOC-04) ([d84a46b](https://github.com/Sudharsanselvaraj/Token-Print/commit/d84a46b3755eda4bdfaf1b39ac4a9afdd2c5b016))
