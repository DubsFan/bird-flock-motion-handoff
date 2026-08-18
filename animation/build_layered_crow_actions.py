#!/usr/bin/env python3
"""Bake body-locked crow approach, perch, and launch tracks offline."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from build_layered_motion import (
    CANVAS,
    INK,
    affine_place,
    component_boxes,
    extract_blue_ink,
    padded_crop,
    place_articulated_wing,
    root_pivot,
)


def top_root(part: Image.Image) -> tuple[float, float]:
    alpha = np.asarray(part.getchannel("A"))
    ys, xs = np.nonzero(alpha > 16)
    cutoff = ys.min() + max(12, int((ys.max() - ys.min()) * 0.08))
    return float(np.median(xs[ys <= cutoff])), float(ys.min() + 2)


def bottom_toe(part: Image.Image) -> tuple[float, float]:
    alpha = np.asarray(part.getchannel("A"))
    ys, xs = np.nonzero(alpha > 16)
    cutoff = ys.max() - max(12, int((ys.max() - ys.min()) * 0.08))
    return float(np.median(xs[ys >= cutoff])), float(ys.max() - 2)


def destination_pivot_for_target(
    source_pivot: tuple[float, float],
    source_target: tuple[float, float],
    world_target: tuple[float, float],
    angle_degrees: float,
    scale: float,
) -> tuple[float, float]:
    angle = math.radians(angle_degrees)
    dx = (source_target[0] - source_pivot[0]) * scale
    dy = (source_target[1] - source_pivot[1]) * scale
    rotated = (math.cos(angle) * dx - math.sin(angle) * dy, math.sin(angle) * dx + math.cos(angle) * dy)
    return world_target[0] - rotated[0], world_target[1] - rotated[1]


def source_to_world(
    point: tuple[float, float],
    pivot: tuple[float, float],
    target: tuple[float, float],
    angle_degrees: float,
    scale: float,
) -> tuple[float, float]:
    angle = math.radians(angle_degrees)
    dx, dy = (point[0] - pivot[0]) * scale, (point[1] - pivot[1]) * scale
    return (
        target[0] + math.cos(angle) * dx - math.sin(angle) * dy,
        target[1] + math.sin(angle) * dx + math.cos(angle) * dy,
    )


ACTION_FRAME_COUNT = 15


def sample_key(values: list[float], key_position: float) -> float:
    lower = min(len(values) - 1, int(math.floor(key_position)))
    upper = min(len(values) - 1, lower + 1)
    blend = key_position - lower
    return values[lower] * (1 - blend) + values[upper] * blend


def action_parameters(track: str, index: int, frame_count: int = ACTION_FRAME_COUNT) -> dict[str, float]:
    approach_wing = [-170, -145, -112, -88, -105, -128, -150, -164]
    approach_span = [1.0, 0.95, 0.86, 0.82, 0.72, 0.58, 0.40, 0.30]
    # The settled track enters from the final folded approach pose. Frames 2-7
    # remain quiet; frame 8 is the authored preload shared with launch frame 1.
    perch_wing = [-164, -168, -170, -170, -170, -170, -170, -92]
    perch_span = [0.30, 0.27, 0.25, 0.25, 0.25, 0.25, 0.25, 0.66]
    launch_wing = [-92, -72, -108, -210, -252, -220, -184, -170]
    launch_span = [0.66, 0.74, 0.88, 1.00, 0.98, 0.98, 0.98, 1.00]
    key_position = index * 7 / max(1, frame_count - 1)
    p = key_position / 7
    if track == "approach":
        return {"p": p, "body_angle": -2 - 8 * p, "toe_y": 700 + 50 * min(1, p / 0.72), "wing": sample_key(approach_wing, key_position), "span": sample_key(approach_span, key_position), "leg": 0.16 + 0.11 * p}
    if track == "perch":
        quiet = sample_key([0, 1.0, 2.0, 0.5, 0, -0.4, 0.3, -3.0], key_position)
        return {"p": p, "body_angle": -10 + quiet, "toe_y": 750, "wing": sample_key(perch_wing, key_position), "span": sample_key(perch_span, key_position), "leg": 0.27 if key_position < 7 else 0.25}
    release = max(0, (p - 0.12) / 0.88)
    return {"p": p, "body_angle": -13 + 11 * release, "toe_y": 750 - 145 * release, "wing": sample_key(launch_wing, key_position), "span": sample_key(launch_span, key_position), "leg": 0.25 - 0.19 * release}


def build_actions(flight_parts: Path, appendage_atlas: Path, output_root: Path) -> None:
    body = Image.open(flight_parts / "body.png").convert("RGBA")
    near_wing = Image.open(flight_parts / "near-wing.png").convert("RGBA")
    far_wing = Image.open(flight_parts / "far-wing.png").convert("RGBA")
    appendages = extract_blue_ink(Image.open(appendage_atlas))
    boxes = component_boxes(appendages)
    boxes.sort(key=lambda box: box[1])
    if len(boxes) != 3:
        raise RuntimeError(f"Expected two legs and one tail fan, found {len(boxes)} components")
    near_leg, far_leg, tail_fan = [padded_crop(appendages, box) for box in boxes]

    body_pivot = (body.width * 0.612, body.height * 0.395)
    near_wing_root, far_wing_root = root_pivot(near_wing), root_pivot(far_wing)
    near_leg_root, far_leg_root = top_root(near_leg), top_root(far_leg)
    near_toe, far_toe = bottom_toe(near_leg), bottom_toe(far_leg)
    tail_alpha = np.asarray(tail_fan.getchannel("A"))
    tail_ys, tail_xs = np.nonzero(tail_alpha > 16)
    tail_root = (float(tail_xs.max() - 2), float(np.median(tail_ys[tail_xs >= tail_xs.max() - 12])))

    body_scale = 0.71
    track_records: dict[str, list[dict[str, object]]] = {}
    for track in ("approach", "perch", "launch"):
        track_dir = output_root / track
        track_dir.mkdir(parents=True, exist_ok=True)
        for stale in track_dir.glob("*.png"):
            stale.unlink()
        records: list[dict[str, object]] = []
        for index in range(ACTION_FRAME_COUNT):
            params = action_parameters(track, index)
            leg_scale = params["leg"]
            far_leg_pivot = destination_pivot_for_target(far_leg_root, far_toe, (772, params["toe_y"]), 3, leg_scale * 0.94)
            near_leg_pivot = destination_pivot_for_target(near_leg_root, near_toe, (830, params["toe_y"]), -2, leg_scale)
            average_hip = ((far_leg_pivot[0] + near_leg_pivot[0]) / 2, (far_leg_pivot[1] + near_leg_pivot[1]) / 2)
            shoulder = (average_hip[0] + 54, average_hip[1] - 78)

            canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
            affine_place(far_leg, canvas, far_leg_root, far_leg_pivot, 3, leg_scale * 0.94, leg_scale * 0.94, 0.76)
            tail_base = source_to_world((body.width * 0.29, body.height * 0.55), body_pivot, shoulder, params["body_angle"], body_scale)
            if track == "approach" and params["p"] <= 5 / 7:
                affine_place(tail_fan, canvas, tail_root, tail_base, params["body_angle"], 0.38, 0.38, 0.92)
            place_articulated_wing(far_wing, canvas, far_wing_root, (shoulder[0] - 4, shoulder[1] + 3), params["wing"] + 3, 0.65 * params["span"], 0.62 * params["span"], 0, 0.72)
            affine_place(body, canvas, body_pivot, shoulder, params["body_angle"], body_scale, body_scale)
            affine_place(near_leg, canvas, near_leg_root, near_leg_pivot, -2, leg_scale, leg_scale)
            place_articulated_wing(near_wing, canvas, near_wing_root, shoulder, params["wing"], 0.71 * params["span"], 0.68 * params["span"], 0, 1.0)

            rgba = np.asarray(canvas).copy()
            rgba[..., :3] = np.array(INK, dtype=np.uint8)
            rgba[rgba[..., 3] == 0, :3] = 0
            frame = Image.fromarray(rgba, "RGBA")
            path = track_dir / f"{index + 1:02d}_crow_rig_{track}.png"
            frame.save(path)
            records.append({
                "file": f"{track}/{path.name}",
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "body_landmark_px": [round(shoulder[0], 4), round(shoulder[1], 4)],
                "body_scale_px": round(body.width * body_scale, 4),
                "contact_landmark_px": [801, round(params["toe_y"], 4)],
            })
        track_records[track] = records

    metadata = {
        "schema_version": "2.0",
        "authored": True,
        "visible_rgb": list(INK),
        "minimum_clear_border_px": 64,
        "landmark_tolerance_px": 180,
        "adjacent_scale_ratio_limit": 1.08,
        "track_scale_ratio_limit": 1.12,
        "species": "crow",
        "tracks": track_records,
    }
    (output_root / "authored-actions-v2.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")

    rows_per_track = math.ceil(ACTION_FRAME_COUNT / 4)
    sheet = Image.new("RGB", (1600, rows_per_track * 300 * 3), (244, 240, 230))
    draw = ImageDraw.Draw(sheet)
    for row, track in enumerate(("approach", "perch", "launch")):
        for column, path in enumerate(sorted((output_root / track).glob("*.png"))):
            frame = Image.open(path)
            frame.thumbnail((360, 500), Image.Resampling.LANCZOS)
            x = column % 4 * 400 + (400 - frame.width) // 2
            sheet_row = row * rows_per_track + column // 4
            y = sheet_row * 300 + (270 - frame.height) // 2
            sheet.paste(frame, (x, y), frame)
            draw.text((column % 4 * 400 + 12, sheet_row * 300 + 278), path.stem, fill=(25, 31, 40))
    sheet.save(output_root / "crow-actions-v2-contact-sheet.jpg", quality=92)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--flight-parts", type=Path, required=True)
    parser.add_argument("--appendage-atlas", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    build_actions(args.flight_parts, args.appendage_atlas, args.output)


if __name__ == "__main__":
    main()
