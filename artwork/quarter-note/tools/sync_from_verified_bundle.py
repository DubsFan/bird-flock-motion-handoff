#!/usr/bin/env python3
"""Refresh the quarter-note authoring review workspace from the verified bundle."""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


TOOLS_DIR = Path(__file__).resolve().parent
ARTWORK_DIR = TOOLS_DIR.parent
REPO = ARTWORK_DIR.parents[1]
DELIVERY = REPO / "deliverables" / "quarter-note-murmur"
BUNDLE = DELIVERY / "quarter-note-01"
MASTER_SOURCE = DELIVERY / "source" / "quarter-note-master.png"
BASELINE = ARTWORK_DIR / "baseline" / "quarter-note-master.png"
NORMALIZED = ARTWORK_DIR / "keyposes" / "normalized"
QA = ARTWORK_DIR / "qa"

KEYPOSES = [
    ("01_neutral_anchor.png", BUNDLE / "flight" / "01_neutral.png"),
    ("02_lift_apex.png", BUNDLE / "flight" / "05_lift_apex.png"),
    ("03_fall_apex.png", BUNDLE / "flight" / "12_fall_apex.png"),
    ("04_contact.png", BUNDLE / "01_landing_approach" / "11_contact.png"),
    ("05_quiet_hold.png", BUNDLE / "02_perch_settle_hold" / "09_quiet_hold.png"),
    ("06_airborne.png", BUNDLE / "03_launch_flyoff" / "10_airborne.png"),
]

CANVAS = (1600, 1200)
ANCHOR = (800, 900)
INK = (13, 142, 235)
TILE = (320, 240)
LABEL = 38


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def analyze(path: Path) -> dict[str, object]:
    source = Image.open(path)
    image = source.convert("RGBA")
    pixels = np.asarray(image, dtype=np.uint8)
    alpha = pixels[..., 3]
    visible = alpha > 0
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise RuntimeError(f"Empty key pose: {path}")
    colors = np.unique(pixels[visible, :3], axis=0)
    padding = {
        "left": bbox[0],
        "top": bbox[1],
        "right": image.width - bbox[2],
        "bottom": image.height - bbox[3],
    }
    edge_alpha = max(
        int(alpha[0, :].max()),
        int(alpha[-1, :].max()),
        int(alpha[:, 0].max()),
        int(alpha[:, -1].max()),
    )
    checks = {
        "rgba": "A" in source.getbands(),
        "canvas_1600x1200": image.size == CANVAS,
        "contains_fully_transparent_pixels": int(alpha.min()) == 0,
        "contains_fully_visible_pixels": int(alpha.max()) == 255,
        "transparent_outer_border": edge_alpha == 0,
        "minimum_80px_padding": min(padding.values()) >= 80,
        "anchor_pixel_visible": int(alpha[ANCHOR[1], ANCHOR[0]]) > 0,
        "one_visible_color": bool(
            colors.shape == (1, 3)
            and tuple(int(value) for value in colors[0]) == INK
        ),
        "transparent_rgb_zero": bool(np.all(pixels[~visible, :3] == 0)),
    }
    return {
        "file": str(path.relative_to(REPO)),
        "sha256": sha256(path),
        "mode": source.mode,
        "width": image.width,
        "height": image.height,
        "alpha_min": int(alpha.min()),
        "alpha_max": int(alpha.max()),
        "visible_bbox": list(bbox),
        "padding": padding,
        "anchor": {"x": ANCHOR[0], "y": ANCHOR[1], "alpha": int(alpha[ANCHOR[1], ANCHOR[0]])},
        "checks": checks,
        "passed": all(checks.values()),
    }


def checkerboard(size: tuple[int, int], cell: int = 20) -> Image.Image:
    image = Image.new("RGB", size, "#d7dce4")
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill="#f3f5f8")
    return image


def plate(kind: str) -> Image.Image:
    if kind == "dark":
        return Image.new("RGB", TILE, "#0f161f")
    if kind == "light":
        return Image.new("RGB", TILE, "#f6f8fc")
    return checkerboard(TILE)


def contact_sheet(paths: list[Path], destination: Path) -> None:
    kinds = ("dark", "light", "checker")
    sheet = Image.new("RGB", (TILE[0] * len(paths), (TILE[1] + LABEL) * len(kinds)), "white")
    draw = ImageDraw.Draw(sheet)
    label_font = ImageFont.load_default()
    for column, path in enumerate(paths):
        source = Image.open(path).convert("RGBA")
        source.thumbnail((TILE[0] - 24, TILE[1] - 24), Image.Resampling.LANCZOS)
        for row, kind in enumerate(kinds):
            x = column * TILE[0]
            y = row * (TILE[1] + LABEL)
            background = plate(kind)
            background.paste(source, ((TILE[0] - source.width) // 2, (TILE[1] - source.height) // 2), source)
            sheet.paste(background, (x, y))
            draw.rectangle((x, y + TILE[1], x + TILE[0], y + TILE[1] + LABEL), fill="#ffffff")
            draw.text((x + 8, y + TILE[1] + 11), f"{kind}: {path.stem}", fill="#111111", font=label_font)
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, optimize=True)


def main() -> None:
    if sha256(MASTER_SOURCE) != "b156a1d8ce6178ac95ea5bef0d7723c77eda69e80cbc0b1d61b6e585e2cb088b":
        raise RuntimeError("Quarter-note master no longer matches the selected reference")
    BASELINE.parent.mkdir(parents=True, exist_ok=True)
    NORMALIZED.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    shutil.copy2(MASTER_SOURCE, BASELINE)

    for stale_keypose in NORMALIZED.glob("*.png"):
        stale_keypose.unlink()

    normalized_paths: list[Path] = []
    for name, source in KEYPOSES:
        destination = NORMALIZED / name
        shutil.copy2(source, destination)
        normalized_paths.append(destination)

    reports = [analyze(path) for path in normalized_paths]
    validation = {
        "schema_version": "1.0",
        "identity": "quarter-note-01",
        "master_sha256": sha256(BASELINE),
        "passed": all(report["passed"] for report in reports),
        "keyposes": reports,
    }
    (QA / "keypose-validation.json").write_text(json.dumps(validation, indent=2) + "\n")
    contact_sheet(normalized_paths, QA / "keypose-background-contact-sheet.png")
    if not validation["passed"]:
        raise RuntimeError(f"Quarter-note key-pose QA failed; inspect {QA / 'keypose-validation.json'}")
    print(f"PASS: synced {len(normalized_paths)} quarter-note review key poses")
    print(f"PASS: exact master SHA-256 {validation['master_sha256']}")
    print("PASS: RGBA, 1600x1200, one-color, fixed-anchor, padding, and transparent-border checks")


if __name__ == "__main__":
    main()
