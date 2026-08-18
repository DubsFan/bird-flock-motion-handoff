#!/usr/bin/env python3
"""Bake butterfly alight, bat inverted-roost, and hummingbird hover tracks."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from build_layered_crow_actions import ACTION_FRAME_COUNT, bottom_toe, destination_pivot_for_target, sample_key, top_root
from build_layered_motion import CANVAS, INK, affine_place, component_boxes, extract_blue_ink, padded_crop, place_articulated_wing, root_pivot


def bottom_root(part: Image.Image) -> tuple[float, float]:
    alpha = np.asarray(part.getchannel("A"))
    ys, xs = np.nonzero(alpha > 16)
    cutoff = ys.max() - max(12, int((ys.max() - ys.min()) * 0.08))
    return float(np.median(xs[ys >= cutoff])), float(ys.max() - 2)


def top_contact(part: Image.Image) -> tuple[float, float]:
    alpha = np.asarray(part.getchannel("A"))
    ys, xs = np.nonzero(alpha > 16)
    cutoff = ys.min() + max(12, int((ys.max() - ys.min()) * 0.08))
    return float(np.median(xs[ys <= cutoff])), float(ys.min() + 2)


def write_frame(canvas: Image.Image, path: Path) -> None:
    rgba = np.asarray(canvas).copy()
    rgba[..., :3] = np.array(INK, dtype=np.uint8)
    rgba[rgba[..., 3] == 0, :3] = 0
    Image.fromarray(rgba, "RGBA").save(path)


def write_bundle(output: Path, species: str, records: dict[str, list[dict[str, object]]], launch_direction: str = "decreasing") -> None:
    metadata = {
        "schema_version": "2.0", "authored": True, "visible_rgb": list(INK),
        "minimum_clear_border_px": 64, "species": species,
        "launch_contact_direction": launch_direction, "tracks": records,
    }
    (output / "authored-actions-v2.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    rows_per_track = math.ceil(ACTION_FRAME_COUNT / 4)
    sheet = Image.new("RGB", (1600, rows_per_track * 300 * 3), (244, 240, 230))
    draw = ImageDraw.Draw(sheet)
    for track_row, track in enumerate(("approach", "perch", "launch")):
        for column, path in enumerate(sorted((output / track).glob("*.png"))):
            image = Image.open(path)
            image.thumbnail((360, 270), Image.Resampling.LANCZOS)
            sheet_row = track_row * rows_per_track + column // 4
            x, y = column % 4 * 400 + (400 - image.width) // 2, sheet_row * 300 + (270 - image.height) // 2
            sheet.paste(image, (x, y), image)
            draw.text((column % 4 * 400 + 12, sheet_row * 300 + 278), path.stem, fill=(25, 31, 40))
    sheet.save(output / f"{species}-actions-v2-contact-sheet.jpg", quality=92)


def action_parts(atlas_path: Path, row: int) -> tuple[Image.Image, Image.Image]:
    atlas = Image.open(atlas_path)
    half = atlas.height // 2
    extracted = extract_blue_ink(atlas.crop((0, row * half, atlas.width, (row + 1) * half)))
    boxes = component_boxes(extracted)
    boxes.sort(key=lambda box: box[0])
    if len(boxes) != 2:
        raise RuntimeError(f"expected two detached action appendages, found {len(boxes)}")
    return padded_crop(extracted, boxes[0]), padded_crop(extracted, boxes[1])


def build_butterfly(parts: Path, atlas: Path, output: Path) -> None:
    body, near_wing, far_wing = [Image.open(parts / name).convert("RGBA") for name in ("body.png", "near-wing.png", "far-wing.png")]
    near_legs, far_legs = action_parts(atlas, 0)
    near_leg_root, far_leg_root = top_root(near_legs), top_root(far_legs)
    near_toe, far_toe = bottom_toe(near_legs), bottom_toe(far_legs)
    near_root, far_root = root_pivot(near_wing), root_pivot(far_wing)
    body_pivot = (body.width * 0.58, body.height * 0.50)
    wing_angle = {
        "approach": [-170, -135, -108, -132, -172, -206, -118, -92],
        "perch": [-92, -88, -90, -90, -90, -90, -90, -118],
        "launch": [-118, -104, -82, -126, -180, -220, -198, -170],
    }
    wing_thickness = {
        "approach": [1, .78, .50, .72, 1, .75, .35, .20],
        "perch": [.20, .16, .14, .14, .14, .14, .14, .34],
        "launch": [.34, .46, .70, .92, 1, .76, .66, 1],
    }
    records: dict[str, list[dict[str, object]]] = {}
    for track in ("approach", "perch", "launch"):
        folder = output / track
        folder.mkdir(parents=True, exist_ok=True)
        for stale in folder.glob("*.png"):
            stale.unlink()
        current: list[dict[str, object]] = []
        for index in range(ACTION_FRAME_COUNT):
            key_position = index * 7 / max(1, ACTION_FRAME_COUNT - 1)
            progress = key_position / 7
            if track == "approach":
                toe_y, leg_scale, body_angle = 700 + 50 * min(1, progress / .72), .07 + .05 * progress, -2 - 8 * progress
            elif track == "perch":
                toe_y, leg_scale, body_angle = 750, .12 if key_position < 7 else .115, -10 + sample_key([0, .6, .2, 0, -.2, .2, 0, -2], key_position)
            else:
                release = max(0, (progress - .12) / .88)
                toe_y, leg_scale, body_angle = 750 - 105 * release, .115 - .065 * release, -12 + 10 * release
            far_target = destination_pivot_for_target(far_leg_root, far_toe, (788, toe_y), 1, leg_scale)
            near_target = destination_pivot_for_target(near_leg_root, near_toe, (814, toe_y), -1, leg_scale)
            thorax = ((far_target[0] + near_target[0]) / 2 + 8, (far_target[1] + near_target[1]) / 2 - 44)
            canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
            affine_place(far_legs, canvas, far_leg_root, far_target, 1, leg_scale, leg_scale, .65)
            sampled_angle = sample_key(wing_angle[track], key_position)
            sampled_thickness = sample_key(wing_thickness[track], key_position)
            place_articulated_wing(far_wing, canvas, far_root, (thorax[0] - 2, thorax[1] + 2), sampled_angle + 4, .48, .46 * sampled_thickness, 0, .68)
            affine_place(body, canvas, body_pivot, thorax, body_angle, .70, .70)
            affine_place(near_legs, canvas, near_leg_root, near_target, -1, leg_scale, leg_scale)
            place_articulated_wing(near_wing, canvas, near_root, thorax, sampled_angle, .52, .50 * sampled_thickness, 0, 1)
            path = folder / f"{index + 1:02d}_butterfly_rig_{track}.png"
            write_frame(canvas, path)
            current.append({"file": f"{track}/{path.name}", "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "body_landmark_px": [round(thorax[0], 4), round(thorax[1], 4)], "body_scale_px": round(body.width * .70, 4), "contact_landmark_px": [801, round(toe_y, 4)]})
        records[track] = current
    write_bundle(output, "butterfly", records)


def build_bat(parts: Path, atlas: Path, output: Path) -> None:
    body, near_wing, far_wing = [Image.open(parts / name).convert("RGBA") for name in ("body.png", "near-wing.png", "far-wing.png")]
    near_leg, far_leg = action_parts(atlas, 1)
    near_body, far_body = bottom_root(near_leg), bottom_root(far_leg)
    near_claw, far_claw = top_contact(near_leg), top_contact(far_leg)
    near_root = (near_wing.width * .47, near_wing.height * .08)
    far_root = (far_wing.width * .47, far_wing.height * .08)
    body_pivot = (body.width * .48, body.height * .48)
    records: dict[str, list[dict[str, object]]] = {}
    for track in ("approach", "perch", "launch"):
        folder = output / track
        folder.mkdir(parents=True, exist_ok=True)
        for stale in folder.glob("*.png"):
            stale.unlink()
        current: list[dict[str, object]] = []
        for index in range(ACTION_FRAME_COUNT):
            key_position = index * 7 / max(1, ACTION_FRAME_COUNT - 1)
            progress = key_position / 7
            if track == "approach":
                contact_y = 500 - 50 * min(1, progress / .72)
                angle, leg_scale = 5 + 85 * progress, .10 + .04 * progress
                wing_angle, span = 90 + 60 * progress, 1 - .55 * progress
            elif track == "perch":
                contact_y, angle, leg_scale = 450, 90 + sample_key([0, 2, 1, 0, -.6, .4, 0, -5], key_position), .14 if key_position < 7 else .135
                wing_angle, span = 150 + sample_key([0, 8, 15, 18, 18, 18, 18, -32], key_position), .45 if key_position < 7 else .62
            else:
                release = max(0, (progress - .12) / .88)
                contact_y, angle, leg_scale = 450 + 150 * release, 85 - 80 * release, .135 - .075 * release
                wing_angle, span = 118 - 98 * release, .62 + .38 * release
            far_attach = destination_pivot_for_target(far_body, far_claw, (784, contact_y), 0, leg_scale)
            near_attach = destination_pivot_for_target(near_body, near_claw, (818, contact_y), 0, leg_scale)
            torso = ((far_attach[0] + near_attach[0]) / 2, (far_attach[1] + near_attach[1]) / 2 + 35)
            canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
            affine_place(far_leg, canvas, far_body, far_attach, 0, leg_scale, leg_scale, .70)
            place_articulated_wing(far_wing, canvas, far_root, (torso[0] - 3, torso[1] + 2), wing_angle + 5, .49 * span, .46 * span, 0, .68)
            affine_place(body, canvas, body_pivot, torso, angle, .68, .68)
            affine_place(near_leg, canvas, near_body, near_attach, 0, leg_scale, leg_scale)
            place_articulated_wing(near_wing, canvas, near_root, torso, wing_angle, .53 * span, .50 * span, 0, 1)
            path = folder / f"{index + 1:02d}_bat_rig_{track}.png"
            write_frame(canvas, path)
            current.append({"file": f"{track}/{path.name}", "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "body_landmark_px": [round(torso[0], 4), round(torso[1], 4)], "body_scale_px": round(body.width * .68, 4), "contact_landmark_px": [801, round(contact_y, 4)]})
        records[track] = current
    write_bundle(output, "bat", records, "increasing")


def build_hummingbird(parts: Path, output: Path) -> None:
    body, wing = [Image.open(parts / name).convert("RGBA") for name in ("body.png", "near-wing.png")]
    body_pivot = (body.width * .49, body.height * .47)
    wing_root = (wing.width * .52, wing.height * .50)
    records: dict[str, list[dict[str, object]]] = {}
    for track in ("approach", "perch", "launch"):
        folder = output / track
        folder.mkdir(parents=True, exist_ok=True)
        for stale in folder.glob("*.png"):
            stale.unlink()
        current: list[dict[str, object]] = []
        for index in range(ACTION_FRAME_COUNT):
            key_position = index * 7 / max(1, ACTION_FRAME_COUNT - 1)
            progress = key_position / 7
            shimmer = sample_key([-5, 3, 6, -2, -6, 2, 5, -3], key_position)
            if track == "approach":
                anchor_y, pitch, wing_scale = 570 + 50 * min(1, progress / .72), -5 + 5 * progress, .60 + .02 * progress
            elif track == "perch":
                anchor_y, pitch, wing_scale = 620, sample_key([0, .4, -.3, .2, 0, -.2, .3, 0], key_position), .62
            else:
                release = max(0, (progress - .12) / .88)
                anchor_y, pitch, wing_scale = 620 - 100 * release, -10 * release, .62
            anchor = (800, anchor_y)
            canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
            place_articulated_wing(wing, canvas, wing_root, (anchor[0] - 2, anchor[1] + 2), shimmer + 2, wing_scale * .96, wing_scale * .96, 0, .65)
            affine_place(body, canvas, body_pivot, anchor, pitch, .62, .62)
            place_articulated_wing(wing, canvas, wing_root, anchor, shimmer, wing_scale, wing_scale, 0, .92)
            path = folder / f"{index + 1:02d}_hummingbird_rig_{track}.png"
            write_frame(canvas, path)
            current.append({"file": f"{track}/{path.name}", "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "body_landmark_px": [800, round(anchor_y, 4)], "body_scale_px": round(body.width * .62, 4), "contact_landmark_px": [800, round(anchor_y, 4)]})
        records[track] = current
    write_bundle(output, "hummingbird", records)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--species", choices=("butterfly", "bat", "hummingbird"), required=True)
    parser.add_argument("--flight-parts", type=Path, required=True)
    parser.add_argument("--appendage-atlas", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.species == "hummingbird":
        build_hummingbird(args.flight_parts, args.output)
    elif args.appendage_atlas is None:
        raise SystemExit("--appendage-atlas is required for butterfly and bat")
    elif args.species == "butterfly":
        build_butterfly(args.flight_parts, args.appendage_atlas, args.output)
    else:
        build_bat(args.flight_parts, args.appendage_atlas, args.output)


if __name__ == "__main__":
    main()
