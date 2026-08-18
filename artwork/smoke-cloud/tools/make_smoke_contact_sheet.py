#!/usr/bin/env python3
"""Render smoke candidates over dark, light, and checkerboard QA backgrounds."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


TILE = (520, 320)
LABEL_HEIGHT = 34


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    image = Image.new("RGB", size, "#d7d7d7")
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill="#f1f1f1")
    return image


def background(kind: str, size: tuple[int, int]) -> Image.Image:
    if kind == "dark":
        return Image.new("RGB", size, "#101820")
    if kind == "light":
        return Image.new("RGB", size, "#f4f1ea")
    return checkerboard(size)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args()

    rows = ["dark", "light", "checker"]
    sheet = Image.new("RGB", (TILE[0] * len(args.paths), (TILE[1] + LABEL_HEIGHT) * len(rows)), "white")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for column, path in enumerate(args.paths):
        source = Image.open(path).convert("RGBA")
        source.thumbnail((TILE[0] - 28, TILE[1] - 28), Image.Resampling.LANCZOS)
        for row, kind in enumerate(rows):
            x = column * TILE[0]
            y = row * (TILE[1] + LABEL_HEIGHT)
            tile = background(kind, TILE)
            paste_x = (TILE[0] - source.width) // 2
            paste_y = (TILE[1] - source.height) // 2
            tile.paste(source, (paste_x, paste_y), source)
            sheet.paste(tile, (x, y))
            label = f"{kind}: {path.name}"
            draw.rectangle((x, y + TILE[1], x + TILE[0], y + TILE[1] + LABEL_HEIGHT), fill="#ffffff")
            draw.text((x + 8, y + TILE[1] + 10), label, fill="#111111", font=font)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
