#!/usr/bin/env python3
"""Update README contributors grid from GitHub contributors API."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

START_MARKER = "<!-- CONTRIBUTORS_GRID:START -->"
END_MARKER = "<!-- CONTRIBUTORS_GRID:END -->"
DEFAULT_EXCLUDED = {
    "github-actions[bot]",
    "dependabot[bot]",
    "copilot-swe-agent[bot]",
    "copilot[bot]",
    "renovate[bot]",
}


def _request_json(url: str, token: str | None) -> list[dict[str, Any]]:
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "tokenprint-contributors-updater",
            **({"Authorization": f"token {token}"} if token else {}),
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_contributors(repo: str, token: str | None) -> list[dict[str, Any]]:
    page = 1
    contributors: list[dict[str, Any]] = []
    while True:
        params = urllib.parse.urlencode({"per_page": 100, "page": page, "anon": "false"})
        url = f"https://api.github.com/repos/{repo}/contributors?{params}"
        batch = _request_json(url, token)
        if not batch:
            break
        contributors.extend(batch)
        page += 1
    return contributors


def parse_excluded(extra: str) -> set[str]:
    parsed = {item.strip().lower() for item in extra.split(",") if item.strip()}
    return DEFAULT_EXCLUDED | parsed


def should_include(user: dict[str, Any], excluded: set[str]) -> bool:
    login = str(user.get("login", "")).strip()
    if not login:
        return False
    if str(user.get("type", "")).lower() != "user":
        return False
    lower_login = login.lower()
    if lower_login.endswith("[bot]"):
        return False
    if lower_login in excluded:
        return False
    return True


def render_grid(contributors: list[dict[str, Any]]) -> str:
    if not contributors:
        return '<p align="left"><sub>No human contributors yet.</sub></p>'

    lines = ['<p align="left">']
    for contributor in contributors:
        login = contributor["login"]
        lines.extend(
            [
                f'  <a href="https://github.com/{login}" title="{login}">',
                f'    <img src="https://github.com/{login}.png?size=80" width="40" height="40" alt="{login}" />',
                "  </a>",
            ]
        )
    lines.append("</p>")
    return "\n".join(lines)


def update_readme(readme_path: str, grid: str) -> bool:
    with open(readme_path, encoding="utf-8") as file:
        content = file.read()

    start = content.find(START_MARKER)
    end = content.find(END_MARKER)
    if start == -1 or end == -1 or end < start:
        raise ValueError("Contributors markers not found in README.md")

    start_after = start + len(START_MARKER)
    replacement = f"{START_MARKER}\n{grid}\n{END_MARKER}"
    updated = content[:start] + replacement + content[end + len(END_MARKER) :]
    if updated == content:
        return False

    with open(readme_path, "w", encoding="utf-8") as file:
        file.write(updated)
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Update README contributors grid")
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", ""))
    parser.add_argument("--readme", default="README.md")
    parser.add_argument("--excluded", default=os.environ.get("EXCLUDED_CONTRIBUTORS", ""))
    args = parser.parse_args()

    if not args.repo:
        print("error: --repo or GITHUB_REPOSITORY is required", file=sys.stderr)
        return 1

    try:
        excluded = parse_excluded(args.excluded)
        token = os.environ.get("GITHUB_TOKEN")
        raw = fetch_contributors(args.repo, token)
        filtered: list[dict[str, Any]] = []
        seen: set[str] = set()
        for user in raw:
            if not should_include(user, excluded):
                continue
            login = user["login"]
            if login.lower() in seen:
                continue
            filtered.append({"login": login})
            seen.add(login.lower())
        changed = update_readme(args.readme, render_grid(filtered))
        if changed:
            print("Updated contributors grid in README.md")
        else:
            print("Contributors grid already up to date")
        return 0
    except (ValueError, urllib.error.URLError, urllib.error.HTTPError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
