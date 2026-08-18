#!/usr/bin/env python3
"""Build deterministic one-color/alpha motion from a layered engraving atlas.

This is an offline authoring tool. It never runs in Murmur. The runtime keeps
playing exact transparent PNGs, while this tool gives those PNGs one stable
body identity and continuous, phase-coupled wing transforms.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


INK = (4, 58, 120)
CANVAS = (1600, 1200)


def extract_blue_ink(source: Image.Image) -> Image.Image:
    """Discard generated checker/matte and encode every visible pixel in alpha."""
    rgb = np.asarray(source.convert("RGB"), dtype=np.int16)
    red, green, blue = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    chroma = blue - np.maximum(red, green)
    saturation = rgb.max(axis=2) - rgb.min(axis=2)
    alpha = np.clip((chroma - 12) * 4 + (saturation - 26) * 2, 0, 255).astype(np.uint8)
    alpha[alpha < 8] = 0
    out = np.zeros((*alpha.shape, 4), dtype=np.uint8)
    out[..., :3] = INK
    out[..., 3] = alpha
    return Image.fromarray(out, "RGBA")


def component_boxes(ink: Image.Image) -> list[tuple[int, int, int, int]]:
    alpha = np.asarray(ink.getchannel("A")) > 12
    labels, count = ndimage.label(alpha)
    boxes: list[tuple[int, tuple[int, int, int, int]]] = []
    for label, slices in enumerate(ndimage.find_objects(labels), start=1):
        if slices is None:
            continue
        ys, xs = slices
        area = int(np.count_nonzero(labels[slices] == label))
        if area < 2_000:
            continue
        boxes.append((area, (xs.start, ys.start, xs.stop, ys.stop)))
    return [box for _, box in sorted(boxes, reverse=True)[:3]]


def padded_crop(image: Image.Image, box: tuple[int, int, int, int], pad: int = 18) -> Image.Image:
    x0, y0, x1, y1 = box
    bounds = (
        max(0, x0 - pad),
        max(0, y0 - pad),
        min(image.width, x1 + pad),
        min(image.height, y1 + pad),
    )
    return image.crop(bounds)


def affine_place(
    source: Image.Image,
    destination: Image.Image,
    source_pivot: tuple[float, float],
    destination_pivot: tuple[float, float],
    angle_degrees: float,
    scale_x: float,
    scale_y: float,
    opacity: float = 1.0,
) -> None:
    """Place a source around a fixed pivot without ever blending two poses."""
    angle = math.radians(angle_degrees)
    cosine, sine = math.cos(angle), math.sin(angle)
    pivot_x, pivot_y = source_pivot
    target_x, target_y = destination_pivot

    # Pillow's affine coefficients map output coordinates back to source.
    a = cosine / scale_x
    b = sine / scale_x
    c = pivot_x - a * target_x - b * target_y
    d = -sine / scale_y
    e = cosine / scale_y
    f = pivot_y - d * target_x - e * target_y
    warped = source.transform(
        destination.size,
        Image.Transform.AFFINE,
        (a, b, c, d, e, f),
        resample=Image.Resampling.BICUBIC,
    )
    if opacity < 0.999:
        alpha = warped.getchannel("A").point(lambda value: round(value * opacity))
        warped.putalpha(alpha)
    destination.alpha_composite(warped)


def periodic_catmull(values: list[float], phase: float) -> float:
    count = len(values)
    position = (phase % 1.0) * count
    index = int(math.floor(position))
    t = position - index
    p0 = values[(index - 1) % count]
    p1 = values[index % count]
    p2 = values[(index + 1) % count]
    p3 = values[(index + 2) % count]
    return 0.5 * (
        2 * p1
        + (-p0 + p2) * t
        + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
        + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
    )


def wing_pose(phase: float) -> tuple[float, float, float, float]:
    """Corvid cycle: compact recovery, broad power stroke, gentle return."""
    # Eight biomechanical keys around one loop. Downstroke occupies less time
    # than the flexed recovery; the baked 12-pose output samples this curve.
    # Keep the angle curve unwrapped across the downstroke. Treating the last
    # two keys as +142/+104 makes a spline take the long way around the circle
    # at the loop seam and creates a false reversal.
    angles = [-174, -142, -104, -78, -126, -172, -218, -256]
    lengths = [1.00, 0.90, 0.67, 0.76, 0.90, 1.00, 1.02, 0.98]
    thickness = [0.92, 0.86, 0.72, 0.76, 0.86, 0.94, 1.02, 1.04]
    wrist_flex = [0, 9, 31, 46, 27, 5, -7, -3]
    return (
        periodic_catmull(angles, phase),
        periodic_catmull(lengths, phase),
        periodic_catmull(thickness, phase),
        periodic_catmull(wrist_flex, phase),
    )


def pigeon_wing_pose(phase: float) -> tuple[float, float, float, float]:
    """Pigeon cycle: forceful downstroke and a compact, fast recovery."""
    angles = [-170, -124, -82, -112, -166, -218, -258, -226]
    lengths = [1.00, 0.86, 0.63, 0.72, 0.94, 1.03, 1.00, 0.96]
    thickness = [0.95, 0.83, 0.69, 0.75, 0.94, 1.04, 1.06, 1.00]
    wrist_flex = [2, 18, 45, 34, 8, -8, -4, 0]
    return tuple(
        periodic_catmull(values, phase)
        for values in (angles, lengths, thickness, wrist_flex)
    )


def swallow_wing_pose(phase: float) -> tuple[float, float, float, float]:
    """Swallow cycle: pointed power stroke, compact recovery, short glide."""
    angles = [-170, -132, -91, -72, -119, -168, -214, -246, -218, -181, -171, -170]
    lengths = [1.00, 0.87, 0.65, 0.72, 0.88, 1.00, 1.03, 1.00, 0.98, 1.00, 1.00, 1.00]
    thickness = [0.91, 0.82, 0.67, 0.72, 0.84, 0.94, 1.00, 1.02, 0.98, 0.92, 0.91, 0.91]
    wrist_flex = [0, 14, 39, 44, 24, 3, -6, -3, -1, 0, 0, 0]
    return tuple(
        periodic_catmull(values, phase)
        for values in (angles, lengths, thickness, wrist_flex)
    )


def butterfly_wing_pose(phase: float) -> tuple[float, float, float, float]:
    """Butterfly clap/peel loop with one open and one closed reversal."""
    angles = [-170, -127, -105, -143, -188, -226, -244, -205]
    lengths = [1.00, 0.96, 0.91, 0.98, 1.02, 0.96, 0.90, 0.98]
    # Foreshortening narrows the wing near the clap without swapping camera.
    thickness = [1.00, 0.72, 0.40, 0.70, 1.00, 0.72, 0.42, 0.74]
    wrist_flex = [0, 3, 6, 2, 0, -3, -5, -2]
    return tuple(
        periodic_catmull(values, phase)
        for values in (angles, lengths, thickness, wrist_flex)
    )


def bat_wing_pose(phase: float) -> tuple[float, float, float, float]:
    """Bat cycle: digit-supported membrane opens on power, folds on recovery."""
    angles = [90, 128, 158, 130, 88, 48, 20, 54]
    lengths = [1.00, 0.84, 0.68, 0.78, 1.00, 1.04, 0.98, 0.96]
    thickness = [1.00, 0.78, 0.58, 0.72, 1.00, 1.04, 1.00, 0.96]
    wrist_flex = [0, 12, 28, 18, 0, -8, -4, 0]
    return tuple(
        periodic_catmull(values, phase)
        for values in (angles, lengths, thickness, wrist_flex)
    )


def hummingbird_shimmer_pose(phase: float) -> tuple[float, float, float, float]:
    """Display-rate shimmer for a baked multi-exposure 40–60 Hz wing fan."""
    angles = [-4, 3, 5, -2]
    lengths = [0.99, 1.01, 1.00, 0.98]
    thickness = [0.96, 1.02, 0.98, 1.01]
    wrist_flex = [0, 1.5, 0, -1.5]
    return tuple(
        periodic_catmull(values, phase)
        for values in (angles, lengths, thickness, wrist_flex)
    )


def root_pivot(wing: Image.Image) -> tuple[float, float]:
    alpha = np.asarray(wing.getchannel("A"))
    ys, xs = np.nonzero(alpha > 16)
    cutoff = xs.min() + max(24, int((xs.max() - xs.min()) * 0.09))
    root_y = float(np.median(ys[xs <= cutoff]))
    return float(xs.min() + 3), root_y


def bend_wing(source: Image.Image, root: tuple[float, float], flex_degrees: float) -> Image.Image:
    """Apply a seam-free progressive wrist/primary bend in polar space."""
    rgba = np.asarray(source, dtype=np.float32)
    height, width = rgba.shape[:2]
    yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)
    dx, dy = xx - root[0], yy - root[1]
    radius = np.hypot(dx, dy)
    max_radius = max(1.0, math.hypot(width - root[0], height * 0.55))
    weight = np.power(np.clip(radius / max_radius, 0, 1), 1.75)
    # Inverse-map the output through a progressively stronger distal rotation.
    # The shoulder stays fixed, coverts and secondaries flex slightly, and the
    # hand/primaries carry the full authored wrist value with no cut seam.
    source_theta = np.arctan2(dy, dx) - math.radians(flex_degrees) * weight
    source_x = root[0] + radius * np.cos(source_theta)
    source_y = root[1] + radius * np.sin(source_theta)
    coordinates = np.vstack([source_y.ravel(), source_x.ravel()])
    warped = np.empty_like(rgba)
    for channel in range(4):
        warped[..., channel] = ndimage.map_coordinates(
            rgba[..., channel],
            coordinates,
            order=1,
            mode="constant",
            cval=0,
        ).reshape(height, width)
    return Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), "RGBA")


def place_articulated_wing(
    source: Image.Image,
    destination: Image.Image,
    root: tuple[float, float],
    shoulder: tuple[float, float],
    angle: float,
    length_scale: float,
    thickness_scale: float,
    wrist_flex: float,
    opacity: float,
) -> None:
    bent = bend_wing(source, root, wrist_flex)
    affine_place(
        bent,
        destination,
        root,
        shoulder,
        angle,
        length_scale,
        thickness_scale,
        opacity,
    )


def repair_shoulder_socket(body: Image.Image, shoulder: tuple[float, float]) -> None:
    """Turn the atlas registration socket into a quiet engraved shoulder cap."""
    center_x, center_y = shoulder
    draw = ImageDraw.Draw(body)
    # The generation atlas contains a large circular registration socket. Its
    # outer guide must be covered too; leaving only the center filled produces
    # a conspicuous pale crescent once composited on a light scene.
    radius_x, radius_y = 63, 57
    draw.ellipse(
        (
            center_x - radius_x,
            center_y - radius_y,
            center_x + radius_x,
            center_y + radius_y,
        ),
        fill=INK + (244,),
    )
    # Low-alpha blue separations preserve the engraving language without
    # cutting a white/checker-shaped crescent through the shoulder.
    for offset, inset in [(-15, 8), (-5, 3), (6, 1), (17, 6)]:
        draw.arc(
            (
                center_x - radius_x + inset,
                center_y - radius_y + offset * 0.25,
                center_x + radius_x - inset,
                center_y + radius_y + offset * 0.25,
            ),
            205,
            332,
            fill=INK + (90,),
            width=3,
        )


def build_bird_flight(
    species: str,
    atlas_path: Path,
    output_dir: Path,
    frames: int = 12,
) -> None:
    extracted = extract_blue_ink(Image.open(atlas_path))
    boxes = component_boxes(extracted)
    if len(boxes) != 3:
        raise RuntimeError(f"Expected three rig components, found {len(boxes)}")
    boxes.sort(key=lambda box: box[1])
    body = padded_crop(extracted, boxes[0])
    near_wing = padded_crop(extracted, boxes[1])
    far_wing = padded_crop(extracted, boxes[2])

    if species == "crow":
        body_shoulder = (body.width * 0.612, body.height * 0.395)
        repair_shoulder_socket(body, body_shoulder)
        body_scale, near_scale, far_scale = 0.71, 0.71, 0.65
        pose_function = wing_pose
    elif species == "pigeon":
        body_shoulder = (body.width * 0.485, body.height * 0.47)
        body_scale, near_scale, far_scale = 0.66, 0.67, 0.61
        pose_function = pigeon_wing_pose
    elif species == "swallow":
        body_shoulder = (body.width * 0.555, body.height * 0.48)
        body_scale, near_scale, far_scale = 0.67, 0.62, 0.56
        pose_function = swallow_wing_pose
    elif species == "butterfly":
        body_shoulder = (body.width * 0.58, body.height * 0.50)
        body_scale, near_scale, far_scale = 0.70, 0.52, 0.48
        pose_function = butterfly_wing_pose
    elif species == "bat":
        body_shoulder = (body.width * 0.48, body.height * 0.48)
        body_scale, near_scale, far_scale = 0.68, 0.53, 0.49
        pose_function = bat_wing_pose
    elif species == "hummingbird":
        body_shoulder = (body.width * 0.49, body.height * 0.47)
        body_scale, near_scale, far_scale = 0.62, 0.62, 0.0
        pose_function = hummingbird_shimmer_pose
    else:
        raise ValueError(f"Unsupported layered bird species: {species}")

    output_dir.mkdir(parents=True, exist_ok=True)
    parts_dir = output_dir / "parts"
    parts_dir.mkdir(exist_ok=True)
    body.save(parts_dir / "body.png")
    near_wing.save(parts_dir / "near-wing.png")
    far_wing.save(parts_dir / "far-wing.png")

    if species == "bat":
        near_root = (near_wing.width * 0.47, near_wing.height * 0.08)
        far_root = (far_wing.width * 0.47, far_wing.height * 0.08)
    elif species == "hummingbird":
        near_root = (near_wing.width * 0.52, near_wing.height * 0.50)
        far_root = (far_wing.width * 0.52, far_wing.height * 0.50)
    else:
        near_root = root_pivot(near_wing)
        far_root = root_pivot(far_wing)
    # The atlas intentionally marks the shoulder socket. These normalized
    # coordinates keep the exact head/torso/tail artwork invariant.
    world_shoulder = (800.0, 500.0)
    # Rebuilding at a different sampling density must not leave stale numbered
    # poses that silently become part of the next bundle.
    for stale_frame in output_dir.glob(f"*_{species}_rig_flight.png"):
        stale_frame.unlink()
    for frame_index in range(frames):
        phase = frame_index / frames
        angle, length, thickness, wrist_flex = pose_function(phase)
        far_angle, far_length, far_thickness, far_wrist_flex = pose_function((phase + 0.018) % 1)
        # The torso reacts to the same oscillator instead of floating on an
        # unrelated sine. Amplitudes are deliberately restrained.
        lift = -2.4 * math.sin(phase * math.tau - math.pi * 0.15)
        pitch = 0.6 * math.sin(phase * math.tau + math.pi * 0.1)
        shoulder = (world_shoulder[0], world_shoulder[1] + lift)

        canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        if species == "hummingbird":
            # This source is already a complete near/far multi-exposure fan.
            # Draw it once behind the crisp body; duplicating it would create
            # the same doubled-outline artifact as runtime alpha crossfades.
            place_articulated_wing(
                near_wing, canvas, near_root, shoulder, angle,
                near_scale * length, near_scale * thickness, wrist_flex, 0.82,
            )
        else:
            place_articulated_wing(
                far_wing,
                canvas,
                far_root,
                (shoulder[0] - 4, shoulder[1] + 3),
                far_angle + 2.5,
                far_scale * far_length,
                far_scale * far_thickness,
                far_wrist_flex,
                opacity=0.74,
            )
        affine_place(
            body,
            canvas,
            body_shoulder,
            shoulder,
            pitch,
            body_scale,
            body_scale,
        )
        if species != "hummingbird":
            place_articulated_wing(
                near_wing,
                canvas,
                near_root,
                shoulder,
                angle,
                near_scale * length,
                near_scale * thickness,
                wrist_flex,
                opacity=1.0,
            )

        # Enforce the authored runtime contract after every transform.
        rgba = np.asarray(canvas).copy()
        rgba[..., :3] = np.array(INK, dtype=np.uint8)
        rgba[rgba[..., 3] == 0, :3] = 0
        final = Image.fromarray(rgba, "RGBA")
        final.save(output_dir / f"{frame_index + 1:02d}_{species}_rig_flight.png")

    contact = Image.new("RGB", (800 * 4, 600 * 3), (244, 240, 230))
    draw = ImageDraw.Draw(contact)
    for index, frame_path in enumerate(sorted(output_dir.glob(f"*_{species}_rig_flight.png"))):
        frame = Image.open(frame_path)
        frame.thumbnail((760, 540), Image.Resampling.LANCZOS)
        x = (index % 4) * 800 + (800 - frame.width) // 2
        y = (index // 4) * 600 + (560 - frame.height) // 2
        contact.paste(frame, (x, y), frame)
        draw.text((index % 4 * 800 + 18, index // 4 * 600 + 565), frame_path.stem, fill=(25, 31, 40))
    contact.save(output_dir / f"{species}-rig-flight-contact-sheet.jpg", quality=92)

    frame_paths = sorted(output_dir.glob(f"*_{species}_rig_flight.png"))
    metadata = {
        "schema_version": "2.0",
        "authored": True,
        "visible_rgb": list(INK),
        "minimum_clear_border_px": 64,
        "landmark_tolerance_px": 4.0,
        "adjacent_scale_ratio_limit": 1.08,
        "track_scale_ratio_limit": 1.12,
        "species": species,
        "track": "flight",
        "frames": [],
        "evidence": [],
    }
    for frame_index, frame_path in enumerate(frame_paths):
        phase = frame_index / frames
        lift = -2.4 * math.sin(phase * math.tau - math.pi * 0.15)
        metadata["frames"].append({
            "file": f"baked-flight/{frame_path.name}",
            "sha256": hashlib.sha256(frame_path.read_bytes()).hexdigest(),
            "body_landmark_px": [world_shoulder[0], world_shoulder[1] + lift],
            "body_scale_px": round(body.width * body_scale, 4),
        })
    (output_dir.parent / "authored-motion-v2.json").write_text(
        json.dumps(metadata, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--species", choices=["crow", "pigeon", "swallow", "butterfly", "bat", "hummingbird"], default="crow")
    parser.add_argument("--atlas", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--frames", type=int, default=12)
    args = parser.parse_args()
    build_bird_flight(args.species, args.atlas, args.output, args.frames)


if __name__ == "__main__":
    main()
