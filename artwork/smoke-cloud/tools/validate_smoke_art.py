#!/usr/bin/env python3
"""Validate transparent neutral-gray smoke source frames for Murmur."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def analyze(path: Path) -> dict[str, object]:
    source = Image.open(path)
    has_alpha = "A" in source.getbands()
    image = source.convert("RGBA")
    width, height = image.size
    pixels = list(image.get_flattened_data())
    alpha = [pixel[3] for pixel in pixels]
    total = len(alpha)

    alpha_min = min(alpha)
    alpha_max = max(alpha)
    transparent = sum(value == 0 for value in alpha)
    partial = sum(0 < value < 255 for value in alpha)
    visible = [(index, pixel) for index, pixel in enumerate(pixels) if pixel[3] >= 8]

    xs = [index % width for index, _ in visible]
    ys = [index // width for index, _ in visible]
    if xs:
        bbox = [min(xs), min(ys), max(xs) + 1, max(ys) + 1]
        padding = {
            "left": bbox[0],
            "top": bbox[1],
            "right": width - bbox[2],
            "bottom": height - bbox[3],
        }
    else:
        bbox = None
        padding = {"left": 0, "top": 0, "right": 0, "bottom": 0}

    border_alpha = []
    border_alpha.extend(alpha[:width])
    border_alpha.extend(alpha[-width:])
    border_alpha.extend(alpha[row * width] for row in range(height))
    border_alpha.extend(alpha[row * width + width - 1] for row in range(height))

    edge_pixels = [
        pixel
        for _, pixel in visible
        if 8 <= pixel[3] <= 160
    ]
    colored_edge = sum(max(pixel[:3]) - min(pixel[:3]) >= 32 for pixel in edge_pixels)
    colored_edge_pct = colored_edge / max(1, len(edge_pixels))

    checks = {
        "rgba": has_alpha,
        "minimum_width_1600": width >= 1600,
        "contains_fully_transparent_pixels": alpha_min == 0,
        "contains_visible_pixels": alpha_max >= 64,
        "contains_soft_partial_alpha": partial / total >= 0.01,
        "transparent_outer_border": max(border_alpha) == 0,
        "minimum_80px_padding": min(padding.values()) >= 80,
        "neutral_soft_edges": colored_edge_pct <= 0.005,
    }

    return {
        "file": str(path),
        "mode": source.mode,
        "width": width,
        "height": height,
        "alpha_min": alpha_min,
        "alpha_max": alpha_max,
        "transparent_pct": round(transparent / total * 100, 3),
        "partial_alpha_pct": round(partial / total * 100, 3),
        "visible_bbox_alpha_gte_8": bbox,
        "padding_alpha_gte_8": padding,
        "colored_soft_edge_pct": round(colored_edge_pct * 100, 4),
        "checks": checks,
        "passed": all(checks.values()),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    reports = [analyze(path) for path in args.paths]
    if args.json:
        rendered = json.dumps(reports, indent=2) + "\n"
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(rendered, encoding="utf-8")
        else:
            print(rendered, end="")
    else:
        for report in reports:
            status = "PASS" if report["passed"] else "FAIL"
            failed = [name for name, passed in report["checks"].items() if not passed]
            suffix = "" if not failed else f" ({', '.join(failed)})"
            print(f"{status} {report['file']}{suffix}")
    return 0 if all(report["passed"] for report in reports) else 1


if __name__ == "__main__":
    raise SystemExit(main())
