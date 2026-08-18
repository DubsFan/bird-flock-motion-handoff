#!/usr/bin/env python3
"""Independently verify the import-facing Quarter Note — Beat Bop bundle."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


SOURCE_DIR = Path(__file__).resolve().parent
ROOT = SOURCE_DIR.parent
BUNDLE = ROOT / "quarter-note-01"
TRACK_DIRS = {
    "flight": "flight",
    "approach": "01_landing_approach",
    "perch": "02_perch_settle_hold",
    "launch": "03_launch_flyoff",
}


def main() -> None:
    manifest = json.loads((BUNDLE / "manifest.json").read_text())
    if manifest.get("schema_version") != "1.0":
        raise RuntimeError("Unsupported manifest schema")
    sets = manifest.get("sets")
    if not isinstance(sets, list) or len(sets) != 1:
        raise RuntimeError("Manifest must contain exactly one identity")
    identity = sets[0]
    tracks = identity["tracks"]
    canvas = identity["canvases"]["flight"]
    action_canvas = identity["canvases"]["action"]
    if canvas != action_canvas:
        raise RuntimeError("This quarter-note handoff requires one shared canvas and anchor")
    expected_size = (int(canvas["width"]), int(canvas["height"]))
    expected_ink = tuple(bytes.fromhex(identity["ink_color"].lstrip("#")))
    hashes_by_track: dict[str, list[str]] = {}
    alpha_masses: list[float] = []

    for track, directory in TRACK_DIRS.items():
        names = tracks.get(track)
        if not isinstance(names, list) or len(names) != 16:
            raise RuntimeError(f"{track} must list exactly sixteen frames")
        track_hashes: list[str] = []
        for index, name in enumerate(names, 1):
            if not name.startswith(f"{index:02d}_"):
                raise RuntimeError(f"{track} is not numbered chronologically: {name}")
            path = BUNDLE / directory / name
            image = Image.open(path).convert("RGBA")
            if image.size != expected_size:
                raise RuntimeError(f"Unexpected canvas for {path}")
            pixels = np.asarray(image, dtype=np.uint8)
            alpha = pixels[..., 3]
            visible = alpha > 0
            if not visible.any() or int(alpha.min()) != 0 or int(alpha.max()) != 255:
                raise RuntimeError(f"Invalid visible/transparent alpha range for {path}")
            colors = np.unique(pixels[visible, :3], axis=0)
            if colors.shape != (1, 3) or tuple(int(value) for value in colors[0]) != expected_ink:
                raise RuntimeError(f"Frame is not one-color source ink: {path}")
            if not np.all(pixels[~visible, :3] == 0):
                raise RuntimeError(f"Transparent RGB is not zero: {path}")
            bbox = image.getchannel("A").getbbox()
            if bbox is None:
                raise RuntimeError(f"Empty frame: {path}")
            clear = min(bbox[0], bbox[1], image.width - bbox[2], image.height - bbox[3])
            if clear < 80:
                raise RuntimeError(f"Frame has only {clear}px clear border: {path}")
            track_hashes.append(hashlib.sha256(path.read_bytes()).hexdigest())
            alpha_masses.append(float(alpha.sum()))
        if len(set(track_hashes)) != len(track_hashes):
            raise RuntimeError(f"{track} contains repeated frame content")
        hashes_by_track[track] = track_hashes

    if sum(len(hashes) for hashes in hashes_by_track.values()) != 64:
        raise RuntimeError("Expected 64 frame files")
    identity_ratio = max(alpha_masses) / min(alpha_masses)
    if identity_ratio > 1.01:
        raise RuntimeError(f"Rigid identity area drifted by {(identity_ratio - 1) * 100:.3f}%")
    print("PASS: one manifest, four tracks × sixteen ordered PNGs, 64 RGBA frames")
    print(f"PASS: {expected_size[0]} × {expected_size[1]}, straight alpha, one visible color {identity['ink_color']}")
    print(f"PASS: shared anchor ({canvas['anchor']['x']}, {canvas['anchor']['y']}) and at least 80px clear border")
    print(f"PASS: rigid silhouette alpha-area drift below 1% ({(identity_ratio - 1) * 100:.3f}%)")


if __name__ == "__main__":
    main()
