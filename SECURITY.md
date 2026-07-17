# Security Policy

LLMStudio is a **local developer / research tool**. It runs a small language
model behind a local FastAPI server and renders its internals in the browser. It
is not designed to be exposed to the public internet.

## Supported versions

This project is pre-1.0 and moves fast. Security fixes are applied to the
`main` branch. Please run against a recent `main`.

| Version | Supported |
| ------- | --------- |
| `main`  | ✅        |
| tagged releases | best effort |

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Instead, report privately via GitHub's
[**Report a vulnerability**](https://github.com/Sudharsanselvaraj/LLM-Inspector-Studio/security/advisories/new)
(Security → Advisories → *Report a vulnerability*).

Please include:

- A description of the issue and its impact.
- Steps to reproduce (a minimal `.gguf` file or request payload if relevant).
- The component involved (GGUF parser, backend endpoint, WebSocket, etc.).

**Response targets:** acknowledgement within ~72 hours; a fix or mitigation plan
within ~14 days for confirmed issues. We'll credit reporters who wish to be
credited once a fix is released.

## Scope & threat model

Things that are **in scope**:

- **The client-side GGUF parser** (`frontend/lib/gguf/`). It reads untrusted,
  user-supplied files. It only reads a bounded prefix of the file (the header,
  metadata and tensor-info table) and never executes anything from the file, but
  parser bugs (out-of-bounds reads, unbounded allocation, denial of service on a
  malformed file) are valid reports.
- **Backend endpoints** (`/analyze`, `/architecture`, `/ws/generate`) —
  injection, resource-exhaustion (e.g. oversized prompts), or crashes.
- **Dependency vulnerabilities** with a demonstrated impact on this project.

Things that are **out of scope / by design**:

- Running the backend on a public or untrusted network. CORS is restricted to
  `localhost:3000` and the server is meant for local use; exposing it publicly is
  the operator's responsibility.
- The model's generated text. LLMStudio visualizes real model internals; model
  outputs are the model's, not a vulnerability in this tool.
- Resource use inherent to loading a model or rendering millions of points.

## Hardening notes for operators

- Keep the backend bound to `localhost`; do not expose port 8000 publicly.
- Only load `.gguf` files you trust. The parser is defensive, but treat model
  files like any other untrusted input.
- Keep dependencies current (`pip`, `npm audit`).
