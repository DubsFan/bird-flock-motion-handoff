#!/usr/bin/env python3
"""Build verified Murmur runtime sprites from generated blue-ink pose sheets."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


CANVAS = (1600, 1200)
DEST_ANCHOR = (800, 620)


def ink_alpha(image: Image.Image) -> np.ndarray:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    # Generated sources use blue ink on either neutral checkerboard or chroma
    # magenta. Blue-minus-red isolates the authored linework from both.
    score = rgb[..., 2] - rgb[..., 0]
    return np.clip((score - 0.008) / 0.34, 0.0, 1.0)


def ordered_objects(alpha: np.ndarray, expected: int, rows: int) -> list[dict[str, object]]:
    if expected % rows:
        raise RuntimeError(f"Expected pose count {expected} must divide evenly across {rows} rows")
    columns = expected // rows
    height, width = alpha.shape
    labels, _ = ndimage.label(ndimage.binary_dilation(alpha > 0.05, iterations=2))
    groups: list[list[int]] = [[] for _ in range(expected)]
    slices_by_id = ndimage.find_objects(labels)
    for ident, slices in enumerate(slices_by_id, 1):
        if slices is None:
            continue
        component = labels[slices] == ident
        if int(component.sum()) < 8:
            continue
        ys, xs = slices
        center_x = (xs.start + xs.stop) / 2
        center_y = (ys.start + ys.stop) / 2
        column = min(columns - 1, max(0, int(center_x * columns / width)))
        row = min(rows - 1, max(0, int(center_y * rows / height)))
        groups[row * columns + column].append(ident)

    objects: list[dict[str, object]] = []
    for index, ids in enumerate(groups):
        if not ids:
            raise RuntimeError(f"Missing pose in grid cell {index + 1}")
        slices = [slices_by_id[ident - 1] for ident in ids]
        y0 = min(item[0].start for item in slices if item is not None)
        y1 = max(item[0].stop for item in slices if item is not None)
        x0 = min(item[1].start for item in slices if item is not None)
        x1 = max(item[1].stop for item in slices if item is not None)
        objects.append({
            "bbox": (x0, y0, x1, y1),
            "component": np.isin(labels[y0:y1, x0:x1], ids),
        })
    return objects


def body_anchor(alpha: np.ndarray, direction: str, strategy: str = "density") -> tuple[float, float]:
    """Pin the rigid head/shoulder mass, never the changing wing extent.

    The old global density maximum regularly landed on a feather fan.  For a
    side-profile animal the head is the stable, direction-aware dense region;
    constraining the search to the forward part of the silhouette keeps the
    route anchor fixed while the wings change shape around it.
    """
    mask = alpha > 0.08
    ys, xs = np.where(mask)
    if not len(xs):
        raise RuntimeError("Cannot anchor an empty pose")
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    width = max(1, x1 - x0)
    height = max(1, y1 - y0)
    if strategy == "front":
        # A beak/muzzle landmark is more reliable than density for broad solid
        # wings and membranes. Use the forward contour itself, then take the
        # median vertical position of that narrow head strip.
        if direction == "right":
            front = float(np.quantile(xs, 0.965))
            selected = xs >= front - width * 0.025
        elif direction == "left":
            front = float(np.quantile(xs, 0.035))
            selected = xs <= front + width * 0.025
        else:
            raise RuntimeError("Front landmark anchoring requires left or right direction")
        return front, float(np.median(ys[selected]))
    if strategy != "density":
        raise RuntimeError(f"Unknown body anchor strategy: {strategy}")
    density = ndimage.gaussian_filter(alpha, sigma=max(3.0, min(width, height) * 0.022))
    allowed = np.zeros_like(mask)
    if direction == "right":
        allowed[y0 + round(height * 0.12):y1 - round(height * 0.08), x0 + round(width * 0.56):x1] = True
    elif direction == "left":
        allowed[y0 + round(height * 0.12):y1 - round(height * 0.08), x0:x1 - round(width * 0.56)] = True
    else:
        allowed[y0:y1, x0:x1] = True
    density = np.where(allowed, density, -1.0)
    y, x = np.unravel_index(int(np.argmax(density)), density.shape)
    return float(x), float(y)


def contact_anchor(
    alpha: np.ndarray,
    edge: str = "bottom",
    x_range: tuple[float, float] | None = None,
) -> tuple[float, float]:
    """Find the authored foot/tarsus or roost contact on a silhouette edge."""
    ys, xs = np.where(alpha > 0.12)
    if not len(xs):
        raise RuntimeError("Cannot contact-anchor an empty pose")
    if x_range is not None:
        x0, x1 = float(xs.min()), float(xs.max())
        width = max(1.0, x1 - x0)
        within = (xs >= x0 + width * x_range[0]) & (xs <= x0 + width * x_range[1])
        if int(np.count_nonzero(within)) >= 8:
            ys, xs = ys[within], xs[within]
    if edge == "top":
        limit = np.quantile(ys, 0.018)
        selected = ys <= limit + 2
        y = float(ys[selected].min())
    else:
        limit = np.quantile(ys, 0.982)
        selected = ys >= limit - 2
        y = float(ys[selected].max())
    return float(np.median(xs[selected])), y


def render_track(source_dir: Path, output_dir: Path, ink: tuple[int, int, int], spec: dict[str, object]) -> list[dict[str, object]]:
    names = list(spec["frames"])
    rows = int(spec["rows"])
    sheet_names = list(spec.get("sheets", [spec.get("sheet")]))
    if not sheet_names or any(name is None for name in sheet_names):
        raise RuntimeError(f"Track {spec['output']} must declare sheet or sheets")
    if len(names) % len(sheet_names):
        raise RuntimeError(f"Track {spec['output']} frame count must divide evenly across its sheets")
    per_sheet = len(names) // len(sheet_names)
    sources: list[list[tuple[np.ndarray, dict[str, object]]]] = []
    for sheet_name in sheet_names:
        alpha = ink_alpha(Image.open(source_dir / str(sheet_name)).convert("RGB"))
        sources.append([(alpha, item) for item in ordered_objects(alpha, per_sheet, rows)])
    poses = [pose for group in zip(*sources) for pose in group] if spec.get("interleave") else [pose for source in sources for pose in source]
    spans = [max(item["bbox"][2] - item["bbox"][0], item["bbox"][3] - item["bbox"][1]) for _, item in poses]
    scale = float(spec.get("target_span", 820)) / float(np.median(spans))
    scale_overrides = list(spec.get("scale_overrides", [1.0] * len(names)))
    output_offsets = list(spec.get("output_offsets", [[0.0, 0.0]] * len(names)))
    if len(scale_overrides) != len(names) or len(output_offsets) != len(names):
        raise RuntimeError(f"Track {spec['output']} scale/offset overrides must match frame count")
    contact_offset = tuple(float(value) for value in spec.get("contact_offset", [0.0, 0.28]))
    mode = str(spec["anchor_mode"])
    dest_anchor = tuple(int(value) for value in spec.get("dest_anchor", DEST_ANCHOR))
    track_dir = output_dir / str(spec["output"])
    track_dir.mkdir(parents=True, exist_ok=True)
    report: list[dict[str, object]] = []

    for index, (name, (alpha, item)) in enumerate(zip(names, poses)):
        item_x0, item_y0, item_x1, item_y1 = item["bbox"]
        pad = 5
        x0 = max(0, item_x0 - pad)
        y0 = max(0, item_y0 - pad)
        x1 = min(alpha.shape[1], item_x1 + pad)
        y1 = min(alpha.shape[0], item_y1 + pad)
        component = np.pad(
            item["component"],
            (
                (item_y0 - y0, y1 - item_y1),
                (item_x0 - x0, x1 - item_x1),
            ),
            constant_values=False,
        )
        pose_alpha = alpha[y0:y1, x0:x1] * component
        bx, by = body_anchor(
            pose_alpha,
            str(spec.get("direction", "right")),
            str(spec.get("body_anchor_strategy", "density")),
        )
        declared_x_range = spec.get("contact_x_range")
        x_range = tuple(float(value) for value in declared_x_range) if declared_x_range is not None else None
        cx, cy = contact_anchor(pose_alpha, str(spec.get("contact_edge", "bottom")), x_range)
        cx += contact_offset[0] * pose_alpha.shape[1]
        cy += contact_offset[1] * pose_alpha.shape[0]
        if mode == "body":
            anchor = (bx, by)
        elif mode == "contact":
            anchor = (cx, cy)
        elif mode == "approach":
            blend = max(0.0, min(1.0, (index - 3) / max(1, len(names) - 4)))
            anchor = (bx + (cx - bx) * blend, by + (cy - by) * blend)
        elif mode == "launch":
            blend = max(0.0, min(1.0, 1.0 - index / 3.0))
            anchor = (bx + (cx - bx) * blend, by + (cy - by) * blend)
        else:
            raise RuntimeError(f"Unknown anchor mode: {mode}")

        rgba = np.zeros((*pose_alpha.shape, 4), dtype=np.uint8)
        rgba[..., 0] = ink[0]
        rgba[..., 1] = ink[1]
        rgba[..., 2] = ink[2]
        rgba[..., 3] = np.round(pose_alpha * 255).astype(np.uint8)
        art = Image.fromarray(rgba, "RGBA")
        frame_scale = scale * float(scale_overrides[index])
        art = art.resize((round(art.width * frame_scale), round(art.height * frame_scale)), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        dx, dy = (float(value) for value in output_offsets[index])
        canvas.alpha_composite(art, (
            round(dest_anchor[0] - anchor[0] * frame_scale + dx),
            round(dest_anchor[1] - anchor[1] * frame_scale + dy),
        ))
        pixels = np.asarray(canvas).copy()
        visible = pixels[..., 3] > 0
        pixels[~visible, :3] = 0
        pixels[visible, 0] = ink[0]
        pixels[visible, 1] = ink[1]
        pixels[visible, 2] = ink[2]
        canvas = Image.fromarray(pixels, "RGBA")
        path = track_dir / str(name)
        canvas.save(path, optimize=True)
        frame_alpha = canvas.getchannel("A")
        visible_colors = np.unique(pixels[visible, :3], axis=0)
        report.append({
            "file": f"{spec['output']}/{name}",
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "alpha_extrema": list(frame_alpha.getextrema()),
            "alpha_bbox": list(frame_alpha.getbbox() or (0, 0, 0, 0)),
            "clear_border": min(
                (frame_alpha.getbbox() or (0, 0, CANVAS[0], CANVAS[1]))[0],
                (frame_alpha.getbbox() or (0, 0, CANVAS[0], CANVAS[1]))[1],
                CANVAS[0] - (frame_alpha.getbbox() or (0, 0, CANVAS[0], CANVAS[1]))[2],
                CANVAS[1] - (frame_alpha.getbbox() or (0, 0, CANVAS[0], CANVAS[1]))[3],
            ),
            "edge_alpha_max": max(
                frame_alpha.crop((0, 0, CANVAS[0], 1)).getextrema()[1],
                frame_alpha.crop((0, CANVAS[1] - 1, CANVAS[0], CANVAS[1])).getextrema()[1],
                frame_alpha.crop((0, 0, 1, CANVAS[1])).getextrema()[1],
                frame_alpha.crop((CANVAS[0] - 1, 0, CANVAS[0], CANVAS[1])).getextrema()[1],
            ),
            "visible_rgb_colors": visible_colors.tolist(),
            "one_visible_color": visible_colors.shape == (1, 3) and tuple(visible_colors[0]) == ink,
            "transparent_rgb_zero": bool(np.all(pixels[~visible, :3] == 0)),
            "visible_white_pixels": int(np.count_nonzero(np.all(pixels[visible, :3] == 255, axis=1))),
        })
    return report


def make_preview(output_dir: Path, first_frame: Path) -> None:
    image = Image.open(first_frame).convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError("Preview source is empty")
    left, top, right, bottom = bbox
    pad = 28
    image.crop((max(0, left - pad), max(0, top - pad), min(image.width, right + pad), min(image.height, bottom + pad))).save(output_dir / "preview.png", optimize=True)


def make_contact_sheet(output_dir: Path, tracks: list[dict[str, object]], destination: Path) -> None:
    frames = [(str(track["output"]), output_dir / str(track["output"]) / str(name)) for track in tracks for name in track["frames"]]
    thumb = (240, 180)
    columns = 8
    rows = (len(frames) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * thumb[0], rows * (thumb[1] + 22)), (20, 25, 32))
    draw = ImageDraw.Draw(sheet)
    for index, (track, path) in enumerate(frames):
        image = Image.open(path).convert("RGBA")
        background = Image.new("RGBA", CANVAS, (244, 241, 235, 255))
        background.alpha_composite(image)
        tile = background.convert("RGB").resize(thumb, Image.Resampling.LANCZOS)
        x = index % columns * thumb[0]
        y = index // columns * (thumb[1] + 22)
        sheet.paste(tile, (x, y))
        draw.text((x + 5, y + thumb[1] + 3), f"{track} {index + 1}", fill=(235, 235, 235))
    sheet.save(destination, quality=92)


def make_flight_review_sheet(output_dir: Path, track: dict[str, object], destination: Path) -> None:
    names = list(track["frames"])
    tile = (400, 300)
    columns = 4
    rows = (len(names) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * tile[0], rows * (tile[1] + 30)), (20, 25, 32))
    draw = ImageDraw.Draw(sheet)
    for index, name in enumerate(names):
        image = Image.open(output_dir / "flight" / str(name)).convert("RGBA")
        background = Image.new("RGBA", CANVAS, (244, 241, 235, 255))
        background.alpha_composite(image)
        rendered = background.convert("RGB").resize(tile, Image.Resampling.LANCZOS)
        x = index % columns * tile[0]
        y = index // columns * (tile[1] + 30)
        sheet.paste(rendered, (x, y))
        draw.text((x + 8, y + tile[1] + 6), f"{index + 1:02d} · {name}", fill=(235, 235, 235))
    sheet.save(destination, quality=94)


def validate_motion(spec: dict[str, object], output_dir: Path) -> dict[str, object]:
    """Enforce temporal/semantic gates that static PNG validation cannot see."""
    tracks = {str(track["output"]): track for track in spec["tracks"]}
    direction = str(spec["direction"])

    def alpha(track: str, name: str) -> np.ndarray:
        return np.asarray(Image.open(output_dir / track / name).getchannel("A"), dtype=np.float32) / 255.0

    def destination(track: dict[str, object]) -> np.ndarray:
        return np.asarray(track.get("dest_anchor", DEST_ANCHOR), dtype=np.float32)

    def body_residual(track: dict[str, object], name: str) -> float:
        point = np.asarray(body_anchor(alpha(str(track["output"]), name), direction), dtype=np.float32)
        return float(np.linalg.norm(point - destination(track)))

    def contact_residual(track: dict[str, object], name: str) -> float:
        declared = track.get("contact_x_range")
        x_range = tuple(float(value) for value in declared) if declared is not None else None
        point = np.asarray(
            contact_anchor(alpha(str(track["output"]), name), str(track.get("contact_edge", "bottom")), x_range),
            dtype=np.float32,
        )
        return float(np.linalg.norm(point - destination(track)))

    flight = tracks["flight"]
    flight_names = list(flight["frames"])
    flight_masks = [alpha("flight", name) > 0.12 for name in flight_names]
    flight_anchor_residuals = [body_residual(flight, name) for name in flight_names]
    adjacent_ious: list[float] = []
    for first, second in zip(flight_masks, flight_masks[1:] + flight_masks[:1]):
        union = int(np.count_nonzero(first | second))
        adjacent_ious.append(float(np.count_nonzero(first & second) / max(1, union)))
    internal_min = min(adjacent_ious[:-1]) if len(adjacent_ious) > 1 else adjacent_ious[-1]
    seam_iou = adjacent_ious[-1]

    perch = tracks["perch"]
    perch_names = list(perch["frames"])
    if str(perch["anchor_mode"]) == "contact":
        perch_residuals = [contact_residual(perch, name) for name in perch_names]
        perch_gate = max(perch_residuals) <= 5.0
        perch_metric = "contact_anchor_max_px"
    else:
        perch_residuals = [body_residual(perch, name) for name in perch_names]
        perch_gate = max(perch_residuals) <= 12.0
        perch_metric = "body_anchor_max_px"

    approach = tracks["approach"]
    launch = tracks["launch"]
    approach_names = list(approach["frames"])
    launch_names = list(launch["frames"])
    approach_start = body_residual(approach, approach_names[0])
    approach_end = (
        body_residual(approach, approach_names[-1])
        if str(approach["anchor_mode"]) == "body"
        else contact_residual(approach, approach_names[-1])
    )
    launch_start = (
        body_residual(launch, launch_names[0])
        if str(launch["anchor_mode"]) == "body"
        else contact_residual(launch, launch_names[0])
    )
    launch_end = body_residual(launch, launch_names[-1])

    gates = {
        "flight_frame_count_8_to_16": 8 <= len(flight_names) <= 16,
        "all_action_tracks_have_8_frames": all(len(list(tracks[name]["frames"])) == 8 for name in ("approach", "perch", "launch")),
        "flight_body_anchor_within_12px": max(flight_anchor_residuals) <= 12.0,
        "perch_or_hover_anchor_within_limit": perch_gate,
        "approach_starts_on_body_anchor": approach_start <= 12.0,
        "approach_finishes_on_landing_anchor": approach_end <= (12.0 if str(approach["anchor_mode"]) == "body" else 5.0),
        "launch_starts_on_landing_anchor": launch_start <= (12.0 if str(launch["anchor_mode"]) == "body" else 5.0),
        "launch_finishes_on_body_anchor": launch_end <= 12.0,
        "no_duplicate_or_near_duplicate_flight_neighbors": max(adjacent_ious) < 0.97,
        "flight_loop_seam_has_overlap": seam_iou >= 0.25,
        "flight_loop_seam_not_worse_than_internal_motion": seam_iou >= internal_min - 0.02,
    }
    return {
        "species": spec["id"],
        "passed": all(gates.values()),
        "gates": gates,
        "metrics": {
            "flight_frame_count": len(flight_names),
            "flight_body_anchor_max_px": round(max(flight_anchor_residuals), 3),
            "flight_adjacent_silhouette_iou": [round(value, 4) for value in adjacent_ious],
            "flight_loop_seam_iou": round(seam_iou, 4),
            "flight_internal_min_iou": round(internal_min, 4),
            perch_metric: round(max(perch_residuals), 3),
            "approach_start_body_residual_px": round(approach_start, 3),
            "approach_end_anchor_residual_px": round(approach_end, 3),
            "launch_start_anchor_residual_px": round(launch_start, 3),
            "launch_end_body_residual_px": round(launch_end, 3),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    spec = json.loads((args.source_dir / "motion-spec.json").read_text())
    args.output_dir.mkdir(parents=True, exist_ok=True)
    ink_hex = str(spec["ink_color"]).lstrip("#")
    ink = tuple(int(ink_hex[index:index + 2], 16) for index in (0, 2, 4))
    report = []
    for track in spec["tracks"]:
        report.extend(render_track(args.source_dir, args.output_dir, ink, track))
    manifest = {
        "schema_version": "1.0",
        "sets": [{
            "id": spec["id"],
            "name": spec["name"],
            "direction": spec["direction"],
            "canvases": {
                "flight": {"width": 1600, "height": 1200, "anchor": {"x": 800, "y": 620}},
                "action": {
                    "width": 1600,
                    "height": 1200,
                    "anchor": {
                        "x": int(spec["tracks"][1].get("dest_anchor", DEST_ANCHOR)[0]),
                        "y": int(spec["tracks"][1].get("dest_anchor", DEST_ANCHOR)[1]),
                    },
                },
            },
            "up_direction": "canvas_top",
            "orientation_metadata": "stripped",
            "ink_color": spec["ink_color"],
            "tracks": {track["output"]: track["frames"] for track in spec["tracks"]},
            "source_method": spec["source_method"],
        }],
    }
    (args.output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    make_preview(args.output_dir, args.output_dir / "flight" / spec["tracks"][0]["frames"][0])
    qa = {
        "species": spec["id"],
        "frame_count": len(report),
        "ink_color": spec["ink_color"],
        "all_true_alpha": all(item["alpha_extrema"] == [0, 255] for item in report),
        "all_edges_clear": all(item["edge_alpha_max"] == 0 for item in report),
        "all_borders_clear": all(item["clear_border"] >= 64 for item in report),
        "all_one_visible_color": all(item["one_visible_color"] for item in report),
        "all_transparent_rgb_zero": all(item["transparent_rgb_zero"] for item in report),
        "no_visible_white_fill": all(item["visible_white_pixels"] == 0 for item in report),
        "frames": report,
    }
    qa_path = args.source_dir / "runtime-validation.json"
    qa_path.write_text(json.dumps(qa, indent=2) + "\n")
    make_contact_sheet(args.output_dir, spec["tracks"], args.source_dir / "runtime-contact-sheet.jpg")
    make_flight_review_sheet(args.output_dir, spec["tracks"][0], args.source_dir / "runtime-flight-review-sheet.jpg")
    motion_qa = validate_motion(spec, args.output_dir)
    motion_qa_path = args.source_dir / "motion-validation.json"
    motion_qa_path.write_text(json.dumps(motion_qa, indent=2) + "\n")
    if not all(qa[key] for key in (
        "all_true_alpha",
        "all_edges_clear",
        "all_borders_clear",
        "all_one_visible_color",
        "all_transparent_rgb_zero",
        "no_visible_white_fill",
    )):
        raise RuntimeError(f"Runtime validation failed; inspect {qa_path}")
    if not motion_qa["passed"]:
        raise RuntimeError(f"Motion validation failed; inspect {motion_qa_path}")
    print(f"Built {len(report)} verified frames for {spec['id']}")


if __name__ == "__main__":
    main()
