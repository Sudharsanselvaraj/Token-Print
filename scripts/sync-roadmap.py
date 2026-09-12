#!/usr/bin/env python3
"""Sync docs/roadmap.spec.yml into GitHub issues (idempotent).

For every item in the manifest it:
  1. searches for an existing issue (open OR closed) with the same title and,
     if found, records it in the tracker without creating a duplicate;
  2. otherwise creates the issue with the configured labels + milestone;

  3. finally it creates/updates a "Roadmap → Issues sync" tracker issue listing
     the mapping so the manifest stays traceable.

Designed to run both locally (`gh` CLI authenticated) and in CI
(`.github/workflows/roadmap-sync.yml`). Safe to run repeatedly.

Usage:
  python scripts/sync-roadmap.py [--repo owner/repo] [--manifest PATH]
                                 [--tracker-title TITLE] [--dry-run] [--strict]
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.stderr.write("pyyaml is required: pip install pyyaml\n")
    raise

DEFAULT_REPO = "Sudharsanselvaraj/Token-Print"
DEFAULT_MANIFEST = Path(__file__).resolve().parent.parent / "docs" / "roadmap.spec.yml"
DEFAULT_TRACKER_TITLE = "🗺️ Roadmap → Issues sync"


class Gh:
    """Thin wrapper around the `gh` CLI (works locally and in Actions)."""

    def __init__(self, repo: str):
        self.repo = repo

    def _run(self, args: list[str], check: bool = True):
        return subprocess.run(["gh", "api", *args], check=False, capture_output=True, text=True)

    def get(self, path: str, params: dict | None = None):
        cmd = ["--method", "GET", path]
        for key, value in (params or {}).items():
            cmd += ["-f", f"{key}={value}"]
        proc = self._run(cmd)
        if proc.returncode != 0:
            raise RuntimeError(f"GET {path} failed: {proc.stderr.strip()}")
        return json.loads(proc.stdout)

    def post(self, path: str, payload: dict):
        proc = subprocess.run(
            ["gh", "api", "--method", "POST", path, "--input", "-"],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"POST {path} failed: {proc.stderr.strip()}")
        return json.loads(proc.stdout)

    def patch(self, path: str, payload: dict):
        proc = subprocess.run(
            ["gh", "api", "--method", "PATCH", path, "--input", "-"],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"PATCH {path} failed: {proc.stderr.strip()}")
        return json.loads(proc.stdout)

    @property
    def base(self) -> str:
        return f"repos/{self.repo}"


def find_issue_by_title(gh: Gh, title: str) -> dict | None:
    """Return a matching issue (any state) or None via GitHub search API."""
    data = gh.get(
        "search/issues",
        {"q": f'"{title}" repo:{gh.repo} in:title', "per_page": "1"},
    )
    for item in data.get("items", []):
        # The API returns items for both issues and PRs; PRs carry pull_request.
        if item.get("pull_request"):
            continue
        if item["title"].strip().lower() == title.strip().lower():
            return item
    return None


def get_labels(gh: Gh) -> set[str]:
    data = gh.get(f"{gh.base}/labels", {"per_page": "100"})
    return {label["name"] for label in data}


def get_milestones(gh: Gh) -> dict[str, dict]:
    data = gh.get(f"{gh.base}/milestones", {"state": "all", "per_page": "100"})
    return {m["title"]: m for m in data}


def ensure_milestone(gh: Gh, title: str) -> int | None:
    existing = get_milestones(gh).get(title)
    if existing:
        return existing["number"]
    if not args.dry_run:
        created = gh.post(f"{gh.base}/milestones", {"title": title})
        print(f"  milestone created: {title}")
        return created["number"]
    print(f"  [dry-run] milestone would be created: {title}")
    return None


def create_issue(gh: Gh, item: dict, labels_available: set[str], dry_run: bool) -> dict:
    body = item.get("body", "").strip()
    source = item.get("source", "")
    roadmap = item.get("roadmap_text", "").strip()
    if roadmap:
        body = f"{body}\n\n---\n\n> **Source**: {source}\n>\n> ```\n> {roadmap}\n> ```\n"
    else:
        body = f"{body}\n\n---\n\n> **Source**: {source}\n"

    labels = [label for label in item.get("labels", []) if label in labels_available]
    payload: dict = {
        "title": item["title"],
        "body": body,
        "labels": labels,
    }
    milestone = item.get("milestone")
    if milestone:
        number = ensure_milestone(gh, milestone)
        payload["milestone"] = number

    if dry_run:
        print(f"  [dry-run] would create issue: {item['title']}  labels={labels} milestone={milestone}")
        return {"number": None, "html_url": None, "dry_run": True}
    created = gh.post(f"{gh.base}/issues", payload)
    print(f"  created issue #{created['number']}: {item['title']}")
    return created


def build_tracker_body(rows: list[dict], dry_run: bool) -> str:
    lines = [
        "## Roadmap → Issues sync",
        "",
        f"_Auto-maintained by `scripts/sync-roadmap.py` "
        f"({time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime())})_"
        if not dry_run
        else "_dry-run preview_",
        "",
        "| ID | Item | Status | Issue |",
        "|----|------|--------|-------|",
    ]
    for row in rows:
        lines.append(
            f"| {row['id']} | {row['title']} | {row['status']} | {row['url'] or '—'} |"
        )
    return "\n".join(lines)


def upsert_tracker(gh: Gh, body: str, dry_run: bool) -> None:
    existing = find_issue_by_title(gh, args.tracker_title)
    if existing:
        if dry_run:
            print(f"  [dry-run] would update tracker #{existing['number']}")
        else:
            gh.patch(f"{gh.base}/issues/{existing['number']}", {"body": body})
            print(f"  updated tracker issue #{existing['number']}")
        return
    if dry_run:
        print("  [dry-run] would create tracker issue")
    else:
        created = gh.post(f"{gh.base}/issues", {"title": args.tracker_title, "body": body})
        print(f"  created tracker issue #{created['number']}")


def main() -> int:
    global args
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=DEFAULT_REPO)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--tracker-title", default=DEFAULT_TRACKER_TITLE)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()

    with args.manifest.open("r", encoding="utf-8") as fh:
        manifest = yaml.safe_load(fh)

    gh = Gh(args.repo)
    labels = get_labels(gh)
    rows: list[dict] = []
    failures = 0

    for item in manifest.get("items", []):
        ident = item.get("id")
        if not ident or not item.get("title"):
            print(f"  [error] item missing id/title: {json.dumps(item)[:80]}")
            failures += 1
            continue

        existing = find_issue_by_title(gh, item["title"])
        if existing:
            state = "closed" if existing.get("state") != "open" else "open"
            rows.append(
                {
                    "id": ident,
                    "title": item["title"],
                    "status": f"exists ({state})",
                    "url": existing["html_url"],
                }
            )
            print(f"  skip {ident}: exists as #{existing['number']} ({state})")
            continue

        try:
            created = create_issue(gh, item, labels, args.dry_run)
        except RuntimeError as exc:
            print(f"  [error] {ident}: {exc}")
            failures += 1
            if args.strict:
                raise
            continue
        rows.append(
            {
                "id": ident,
                "title": item["title"],
                "status": "dry-run-created" if args.dry_run else "created",
                "url": created.get("html_url"),
            }
        )

    tracker_body = build_tracker_body(rows, args.dry_run)
    upsert_tracker(gh, tracker_body, args.dry_run)

    created_count = sum(1 for r in rows if r["status"] in ("created", "dry-run-created"))
    print(f"done: {len(rows)} items seen, {created_count} created, {failures} failures")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())