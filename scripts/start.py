#!/usr/bin/env python3
"""Supported local launcher: python3 scripts/start.py. Python 3.11/3.12, Node 20.9+."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import venv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "launcher"


def run(command, cwd=ROOT, env=None):
    print("+ " + " ".join(map(str, command)), flush=True)
    subprocess.run(list(map(str, command)), cwd=cwd, env=env, check=True)


def available(port):
    with socket.socket() as sock:
        try:
            sock.bind(("127.0.0.1", port))
        except OSError as exc:
            raise RuntimeError(
                f"Port {port} is already in use. Stop that service or choose another --backend-port/--frontend-port."
            ) from exc


def wait_ready(url, child, timeout=300):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if child.poll() is not None:
            raise RuntimeError(
                f"Service exited ({child.returncode}). Read its error above. Check model access, disk space and available RAM."
            )
        try:
            with urllib.request.urlopen(url, timeout=3) as response:
                if response.status == 200:
                    if url.endswith("/health") and not json.load(response).get(
                        "model_loaded"
                    ):
                        raise urllib.error.URLError("model still loading")
                    return
        except (urllib.error.URLError, TimeoutError):
            time.sleep(1)
    raise RuntimeError(
        f"Timed out waiting for {url}. Inspect the startup output; verify the model fits in memory and the port is reachable."
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--install-only", action="store_true")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check prerequisites without installing or starting services",
    )
    parser.add_argument(
        "--smoke",
        action="store_true",
        help="Start both services, check a real generation and replay asset, then exit",
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Reinstall dependencies even when lockfile stamps match",
    )
    parser.add_argument("--venv", type=Path, default=ROOT / "backend" / ".venv")
    parser.add_argument(
        "--model", default=os.getenv("TOKENPRINT_MODEL", "Qwen/Qwen2.5-0.5B-Instruct")
    )
    parser.add_argument("--revision", default=os.getenv("TOKENPRINT_REVISION", "main"))
    parser.add_argument("--backend-port", type=int, default=8000)
    parser.add_argument("--frontend-port", type=int, default=3000)
    args = parser.parse_args()
    if not (3, 11) <= sys.version_info[:2] <= (3, 12):
        raise RuntimeError("Use Python 3.11 or 3.12: python3.11 scripts/start.py")
    node, npm = shutil.which("node"), shutil.which("npm")
    if not node or not npm:
        raise RuntimeError(
            "Install Node.js 20.9 or newer (including npm), then run this command again."
        )
    version = subprocess.check_output([node, "--version"], text=True).strip()
    if tuple(map(int, version.lstrip("v").split(".")[:2])) < (20, 9):
        raise RuntimeError(f"Node {version} is too old. Install Node 20.9 or newer.")
    print(
        f"Python {sys.version.split()[0]} · Node {version} · workspace {ROOT}",
        flush=True,
    )
    if args.check:
        available(args.backend_port)
        available(args.frontend_port)
        print("Prerequisites and ports OK. Run without --check to install and start.")
        return
    CACHE.mkdir(parents=True, exist_ok=True)
    py = args.venv.resolve() / (
        "Scripts/python.exe" if os.name == "nt" else "bin/python"
    )
    if not py.exists():
        print("Creating isolated Python environment…", flush=True)
        venv.create(args.venv, with_pip=True)
    requirements = ROOT / "backend" / "requirements.txt"
    digest = hashlib.sha256(requirements.read_bytes()).hexdigest()
    stamp = args.venv / ".tokenprint-requirements"
    if args.fresh or not stamp.exists() or stamp.read_text() != digest:
        if sys.platform.startswith("linux") and os.getenv("TOKENPRINT_DEVICE") == "cpu":
            run(
                [
                    py,
                    "-m",
                    "pip",
                    "install",
                    "torch==2.11.0",
                    "--index-url",
                    "https://download.pytorch.org/whl/cpu",
                ]
            )
        run([py, "-m", "pip", "install", "-r", requirements])
        stamp.write_text(digest)
    lock = ROOT / "frontend" / "package-lock.json"
    digest = hashlib.sha256(lock.read_bytes()).hexdigest()
    stamp = CACHE / "frontend-dependencies"
    if (
        args.fresh
        or not (ROOT / "frontend/node_modules").exists()
        or not stamp.exists()
        or stamp.read_text() != digest
    ):
        run([npm, "ci"], ROOT / "frontend")
        stamp.write_text(digest)
    if args.install_only:
        print(
            "Dependencies ready. Run python3 scripts/start.py to download the model and start."
        )
        return
    available(args.backend_port)
    available(args.frontend_port)
    env = dict(
        os.environ,
        TOKENPRINT_MODEL=args.model,
        TOKENPRINT_REVISION=args.revision,
        NEXT_PUBLIC_API_URL=f"http://localhost:{args.backend_port}",
        NEXT_DISABLE_BASEPATH="1",
        TOKENPRINT_FRONTEND_PORT=str(args.frontend_port),
    )
    print(
        f"Downloading {args.model}@{args.revision}. Hugging Face shows file progress below; subsequent starts reuse its cache.",
        flush=True,
    )
    run(
        [
            py,
            "-c",
            'import os; from huggingface_hub import snapshot_download; snapshot_download(os.environ["TOKENPRINT_MODEL"], revision=os.environ["TOKENPRINT_REVISION"], allow_patterns=["*.json", "*.safetensors", "*.txt", "*.model"])',
        ],
        env=env,
    )
    children = []
    try:
        backend = subprocess.Popen(
            [
                str(py),
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(args.backend_port),
            ],
            cwd=ROOT / "backend",
            env=env,
            start_new_session=os.name != "nt",
        )
        children.append(backend)
        print("Waiting for backend model readiness…", flush=True)
        wait_ready(f"http://localhost:{args.backend_port}/health", backend)
        frontend = subprocess.Popen(
            [
                npm,
                "run",
                "dev",
                "--",
                "--hostname",
                "127.0.0.1",
                "--port",
                str(args.frontend_port),
            ],
            cwd=ROOT / "frontend",
            env=env,
            start_new_session=os.name != "nt",
        )
        children.append(frontend)
        wait_ready(f"http://localhost:{args.frontend_port}", frontend)
        if args.smoke:
            run(
                [
                    py,
                    ROOT / "scripts" / "smoke-install.py",
                    str(args.backend_port),
                    str(args.frontend_port),
                ],
                env=env,
            )
            print("Fresh-install smoke test passed.", flush=True)
            return
        print(
            f"\nTokenPrint ready: http://localhost:{args.frontend_port}\nPress Ctrl+C to stop both services.",
            flush=True,
        )
        while all(child.poll() is None for child in children):
            time.sleep(1)
        raise RuntimeError(
            "A service stopped unexpectedly. Read its error above and restart the launcher."
        )
    finally:
        for child in reversed(children):
            if child.poll() is None:
                if os.name == "nt":
                    subprocess.run(
                        ["taskkill", "/PID", str(child.pid), "/T", "/F"],
                        check=False,
                        capture_output=True,
                    )
                else:
                    os.killpg(child.pid, signal.SIGTERM)
        for child in children:
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                if os.name != "nt":
                    os.killpg(child.pid, signal.SIGKILL)
                else:
                    child.kill()
                child.wait()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped TokenPrint.")
    except (RuntimeError, subprocess.CalledProcessError, OSError) as error:
        print(
            f"\nSetup failed: {error}\nFix the reported prerequisite or connection problem, then rerun. For gated models, authenticate with Hugging Face first.",
            file=sys.stderr,
        )
        sys.exit(1)
