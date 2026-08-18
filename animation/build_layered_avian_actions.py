#!/usr/bin/env python3
"""Bake body-locked pigeon or swallow approach/perch/launch tracks."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from build_layered_crow_actions import ACTION_FRAME_COUNT, bottom_toe, destination_pivot_for_target, sample_key, source_to_world, top_root
from build_layered_motion import CANVAS, INK, affine_place, component_boxes, extract_blue_ink, padded_crop, place_articulated_wing, root_pivot


CONFIG = {
    "pigeon": {"row": 0, "body_pivot": (0.485, 0.47), "body_scale": 0.66, "near": 0.67, "far": 0.61, "leg": 0.22, "hip_offset": (44, -70), "tail": 0.31},
    "swallow": {"row": 1, "body_pivot": (0.555, 0.48), "body_scale": 0.67, "near": 0.62, "far": 0.56, "leg": 0.145, "hip_offset": (38, -58), "tail": 0.34},
}


def parameters(track: str, index: int, leg_base: float, frame_count: int = ACTION_FRAME_COUNT) -> dict[str, float]:
    approach_wing = [-170, -145, -112, -88, -105, -128, -150, -164]
    approach_span = [1.0, 0.94, 0.84, 0.80, 0.70, 0.56, 0.39, 0.29]
    perch_wing = [-164, -168, -170, -170, -170, -170, -170, -92]
    perch_span = [0.29, 0.27, 0.25, 0.25, 0.25, 0.25, 0.25, 0.64]
    launch_wing = [-92, -72, -108, -154, -210, -245, -214, -170]
    launch_span = [0.64, 0.72, 0.84, 0.94, 0.98, 0.97, 0.97, 1.0]
    key_position = index * 7 / max(1, frame_count - 1)
    progress = key_position / 7
    if track == "approach":
        return {"body_angle": -2 - 9 * progress, "toe_y": 750 - 50 * (1 - min(1, progress / 0.72)), "wing": sample_key(approach_wing, key_position), "span": sample_key(approach_span, key_position), "leg": leg_base * (0.55 + 0.45 * progress), "key_position": key_position}
    if track == "perch":
        quiet = sample_key([0, 1, 2, 0.5, 0, -0.4, 0.3, -3], key_position)
        return {"body_angle": -11 + quiet, "toe_y": 750, "wing": sample_key(perch_wing, key_position), "span": sample_key(perch_span, key_position), "leg": leg_base if key_position < 7 else leg_base * 0.93, "key_position": key_position}
    release = max(0, (progress - 0.12) / 0.88)
    return {"body_angle": -14 + 12 * release, "toe_y": 750 - 145 * release, "wing": sample_key(launch_wing, key_position), "span": sample_key(launch_span, key_position), "leg": leg_base * (0.93 - 0.70 * release), "key_position": key_position}


def build(species: str, flight_parts: Path, atlas_path: Path, output: Path) -> None:
    config = CONFIG[species]
    body = Image.open(flight_parts / "body.png").convert("RGBA")
    near_wing = Image.open(flight_parts / "near-wing.png").convert("RGBA")
    far_wing = Image.open(flight_parts / "far-wing.png").convert("RGBA")
    atlas = Image.open(atlas_path)
    half = atlas.height // 2
    row = int(config["row"])
    extracted = extract_blue_ink(atlas.crop((0, row * half, atlas.width, (row + 1) * half)))
    boxes = component_boxes(extracted)
    boxes.sort(key=lambda box: box[0])
    if len(boxes) != 3:
        raise RuntimeError(f"expected three detached appendages, found {len(boxes)}")
    near_leg, far_leg, tail = [padded_crop(extracted, box) for box in boxes]
    body_pivot = (body.width * config["body_pivot"][0], body.height * config["body_pivot"][1])
    near_root, far_root = root_pivot(near_wing), root_pivot(far_wing)
    near_leg_root, far_leg_root = top_root(near_leg), top_root(far_leg)
    near_toe, far_toe = bottom_toe(near_leg), bottom_toe(far_leg)
    tail_alpha = np.asarray(tail.getchannel("A"))
    ys, xs = np.nonzero(tail_alpha > 16)
    tail_root = (float(xs.max() - 2), float(np.median(ys[xs >= xs.max() - 12])))
    records_by_track: dict[str, list[dict[str, object]]] = {}

    for track in ("approach", "perch", "launch"):
        track_dir = output / track
        track_dir.mkdir(parents=True, exist_ok=True)
        for stale in track_dir.glob("*.png"):
            stale.unlink()
        records: list[dict[str, object]] = []
        for index in range(ACTION_FRAME_COUNT):
            pose = parameters(track, index, float(config["leg"]))
            far_leg_target = destination_pivot_for_target(far_leg_root, far_toe, (774, pose["toe_y"]), 3, pose["leg"] * 0.94)
            near_leg_target = destination_pivot_for_target(near_leg_root, near_toe, (828, pose["toe_y"]), -2, pose["leg"])
            hip = ((far_leg_target[0] + near_leg_target[0]) / 2, (far_leg_target[1] + near_leg_target[1]) / 2)
            shoulder = (hip[0] + config["hip_offset"][0], hip[1] + config["hip_offset"][1])
            canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
            affine_place(far_leg, canvas, far_leg_root, far_leg_target, 3, pose["leg"] * 0.94, pose["leg"] * 0.94, 0.74)
            tail_target = source_to_world((body.width * 0.25, body.height * 0.58), body_pivot, shoulder, pose["body_angle"], config["body_scale"])
            # The swallow's locked body already includes its full forked tail;
            # overlaying a second generated fork creates false extra streamers.
            if track == "approach" and pose["key_position"] <= 5 and species != "swallow":
                affine_place(tail, canvas, tail_root, tail_target, pose["body_angle"], config["tail"], config["tail"], 0.9)
            place_articulated_wing(far_wing, canvas, far_root, (shoulder[0] - 4, shoulder[1] + 3), pose["wing"] + 3, config["far"] * pose["span"], config["far"] * 0.96 * pose["span"], 0, 0.70)
            affine_place(body, canvas, body_pivot, shoulder, pose["body_angle"], config["body_scale"], config["body_scale"])
            affine_place(near_leg, canvas, near_leg_root, near_leg_target, -2, pose["leg"], pose["leg"])
            place_articulated_wing(near_wing, canvas, near_root, shoulder, pose["wing"], config["near"] * pose["span"], config["near"] * 0.96 * pose["span"], 0, 1.0)
            rgba = np.asarray(canvas).copy()
            rgba[..., :3] = np.array(INK, dtype=np.uint8)
            rgba[rgba[..., 3] == 0, :3] = 0
            frame = Image.fromarray(rgba, "RGBA")
            path = track_dir / f"{index + 1:02d}_{species}_rig_{track}.png"
            frame.save(path)
            records.append({
                "file": f"{track}/{path.name}", "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "body_landmark_px": [round(shoulder[0], 4), round(shoulder[1], 4)],
                "body_scale_px": round(body.width * config["body_scale"], 4),
                "contact_landmark_px": [801, round(pose["toe_y"], 4)],
            })
        records_by_track[track] = records
    metadata = {"schema_version": "2.0", "authored": True, "visible_rgb": list(INK), "minimum_clear_border_px": 64, "species": species, "tracks": records_by_track}
    (output / "authored-actions-v2.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    rows_per_track = math.ceil(ACTION_FRAME_COUNT / 4)
    sheet = Image.new("RGB", (1600, rows_per_track * 300 * 3), (244, 240, 230))
    draw = ImageDraw.Draw(sheet)
    for row_index, track in enumerate(("approach", "perch", "launch")):
        for column, path in enumerate(sorted((output / track).glob("*.png"))):
            image = Image.open(path)
            image.thumbnail((360, 270), Image.Resampling.LANCZOS)
            sheet_row = row_index * rows_per_track + column // 4
            x, y = column % 4 * 400 + (400 - image.width) // 2, sheet_row * 300 + (270 - image.height) // 2
            sheet.paste(image, (x, y), image)
            draw.text((column % 4 * 400 + 12, sheet_row * 300 + 278), path.stem, fill=(25, 31, 40))
    sheet.save(output / f"{species}-actions-v2-contact-sheet.jpg", quality=92)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--species", choices=tuple(CONFIG), required=True)
    parser.add_argument("--flight-parts", type=Path, required=True)
    parser.add_argument("--appendage-atlas", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    build(args.species, args.flight_parts, args.appendage_atlas, args.output)


if __name__ == "__main__":
    main()
