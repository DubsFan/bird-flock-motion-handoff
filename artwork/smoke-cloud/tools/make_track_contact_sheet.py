#!/usr/bin/env python3
"""Render one chronological 15-frame smoke track as a labeled QA grid."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


TILE = (400, 250)
LABEL_HEIGHT = 30
COLUMNS = 5


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--background", choices=("dark", "light"), default="dark")
    args = parser.parse_args()

    rows = (len(args.paths) + COLUMNS - 1) // COLUMNS
    background = "#101820" if args.background == "dark" else "#f4f1ea"
    foreground = "#f5f7fa" if args.background == "dark" else "#111111"
    sheet = Image.new("RGB", (TILE[0] * COLUMNS, (TILE[1] + LABEL_HEIGHT) * rows), background)
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for index, path in enumerate(args.paths):
        row, column = divmod(index, COLUMNS)
        x = column * TILE[0]
        y = row * (TILE[1] + LABEL_HEIGHT)
        source = Image.open(path).convert("RGBA")
        source.thumbnail((TILE[0] - 24, TILE[1] - 24), Image.Resampling.LANCZOS)
        tile = Image.new("RGB", TILE, background)
        tile.paste(source, ((TILE[0] - source.width) // 2, (TILE[1] - source.height) // 2), source)
        sheet.paste(tile, (x, y))
        draw.text((x + 8, y + TILE[1] + 9), path.name, fill=foreground, font=font)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
