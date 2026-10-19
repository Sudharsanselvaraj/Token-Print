# Recording the README demo

The README assets are captured from the current TokenPrint workspace with a
live Qwen backend. The recording covers architecture operations and their
inspectors, token generation and KV cache, educational walkthrough chapters,
and debugger tensor capture and attention analysis.

The terminal-style frame is added by the capture page, with the red, yellow,
and green window controls and a `TokenPrint — live demo` title. Chapter captions
sit outside the application. No model responses or tensor values are mocked.

## Reproduce

1. Start the backend and frontend using the [quickstart](../README.md#get-started).
2. Install frontend dependencies, Google Chrome, and FFmpeg.
3. From the repository root, run:

   ```bash
   node tools/record-demo.mjs
   ```

The script uses the frontend's existing Playwright dependency and a disposable
Chrome session. It prepares the walkthrough's real forward pass, then records
the app through its normal controls. Only the Next.js development badge is
hidden. It fails on uncaught browser errors or missing capture frames.

Outputs replace `.github/assets/demo.gif` and `.github/assets/demo.mp4`:

| Asset | Encoding |
| --- | --- |
| GIF | 1280 × 800, 20 fps, looping, optimized 256-color palette |
| MP4 | 1600 × 1000, 30 fps, H.264 CRF 16, fast-start playback |

Both exports use lossless PNG captures and their original timestamps. The GIF
uses Lanczos downsampling and ordered dithering to keep small text and dark
surfaces clear. Its palette is generated from the PNGs, not from the MP4.

Optional environment variables:

| Variable | Default |
| --- | --- |
| `DEMO_URL` | `http://localhost:3000` |
| `CHROME_PATH` | Installed Google Chrome |
| `DEMO_WORK_DIR` | A new temporary directory |
| `DEMO_OUTPUT_DIR` | `.github/assets` |

The work directory retains chapter previews, lossless frames, the FFmpeg frame
list, and `capture.json` for visual review. After recording, inspect all four
chapter previews and play both exports before publishing. Timing, probabilities,
and generation output can vary with the backend and hardware.
