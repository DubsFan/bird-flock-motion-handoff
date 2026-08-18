#!/usr/bin/env python3
"""Build a directly importable 60-frame Murmur smoke identity bundle."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import zipfile
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image


CANVAS = (2048, 1280)
ANCHOR = {"x": 1024, "y": 640}


@dataclass(frozen=True)
class Key:
    frame: int
    source: str


TRACKS = {
    "flight": [
        Key(0, "01_neutral_anchor.png"),
        Key(3, "02_drift_shear_a.png"),
        Key(6, "03_twirl_forward.png"),
        Key(8, "04_drift_shear_b.png"),
        Key(11, "05_twirl_reverse.png"),
        Key(14, "01_neutral_anchor.png"),
    ],
    "approach": [
        Key(0, "01_neutral_anchor.png"),
        Key(4, "07_gather_half.png"),
        Key(9, "08_gather_compressed.png"),
        Key(12, "09_compressed_microtwirl_review.png"),
        Key(14, "08_gather_compressed.png"),
    ],
    "perch": [
        Key(0, "08_gather_compressed.png"),
        Key(4, "09_compressed_microtwirl_review.png"),
        Key(7, "08_gather_compressed.png"),
        Key(11, "09_compressed_microtwirl_review.png"),
        Key(14, "08_gather_compressed.png"),
    ],
    "launch": [
        Key(0, "08_gather_compressed.png"),
        Key(3, "10_release_half.png"),
        Key(6, "05_twirl_reverse.png"),
        Key(9, "06_spread_bloom.png"),
        Key(11, "11_dissipate_review.png"),
        Key(14, "01_neutral_anchor.png"),
    ],
}


TRACK_DIRS = {
    "flight": "flight",
    "approach": "01_landing_approach",
    "perch": "02_perch_settle_hold",
    "launch": "03_launch_flyoff",
}


FRAME_LABELS = {
    "flight": [
        "neutral_flow", "shear_build_a", "shear_a", "twirl_entry", "twirl_forward_1",
        "twirl_forward_2", "twirl_peak", "shear_cross", "shear_b", "reverse_entry",
        "reverse_turn", "reverse_peak", "neutral_return_1", "neutral_return_2", "neutral_seam",
    ],
    "approach": [
        "neutral_approach", "draw_in_1", "draw_in_2", "draw_in_3", "gather_half",
        "compress_1", "compress_2", "compress_3", "compress_4", "compressed_contact",
        "microtwirl_entry", "microtwirl_hold", "microtwirl_peak", "compressed_return", "compressed_ready",
    ],
    "perch": [
        "compressed_contact", "hold_turn_1", "hold_turn_2", "hold_turn_3", "microtwirl_peak_1",
        "settle_1", "settle_2", "compressed_hold", "hold_turn_4", "hold_turn_5",
        "hold_turn_6", "microtwirl_peak_2", "ready_settle_1", "ready_settle_2", "ready_release",
    ],
    "launch": [
        "compressed_ready", "release_1", "release_2", "release_half", "unfurl_1",
        "unfurl_2", "twirl_release", "bloom_1", "bloom_2", "spread_peak",
        "dissipate_1", "dissipate_peak", "reform_1", "reform_2", "reformed_flow",
    ],
}


def smoothstep(value: float) -> float:
    return value * value * (3.0 - 2.0 * value)


def load_rgba(path: Path) -> np.ndarray:
    image = Image.open(path).convert("RGBA")
    if image.size != CANVAS:
        raise ValueError(f"{path} is {image.size}, expected {CANVAS}")
    return np.asarray(image, dtype=np.float32) / 255.0


def blend_premultiplied(first: np.ndarray, second: np.ndarray, amount: float) -> np.ndarray:
    amount = smoothstep(amount)
    first_alpha = first[..., 3:4]
    second_alpha = second[..., 3:4]
    alpha = first_alpha * (1.0 - amount) + second_alpha * amount
    premultiplied = first[..., :3] * first_alpha * (1.0 - amount) + second[..., :3] * second_alpha * amount
    rgb = np.divide(premultiplied, alpha, out=np.zeros_like(premultiplied), where=alpha > 1e-6)
    rgba = np.concatenate((rgb, alpha), axis=2)
    rgba[rgba[..., 3] < (0.5 / 255.0)] = 0.0
    return np.clip(np.rint(rgba * 255.0), 0, 255).astype(np.uint8)


def render_track(keyframes: list[Key], source_dir: Path) -> list[np.ndarray]:
    loaded = {key.source: load_rgba(source_dir / key.source) for key in keyframes}
    frames: list[np.ndarray] = []
    for frame_index in range(15):
        if frame_index <= keyframes[0].frame:
            frames.append(np.rint(loaded[keyframes[0].source] * 255.0).astype(np.uint8))
            continue
        if frame_index >= keyframes[-1].frame:
            frames.append(np.rint(loaded[keyframes[-1].source] * 255.0).astype(np.uint8))
            continue
        for left, right in zip(keyframes, keyframes[1:]):
            if left.frame <= frame_index <= right.frame:
                if frame_index == left.frame:
                    frames.append(np.rint(loaded[left.source] * 255.0).astype(np.uint8))
                elif frame_index == right.frame:
                    frames.append(np.rint(loaded[right.source] * 255.0).astype(np.uint8))
                else:
                    amount = (frame_index - left.frame) / (right.frame - left.frame)
                    frames.append(blend_premultiplied(loaded[left.source], loaded[right.source], amount))
                break
    if len(frames) != 15:
        raise RuntimeError(f"expected 15 frames, rendered {len(frames)}")
    return frames


def write_bundle(source_dir: Path, output_dir: Path) -> Path:
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True)

    manifest_tracks: dict[str, list[str]] = {}
    for track, keyframes in TRACKS.items():
        track_dir = output_dir / TRACK_DIRS[track]
        track_dir.mkdir()
        rendered = render_track(keyframes, source_dir)
        names = []
        for index, (frame, label) in enumerate(zip(rendered, FRAME_LABELS[track]), start=1):
            name = f"{index:02d}_{label}.png"
            Image.fromarray(frame, "RGBA").save(track_dir / name)
            names.append(name)
        manifest_tracks[track] = names

    manifest = {
        "schema_version": "1.0",
        "sets": [{
            "id": "silver-vortex-smoke-v1",
            "name": "Silver Vortex Smoke",
            "direction": "right",
            "canvases": {
                "flight": {"width": CANVAS[0], "height": CANVAS[1], "anchor": ANCHOR},
                "action": {"width": CANVAS[0], "height": CANVAS[1], "anchor": ANCHOR},
            },
            "up_direction": "canvas_top",
            "orientation_metadata": "stripped",
            "ink_color": "neutral pearl-gray volumetric alpha",
            "tracks": manifest_tracks,
            "source_method": "11 image-generated RGBA key poses with fixed-center, premultiplied-alpha authored in-betweens; direct chronological playback",
        }],
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (output_dir / "README.md").write_text(
        "# Silver Vortex Smoke\n\n"
        "A directly importable 60-frame Murmur identity: 15 flow frames, 15 gather/compress frames, "
        "15 compressed micro-twirl frames, and 15 release/bloom/dissipate/reform frames.\n\n"
        "All PNGs use a 2048×1280 RGBA canvas with anchor `(1024, 640)`. Runtime playback uses the "
        "authored PNGs directly. The `right` direction field satisfies Murmur's directional metadata; "
        "the cloud is approximately bidirectional and may be mirrored by path direction.\n",
        encoding="utf-8",
    )
    hash_lines = []
    for path in sorted(output_dir.rglob("*")):
        if path.is_file() and path.name != "MANIFEST.sha256":
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            hash_lines.append(f"{digest}  {path.relative_to(output_dir).as_posix()}")
    (output_dir / "MANIFEST.sha256").write_text("\n".join(hash_lines) + "\n", encoding="utf-8")
    return output_dir


def write_zip(bundle_dir: Path, zip_path: Path) -> None:
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(bundle_dir.rglob("*")):
            if path.is_file():
                archive.write(path, Path(bundle_dir.name) / path.relative_to(bundle_dir))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("zip_path", type=Path)
    args = parser.parse_args()
    bundle_dir = write_bundle(args.source_dir, args.output_dir)
    write_zip(bundle_dir, args.zip_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
