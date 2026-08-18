#!/usr/bin/env python3
"""Losslessly center RGBA source pixels on Murmur's common smoke canvas."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--width", type=int, default=2048)
    parser.add_argument("--height", type=int, default=1280)
    args = parser.parse_args()

    source = Image.open(args.source).convert("RGBA")
    if source.width > args.width or source.height > args.height:
        raise SystemExit("source does not fit target canvas; cropping and scaling are forbidden")

    x = (args.width - source.width) // 2
    y = (args.height - source.height) // 2
    canvas = Image.new("RGBA", (args.width, args.height), (0, 0, 0, 0))
    canvas.paste(source, (x, y))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
