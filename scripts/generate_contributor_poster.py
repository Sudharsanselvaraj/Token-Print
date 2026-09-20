#!/usr/bin/env python3
"""Render TokenPrint's human-contributor poster from GitHub's public API."""

from __future__ import annotations

import io
import json
import os
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / ".github" / "assets" / "contributors.png"
REPOSITORY = os.environ.get("GITHUB_REPOSITORY", "Sudharsanselvaraj/Token-Print")
API = f"https://api.github.com/repos/{REPOSITORY}"
SIZE = (1600, 860)


def request(url: str) -> bytes:
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "tokenprint-contributor-poster"}
    if token := os.environ.get("GITHUB_TOKEN"):
        headers["Authorization"] = f"Bearer {token}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as response:
        return response.read()


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    names = (
        ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVuSans-Bold.ttf"]
        if bold
        else ["/System/Library/Fonts/Supplemental/Arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVuSans.ttf"]
    )
    for name in names:
        if Path(name).exists() or "/" not in name:
            try:
                return ImageFont.truetype(name, size)
            except OSError:
                continue
    raise RuntimeError("No TrueType font found for contributor poster generation")


def centered(draw: ImageDraw.ImageDraw, text: str, y: int, typeface: ImageFont.FreeTypeFont, fill: str) -> None:
    box = draw.textbbox((0, 0), text, font=typeface)
    draw.text(((SIZE[0] - (box[2] - box[0])) // 2, y), text, font=typeface, fill=fill)


def avatar(url: str, diameter: int) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(request(f"{url}&s={diameter * 2}"))).convert("RGB")
        image.thumbnail((diameter, diameter), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (diameter, diameter), "#11131a")
        canvas.paste(image, ((diameter - image.width) // 2, (diameter - image.height) // 2))
    except Exception:
        canvas = Image.new("RGB", (diameter, diameter), "#262b3a")
    mask = Image.new("L", (diameter, diameter), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, diameter - 1, diameter - 1), fill=255)
    clipped = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    clipped.paste(canvas, mask=mask)
    return clipped


def main() -> int:
    repo = json.loads(request(API))
    contributors = json.loads(request(f"{API}/contributors?per_page=100"))
    humans = [person for person in contributors if person.get("type") == "User" and not person["login"].endswith("[bot]")]
    if not humans:
        raise RuntimeError("GitHub returned no human contributors")

    image = Image.new("RGB", SIZE, "#07080d")
    draw = ImageDraw.Draw(image)
    for x in range(0, SIZE[0], 80):
        draw.line((x, 0, x, SIZE[1]), fill="#111521", width=1)
    for y in range(0, SIZE[1], 80):
        draw.line((0, y, SIZE[0], y), fill="#111521", width=1)

    centered(draw, "TOKENPRINT COMMUNITY", 70, font(22, bold=True), "#9aa9c8")
    centered(draw, "Thanks for contributing", 112, font(64, bold=True), "#f5f7ff")
    centered(draw, "Every real improvement makes model internals easier to understand.", 192, font(24), "#b0b9ca")

    cards = [("HUMAN CONTRIBUTORS", str(len(humans))), ("GITHUB STARS", f"{repo['stargazers_count']}+")]
    card_width, card_height, gap = 280, 92, 24
    left = (SIZE[0] - (card_width * len(cards) + gap)) // 2
    for index, (label, value) in enumerate(cards):
        x = left + index * (card_width + gap)
        draw.rounded_rectangle((x, 258, x + card_width, 258 + card_height), radius=16, fill="#111521", outline="#2a3345", width=2)
        centered_x = x + card_width // 2
        value_box = draw.textbbox((0, 0), value, font=font(32, bold=True))
        label_box = draw.textbbox((0, 0), label, font=font(14, bold=True))
        draw.text((centered_x - (value_box[2] - value_box[0]) // 2, 270), value, font=font(32, bold=True), fill="#f5f7ff")
        draw.text((centered_x - (label_box[2] - label_box[0]) // 2, 315), label, font=font(14, bold=True), fill="#8fa4c7")

    diameter, spacing = 118, 28
    columns = min(6, len(humans))
    rows = (len(humans) + columns - 1) // columns
    grid_width = columns * diameter + (columns - 1) * spacing
    grid_left = (SIZE[0] - grid_width) // 2
    grid_top = 400
    for index, person in enumerate(humans):
        row, column = divmod(index, columns)
        x = grid_left + column * (diameter + spacing)
        y = grid_top + row * 178
        draw.ellipse((x - 4, y - 4, x + diameter + 3, y + diameter + 3), fill="#95a8d4")
        portrait = avatar(person["avatar_url"], diameter)
        image.paste(portrait, (x, y), portrait)
        name = person["login"]
        if len(name) > 16:
            name = f"{name[:15]}…"
        label = draw.textbbox((0, 0), name, font=font(16, bold=True))
        draw.text((x + diameter // 2 - (label[2] - label[0]) // 2, y + diameter + 16), name, font=font(16, bold=True), fill="#e6eaf4")

    centered(draw, "Built together · github.com/Sudharsanselvaraj/Token-Print", 790, font(16), "#8391ab")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT, optimize=True)
    print(f"Wrote {OUTPUT.relative_to(ROOT)} for {len(humans)} human contributors")
    return 0


if __name__ == "__main__":
    sys.exit(main())
