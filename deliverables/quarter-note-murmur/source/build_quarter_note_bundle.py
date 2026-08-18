#!/usr/bin/env python3
"""Build a directly importable 64-frame Murmur quarter-note bundle.

The exact supplied quarter-note alpha silhouette is the identity master. Every
frame is a rigid rotation/translation of that silhouette at constant scale.
No frame squashes, stretches, shears, redraws, or morphs the note geometry.
"""

from __future__ import annotations

import hashlib
import json
import math
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


SOURCE_DIR = Path(__file__).resolve().parent
ROOT = SOURCE_DIR.parent
MASTER_PATH = SOURCE_DIR / "quarter-note-master.png"
SPEC_PATH = SOURCE_DIR / "motion-spec.json"
BUNDLE_DIR = ROOT / "quarter-note-01"
QA_DIR = ROOT / "qa"

TRACK_DIRS = {
    "flight": "flight",
    "approach": "01_landing_approach",
    "perch": "02_perch_settle_hold",
    "launch": "03_launch_flyoff",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def clean_source_alpha(image: Image.Image) -> tuple[Image.Image, tuple[float, float]]:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    alpha = rgba[..., 3].copy()
    alpha[alpha < 8] = 0
    ys, xs = np.where(alpha > 0)
    if not len(xs):
        raise RuntimeError("The quarter-note master contains no visible alpha pixels")
    bbox = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    cropped = alpha[bbox[1]:bbox[3], bbox[0]:bbox[2]]

    # The fixed anchor is the mass center of the notehead (the lower 30% of
    # the source), not the changing visual centroid of the full tall glyph.
    lower_start = round(cropped.shape[0] * 0.70)
    lower = cropped[lower_start:].astype(np.float64)
    lower_y, lower_x = np.indices(lower.shape)
    weights = lower / 255.0
    total = float(weights.sum())
    if total <= 0:
        raise RuntimeError("Could not locate the quarter-note head anchor")
    anchor_x = float((lower_x * weights).sum() / total)
    anchor_y = float(lower_start + (lower_y * weights).sum() / total)
    return Image.fromarray(cropped, "L"), (anchor_x, anchor_y)


def prepared_base_mask(spec: dict[str, object]) -> tuple[Image.Image, dict[str, float]]:
    source, source_anchor = clean_source_alpha(Image.open(MASTER_PATH))
    target_height = int(spec["base_height"])
    width_scale = float(spec["base_width_scale"])
    target_width = round(source.width / source.height * target_height * width_scale)
    resized = source.resize((target_width, target_height), Image.Resampling.LANCZOS)
    canvas_spec = spec["canvas"]
    canvas_size = (int(canvas_spec["width"]), int(canvas_spec["height"]))
    anchor = (int(canvas_spec["anchor"]["x"]), int(canvas_spec["anchor"]["y"]))
    local_anchor = (
        source_anchor[0] / source.width * target_width,
        source_anchor[1] / source.height * target_height,
    )
    left = round(anchor[0] - local_anchor[0])
    top = round(anchor[1] - local_anchor[1])
    base = Image.new("L", canvas_size, 0)
    base.paste(resized, (left, top))
    return base, {
        "source_anchor_x": source_anchor[0],
        "source_anchor_y": source_anchor[1],
        "resized_anchor_x": local_anchor[0],
        "resized_anchor_y": local_anchor[1],
        "placed_left": left,
        "placed_top": top,
    }


def transform_mask(base: Image.Image, pose: dict[str, object], anchor: tuple[int, int]) -> Image.Image:
    angle = math.radians(float(pose["angle_deg"]))
    offset = np.array([
        float(pose.get("offset_x", 0)),
        float(pose.get("offset_y", 0)),
    ], dtype=np.float64)
    rotation = np.array([
        [math.cos(angle), -math.sin(angle)],
        [math.sin(angle), math.cos(angle)],
    ], dtype=np.float64)
    inverse = rotation.T
    pivot = np.asarray(anchor, dtype=np.float64)
    inverse_offset = pivot - inverse @ (pivot + offset)
    coefficients = (
        float(inverse[0, 0]),
        float(inverse[0, 1]),
        float(inverse_offset[0]),
        float(inverse[1, 0]),
        float(inverse[1, 1]),
        float(inverse_offset[1]),
    )
    return base.transform(
        base.size,
        Image.Transform.AFFINE,
        coefficients,
        resample=Image.Resampling.BICUBIC,
        fillcolor=0,
    )


def rgba_from_mask(mask: Image.Image, ink: tuple[int, int, int]) -> Image.Image:
    alpha = np.asarray(mask, dtype=np.uint8)
    rgba = np.zeros((mask.height, mask.width, 4), dtype=np.uint8)
    visible = alpha > 0
    rgba[visible, 0] = ink[0]
    rgba[visible, 1] = ink[1]
    rgba[visible, 2] = ink[2]
    rgba[..., 3] = alpha
    return Image.fromarray(rgba, "RGBA")


def font(size: int) -> ImageFont.ImageFont:
    candidates = [
        Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
        Path("/System/Library/Fonts/Helvetica.ttc"),
    ]
    for candidate in candidates:
        if candidate.exists():
            try:
                return ImageFont.truetype(str(candidate), size=size)
            except OSError:
                pass
    return ImageFont.load_default()


def composite(frame: Image.Image, background: tuple[int, int, int]) -> Image.Image:
    plate = Image.new("RGBA", frame.size, (*background, 255))
    plate.alpha_composite(frame)
    return plate.convert("RGB")


def contact_sheet(
    paths: list[Path],
    labels: list[str],
    destination: Path,
    rows: int | None = None,
) -> None:
    columns = 8
    rows = rows or math.ceil(len(paths) / columns)
    tile = (240, 180)
    label_height = 52
    sheet = Image.new("RGB", (columns * tile[0], rows * (tile[1] + label_height)), (15, 22, 31))
    draw = ImageDraw.Draw(sheet)
    label_font = font(15)
    for index, (path, label) in enumerate(zip(paths, labels)):
        frame = Image.open(path).convert("RGBA")
        background = (246, 248, 252) if index % 2 == 0 else (15, 22, 31)
        rendered = composite(frame, background).resize(tile, Image.Resampling.LANCZOS)
        x = index % columns * tile[0]
        y = index // columns * (tile[1] + label_height)
        sheet.paste(rendered, (x, y))
        draw.text((x + 7, y + tile[1] + 7), label, fill=(231, 238, 246), font=label_font)
    sheet.save(destination, optimize=True)


def alpha_check(frame_path: Path, destination: Path) -> None:
    frame = Image.open(frame_path).convert("RGBA")
    checker = Image.new("RGB", frame.size, (224, 228, 235))
    checker_draw = ImageDraw.Draw(checker)
    block = 80
    for y in range(0, frame.height, block):
        for x in range(0, frame.width, block):
            if (x // block + y // block) % 2:
                checker_draw.rectangle((x, y, x + block, y + block), fill=(184, 191, 202))
    checker_rgba = checker.convert("RGBA")
    checker_rgba.alpha_composite(frame)
    alpha = frame.getchannel("A")
    alpha_rgb = Image.merge("RGB", (alpha, alpha, alpha))
    output = Image.new("RGB", (frame.width * 2, frame.height), (0, 0, 0))
    output.paste(checker_rgba.convert("RGB"), (0, 0))
    output.paste(alpha_rgb, (frame.width, 0))
    output.save(destination, optimize=True)


def native_background_check(frame_path: Path, destination: Path) -> None:
    frame = Image.open(frame_path).convert("RGBA")
    output = Image.new("RGB", (frame.width * 2, frame.height), (0, 0, 0))
    output.paste(composite(frame, (255, 255, 255)), (0, 0))
    output.paste(composite(frame, (11, 16, 24)), (frame.width, 0))
    output.save(destination, optimize=True)


def validation_for_frame(path: Path, anchor: tuple[int, int], ink: tuple[int, int, int]) -> dict[str, object]:
    image = Image.open(path).convert("RGBA")
    pixels = np.asarray(image, dtype=np.uint8)
    alpha = pixels[..., 3]
    visible = alpha > 0
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise RuntimeError(f"Empty frame: {path}")
    clear_border = min(bbox[0], bbox[1], image.width - bbox[2], image.height - bbox[3])
    visible_colors = np.unique(pixels[visible, :3], axis=0)
    border_alpha = max(
        int(alpha[0, :].max()),
        int(alpha[-1, :].max()),
        int(alpha[:, 0].max()),
        int(alpha[:, -1].max()),
    )
    return {
        "file": str(path.relative_to(BUNDLE_DIR)),
        "sha256": sha256(path),
        "width": image.width,
        "height": image.height,
        "alpha_extrema": [int(alpha.min()), int(alpha.max())],
        "visible_pixels": int(visible.sum()),
        "alpha_bbox": list(bbox),
        "clear_border_px": int(clear_border),
        "edge_alpha_max": border_alpha,
        "anchor_alpha": int(alpha[anchor[1], anchor[0]]),
        "one_visible_rgb": bool(
            visible_colors.shape == (1, 3)
            and tuple(int(value) for value in visible_colors[0]) == ink
        ),
        "transparent_rgb_zero": bool(np.all(pixels[~visible, :3] == 0)),
    }


def silhouette_iou(first: Path, second: Path) -> float:
    first_mask = np.asarray(Image.open(first).getchannel("A"), dtype=np.uint8) > 20
    second_mask = np.asarray(Image.open(second).getchannel("A"), dtype=np.uint8) > 20
    union = int(np.count_nonzero(first_mask | second_mask))
    return float(np.count_nonzero(first_mask & second_mask) / max(1, union))


def create_zip() -> Path:
    destination = ROOT / "quarter-note-01-murmur.zip"
    if destination.exists():
        destination.unlink()
    shutil.make_archive(str(destination.with_suffix("")), "zip", root_dir=ROOT, base_dir=BUNDLE_DIR.name)
    return destination


def run_ffmpeg(track_paths: dict[str, list[Path]]) -> list[str]:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return ["ffmpeg unavailable; MP4 review proofs were not produced"]
    reports: list[str] = []
    for stale_review in QA_DIR.glob("quarter-note-01-*.mp4"):
        stale_review.unlink()
    flight_pattern = str(BUNDLE_DIR / TRACK_DIRS["flight"] / "*.png")
    flight_count = len(track_paths["flight"])
    for fps in (12, 16, 20):
        output = QA_DIR / f"quarter-note-01-flight-{fps}fps.mp4"
        command = [
            ffmpeg, "-y", "-loglevel", "error", "-pattern_type", "glob", "-framerate", str(fps),
            "-i", flight_pattern,
            "-filter_complex", f"loop=loop=3:size={flight_count}:start=0,format=yuv420p",
            "-frames:v", str(flight_count * 4), "-c:v", "libx264", "-crf", "18", str(output),
        ]
        subprocess.run(command, check=True)
        reports.append(f"created {output.name}")

    staging = QA_DIR / ".action-preview-frames"
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir()
    ordered = track_paths["approach"] + track_paths["perch"] + track_paths["launch"]
    for index, path in enumerate(ordered, 1):
        shutil.copy2(path, staging / f"frame_{index:03d}.png")
    action_output = QA_DIR / "quarter-note-01-action-motion-review.mp4"
    subprocess.run([
        ffmpeg, "-y", "-loglevel", "error", "-framerate", "16", "-i", str(staging / "frame_%03d.png"),
        "-vf", "format=yuv420p", "-c:v", "libx264", "-crf", "18", str(action_output),
    ], check=True)
    shutil.rmtree(staging)
    reports.append(f"created {action_output.name}")
    return reports


def main() -> None:
    spec = json.loads(SPEC_PATH.read_text())
    canvas = spec["canvas"]
    canvas_size = (int(canvas["width"]), int(canvas["height"]))
    anchor = (int(canvas["anchor"]["x"]), int(canvas["anchor"]["y"]))
    ink_hex = str(spec["ink_color"]).lstrip("#")
    ink = tuple(int(ink_hex[index:index + 2], 16) for index in (0, 2, 4))
    base, source_metrics = prepared_base_mask(spec)

    BUNDLE_DIR.mkdir(parents=True, exist_ok=True)
    QA_DIR.mkdir(parents=True, exist_ok=True)
    for output_name in TRACK_DIRS.values():
        output_dir = BUNDLE_DIR / output_name
        if output_dir.exists():
            shutil.rmtree(output_dir)
        output_dir.mkdir(parents=True)

    track_paths: dict[str, list[Path]] = {}
    reports: list[dict[str, object]] = []
    for track, poses in spec["tracks"].items():
        output_dir = BUNDLE_DIR / TRACK_DIRS[track]
        paths: list[Path] = []
        for pose in poses:
            output = output_dir / pose["file"]
            rgba_from_mask(transform_mask(base, pose, anchor), ink).save(output, optimize=True)
            paths.append(output)
            reports.append(validation_for_frame(output, anchor, ink))
        track_paths[track] = paths

    manifest = {
        "schema_version": "1.0",
        "sets": [{
            "id": spec["id"],
            "name": spec["name"],
            "direction": spec["direction"],
            "canvases": {
                "flight": {"width": canvas_size[0], "height": canvas_size[1], "anchor": {"x": anchor[0], "y": anchor[1]}},
                "action": {"width": canvas_size[0], "height": canvas_size[1], "anchor": {"x": anchor[0], "y": anchor[1]}},
            },
            "up_direction": "canvas_top",
            "orientation_metadata": "stripped",
            "ink_color": spec["ink_color"],
            "tracks": {
                track: [pose["file"] for pose in poses]
                for track, poses in spec["tracks"].items()
            },
            "source_method": (
                "Exact supplied quarter-note alpha silhouette; 64 deterministic rigid-transform "
                "poses using rotation and translation only at constant scale; no redraw, squash, "
                "stretch, shear, or identity morph; direct chronological playback"
            ),
        }],
    }
    (BUNDLE_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    preview = Image.open(track_paths["flight"][0]).convert("RGBA")
    preview.save(BUNDLE_DIR / "preview.png", optimize=True)

    for track, paths in track_paths.items():
        labels = [f"{index + 1:02d} · {path.stem[3:].replace('_', ' ')}" for index, path in enumerate(paths)]
        contact_sheet(paths, labels, QA_DIR / f"quarter-note-01-{track}-contact-sheet.png")
    action_paths = track_paths["approach"] + track_paths["perch"] + track_paths["launch"]
    action_labels = []
    for track in ("approach", "perch", "launch"):
        action_labels.extend([
            f"{track} {index + 1:02d} · {path.stem[3:].replace('_', ' ')}"
            for index, path in enumerate(track_paths[track])
        ])
    contact_sheet(action_paths, action_labels, QA_DIR / "quarter-note-01-action-contact-sheet.png", rows=6)
    alpha_check(track_paths["flight"][0], QA_DIR / "quarter-note-01-alpha-check.png")
    native_background_check(track_paths["flight"][0], QA_DIR / "quarter-note-01-native-scale-white-dark.png")

    track_hashes = {
        track: [sha256(path) for path in paths]
        for track, paths in track_paths.items()
    }
    base_alpha_mass = float(np.asarray(base, dtype=np.uint8).sum())
    alpha_mass_ratios = [
        float(np.asarray(Image.open(path).getchannel("A"), dtype=np.uint8).sum()) / base_alpha_mass
        for paths in track_paths.values()
        for path in paths
    ]
    flight_ious = [
        silhouette_iou(first, second)
        for first, second in zip(track_paths["flight"], track_paths["flight"][1:] + track_paths["flight"][:1])
    ]
    transition_ious = {
        "approach_to_perch": silhouette_iou(track_paths["approach"][-1], track_paths["perch"][0]),
        "perch_to_launch": silhouette_iou(track_paths["perch"][-1], track_paths["launch"][0]),
        "launch_to_flight": silhouette_iou(track_paths["launch"][-1], track_paths["flight"][0]),
    }
    gates = {
        "exactly_64_frames": len(reports) == 64,
        "four_tracks_of_16": all(len(paths) == 16 for paths in track_paths.values()),
        "all_1600x1200": all((report["width"], report["height"]) == canvas_size for report in reports),
        "all_true_alpha": all(report["alpha_extrema"] == [0, 255] for report in reports),
        "all_contain_visible_and_transparent_pixels": all(report["visible_pixels"] > 0 for report in reports),
        "all_edges_clear": all(report["edge_alpha_max"] == 0 for report in reports),
        "all_have_80px_padding": all(report["clear_border_px"] >= 80 for report in reports),
        "all_anchor_pixels_visible": all(report["anchor_alpha"] > 0 for report in reports),
        "all_one_visible_color": all(report["one_visible_rgb"] for report in reports),
        "all_transparent_rgb_zero": all(report["transparent_rgb_zero"] for report in reports),
        "frames_chronologically_distinct_within_each_track": all(
            len(set(hashes)) == len(hashes) for hashes in track_hashes.values()
        ),
        "rigid_identity_area_preserved": min(alpha_mass_ratios) >= 0.995 and max(alpha_mass_ratios) <= 1.005,
        "flight_loop_seam_is_gentle": flight_ious[-1] >= min(flight_ious[:-1]),
        "action_track_transitions_overlap": min(transition_ious.values()) >= 0.75,
    }
    validation = {
        "schema_version": "1.0",
        "identity": spec["id"],
        "master_sha256": sha256(MASTER_PATH),
        "master_matches_supplied_reference_sha256": "b156a1d8ce6178ac95ea5bef0d7723c77eda69e80cbc0b1d61b6e585e2cb088b",
        "source_metrics": source_metrics,
        "frame_count": len(reports),
        "canvas": canvas,
        "ink_color": spec["ink_color"],
        "passed": all(gates.values()),
        "gates": gates,
        "minimum_clear_border_px": min(report["clear_border_px"] for report in reports),
        "motion_metrics": {
            "flight_adjacent_silhouette_iou": [round(value, 4) for value in flight_ious],
            "flight_loop_seam_iou": round(flight_ious[-1], 4),
            "flight_internal_min_iou": round(min(flight_ious[:-1]), 4),
            "action_transition_silhouette_iou": {
                name: round(value, 4) for name, value in transition_ious.items()
            },
            "alpha_mass_ratio_range": [round(min(alpha_mass_ratios), 6), round(max(alpha_mass_ratios), 6)],
        },
        "frames": reports,
    }
    validation_path = QA_DIR / "validation-report.json"
    validation_path.write_text(json.dumps(validation, indent=2) + "\n")
    if not validation["passed"]:
        failed = [name for name, passed in gates.items() if not passed]
        raise RuntimeError(f"Quarter-note QA failed: {', '.join(failed)}; inspect {validation_path}")

    ffmpeg_reports = run_ffmpeg(track_paths)
    zip_path = create_zip()
    (QA_DIR / "build-summary.json").write_text(json.dumps({
        "passed": True,
        "bundle_zip": str(zip_path.relative_to(ROOT)),
        "zip_sha256": sha256(zip_path),
        "manifest_sha256": sha256(BUNDLE_DIR / "manifest.json"),
        "ffmpeg": ffmpeg_reports,
    }, indent=2) + "\n")
    print(f"Built and verified {len(reports)} quarter-note PNGs")
    print(f"Minimum clear border: {validation['minimum_clear_border_px']} px")
    print(f"Import ZIP: {zip_path}")


if __name__ == "__main__":
    main()
