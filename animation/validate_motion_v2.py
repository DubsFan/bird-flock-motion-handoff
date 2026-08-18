#!/usr/bin/env python3
"""Strict, fail-closed validation for authored RGBA motion frames.

Unlike the legacy validator, this script never derives a body anchor or body
scale from the rendered silhouette.  Those values must be authored explicitly
and protected by per-frame hashes in a metadata file.

Metadata schema (paths are relative to the metadata file)::

    {
      "schema_version": "2.0",
      "authored": true,
      "visible_rgb": [13, 81, 179],
      "minimum_clear_border_px": 64,
      "landmark_tolerance_px": 4.0,
      "adjacent_scale_ratio_limit": 1.08,
      "track_scale_ratio_limit": 1.12,
      "frames": [
        {
          "file": "baked-flight/01_crow_rig_flight.png",
          "sha256": "...",
          "body_landmark_px": [800.0, 620.0],
          "body_scale_px": 420.0
        }
      ],
      "evidence": [
        {
          "file": "../../../../../evidence/example.webm",
          "frame_sha256": ["...", "..."]
        }
      ]
    }

Evidence with ``frame_sha256`` passes only when that ordered list exactly
matches the current authored frames. Evidence without hash provenance falls
back to an mtime check and is reported as the weaker ``mtime`` method.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from PIL import Image


SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


@dataclass(frozen=True)
class Gate:
    name: str
    passed: bool
    detail: str

    def as_dict(self) -> dict[str, object]:
        return {"name": self.name, "passed": self.passed, "detail": self.detail}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def natural_key(path: Path) -> tuple[object, ...]:
    return tuple(int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", path.name))


def resolve_path(value: str, base: Path) -> Path:
    candidate = Path(value).expanduser()
    return candidate.resolve() if candidate.is_absolute() else (base / candidate).resolve()


def parse_rgb(value: object) -> tuple[int, int, int] | None:
    if not isinstance(value, list) or len(value) != 3:
        return None
    if not all(isinstance(channel, int) and not isinstance(channel, bool) and 0 <= channel <= 255 for channel in value):
        return None
    return tuple(value)  # type: ignore[return-value]


def parse_point(value: object) -> tuple[float, float] | None:
    if isinstance(value, dict):
        value = [value.get("x"), value.get("y")]
    if not isinstance(value, list) or len(value) != 2:
        return None
    if not all(isinstance(item, (int, float)) and not isinstance(item, bool) and math.isfinite(float(item)) for item in value):
        return None
    return float(value[0]), float(value[1])


def finite_positive(value: object) -> float | None:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return None
    number = float(value)
    return number if math.isfinite(number) and number > 0 else None


def inspect_frame(path: Path, expected_rgb: tuple[int, int, int] | None, minimum_border: int) -> tuple[dict[str, object], list[Gate]]:
    result: dict[str, object] = {
        "file": str(path),
        "sha256": sha256(path),
        "bytes": path.stat().st_size,
        "mtime_ns": path.stat().st_mtime_ns,
    }
    gates: list[Gate] = []
    try:
        with Image.open(path) as source:
            result["format"] = source.format
            result["mode"] = source.mode
            result["size"] = list(source.size)
            exact_rgba = source.format == "PNG" and source.mode == "RGBA" and len(source.getbands()) == 4
            gates.append(Gate("exact_png_rgba8", exact_rgba, f"format={source.format!r}, mode={source.mode!r}, bands={source.getbands()}"))
            if not exact_rgba:
                return result, gates

            image = source.copy()
    except Exception as exc:
        gates.append(Gate("image_decodes", False, f"{type(exc).__name__}: {exc}"))
        return result, gates

    alpha = image.getchannel("A")
    alpha_extrema = alpha.getextrema()
    bbox = alpha.getbbox()
    result["alpha_extrema"] = list(alpha_extrema)
    result["alpha_bbox"] = list(bbox) if bbox else None
    gates.append(Gate("nonempty_true_alpha", bbox is not None and alpha_extrema == (0, 255), f"alpha_extrema={alpha_extrema}, bbox={bbox}"))

    if bbox is None:
        result.update({"clear_border_px": 0, "edge_alpha_max": 0, "visible_rgb": []})
        gates.append(Gate("clear_border", False, "frame has no visible pixels"))
        gates.append(Gate("one_visible_rgb", False, "frame has no visible pixels"))
        return result, gates

    width, height = image.size
    left, top, right, bottom = bbox
    clear_border = min(left, top, width - right, height - bottom)
    edge_alpha_max = max(
        alpha.crop((0, 0, width, 1)).getextrema()[1],
        alpha.crop((0, height - 1, width, height)).getextrema()[1],
        alpha.crop((0, 0, 1, height)).getextrema()[1],
        alpha.crop((width - 1, 0, width, height)).getextrema()[1],
    )
    result["clear_border_px"] = clear_border
    result["edge_alpha_max"] = edge_alpha_max
    gates.append(Gate(
        "clear_border",
        clear_border >= minimum_border and edge_alpha_max == 0,
        f"clear={clear_border}px, required={minimum_border}px, edge_alpha_max={edge_alpha_max}",
    ))

    colors: set[tuple[int, int, int]] = set()
    transparent_rgb_zero = True
    pixel_data = image.get_flattened_data() if hasattr(image, "get_flattened_data") else image.getdata()
    for red, green, blue, opacity in pixel_data:
        color = (red, green, blue)
        if opacity:
            colors.add(color)
        elif color != (0, 0, 0):
            transparent_rgb_zero = False
        if len(colors) > 1 and not transparent_rgb_zero:
            # Both conclusions are already fixed; avoid needless set growth.
            break

    ordered_colors = sorted(colors)
    result["visible_rgb"] = [list(color) for color in ordered_colors]
    result["transparent_rgb_zero"] = transparent_rgb_zero
    color_pass = len(colors) == 1 and (expected_rgb is None or next(iter(colors)) == expected_rgb)
    detail = f"colors={[list(color) for color in ordered_colors]}"
    if expected_rgb is not None:
        detail += f", expected={list(expected_rgb)}"
    gates.append(Gate("one_visible_rgb", color_pass, detail))
    gates.append(Gate("transparent_rgb_zero", transparent_rgb_zero, "RGB must be zero wherever alpha is zero"))
    return result, gates


def validate_metadata(
    metadata: dict[str, object] | None,
    metadata_path: Path | None,
    frames: list[Path],
    frame_reports: list[dict[str, object]],
) -> tuple[list[Gate], dict[str, object], list[str], list[dict[str, object]]]:
    gates: list[Gate] = []
    metrics: dict[str, object] = {}
    current_hashes = [str(report["sha256"]) for report in frame_reports]
    evidence_specs: list[dict[str, object]] = []
    if metadata is None or metadata_path is None:
        gates.extend([
            Gate("authored_metadata_present", False, "no --metadata file supplied"),
            Gate("frame_hashes_match_authored_metadata", False, "cannot authenticate frames without authored metadata"),
            Gate("explicit_body_landmarks", False, "cannot validate body stability without authored landmarks"),
            Gate("explicit_body_scales", False, "cannot validate body scale without authored measurements"),
        ])
        return gates, metrics, current_hashes, evidence_specs

    gates.append(Gate("authored_metadata_present", True, str(metadata_path)))
    gates.append(Gate(
        "metadata_schema_v2",
        metadata.get("schema_version") == "2.0" and metadata.get("authored") is True,
        f"schema_version={metadata.get('schema_version')!r}, authored={metadata.get('authored')!r}",
    ))
    raw_frames = metadata.get("frames")
    if not isinstance(raw_frames, list):
        gates.extend([
            Gate("frame_hashes_match_authored_metadata", False, "metadata.frames must be an ordered array"),
            Gate("explicit_body_landmarks", False, "metadata.frames unavailable"),
            Gate("explicit_body_scales", False, "metadata.frames unavailable"),
        ])
        return gates, metrics, current_hashes, evidence_specs

    base = metadata_path.parent
    records = [item for item in raw_frames if isinstance(item, dict)]
    declared_paths: list[Path] = []
    path_errors: list[str] = []
    for index, record in enumerate(records):
        value = record.get("file")
        if not isinstance(value, str) or not value:
            path_errors.append(f"frames[{index}].file missing")
            continue
        declared_paths.append(resolve_path(value, base))
    same_files = len(records) == len(raw_frames) and declared_paths == frames
    if not same_files:
        path_errors.append("metadata frame order/set does not exactly match scanned frames")
    gates.append(Gate("metadata_exact_frame_set", same_files, "; ".join(path_errors) if path_errors else f"{len(frames)} ordered frames"))

    hash_errors: list[str] = []
    for index, (record, actual) in enumerate(zip(records, current_hashes)):
        expected = record.get("sha256")
        if not isinstance(expected, str) or not SHA256_RE.fullmatch(expected):
            hash_errors.append(f"frame {index + 1}: invalid/missing sha256")
        elif expected != actual:
            hash_errors.append(f"frame {index + 1}: expected {expected}, got {actual}")
    hashes_match = same_files and len(records) == len(current_hashes) and not hash_errors
    gates.append(Gate("frame_hashes_match_authored_metadata", hashes_match, "; ".join(hash_errors) if hash_errors else f"{len(current_hashes)} hashes match"))

    points: list[tuple[float, float]] = []
    point_errors: list[str] = []
    scales: list[float] = []
    scale_errors: list[str] = []
    for index, (record, report) in enumerate(zip(records, frame_reports)):
        point = parse_point(record.get("body_landmark_px"))
        size = report.get("size")
        if point is None:
            point_errors.append(f"frame {index + 1}: body_landmark_px missing/invalid")
        elif not isinstance(size, list) or not (0 <= point[0] < float(size[0]) and 0 <= point[1] < float(size[1])):
            point_errors.append(f"frame {index + 1}: landmark {point} outside canvas")
        else:
            points.append(point)
        scale = finite_positive(record.get("body_scale_px"))
        if scale is None:
            scale_errors.append(f"frame {index + 1}: body_scale_px missing/invalid")
        else:
            scales.append(scale)

    landmark_limit = finite_positive(metadata.get("landmark_tolerance_px")) or 4.0
    if len(points) == len(frames) and points:
        adjacent = [math.dist(first, second) for first, second in zip(points, points[1:])]
        seam = math.dist(points[-1], points[0]) if len(points) > 1 else 0.0
        reference = points[0]
        reference_residuals = [math.dist(reference, point) for point in points]
        metrics.update({
            "body_landmark_adjacent_delta_px": [round(value, 4) for value in adjacent],
            "body_landmark_seam_delta_px": round(seam, 4),
            "body_landmark_reference_max_px": round(max(reference_residuals), 4),
        })
        landmarks_pass = max(reference_residuals) <= landmark_limit
        point_detail = f"reference_max={max(reference_residuals):.4f}px, limit={landmark_limit:.4f}px"
    else:
        landmarks_pass = False
        point_detail = "; ".join(point_errors) or "landmark count does not match frames"
    gates.append(Gate("explicit_body_landmarks", landmarks_pass, point_detail))

    adjacent_scale_limit = finite_positive(metadata.get("adjacent_scale_ratio_limit")) or 1.08
    track_scale_limit = finite_positive(metadata.get("track_scale_ratio_limit")) or 1.12
    if len(scales) == len(frames) and scales:
        adjacent_ratios = [max(first, second) / min(first, second) for first, second in zip(scales, scales[1:])]
        seam_ratio = max(scales[-1], scales[0]) / min(scales[-1], scales[0]) if len(scales) > 1 else 1.0
        track_ratio = max(scales) / min(scales)
        adjacent_max = max(adjacent_ratios + [seam_ratio])
        metrics.update({
            "body_scale_adjacent_ratio": [round(value, 5) for value in adjacent_ratios],
            "body_scale_seam_ratio": round(seam_ratio, 5),
            "body_scale_track_ratio": round(track_ratio, 5),
        })
        scales_pass = adjacent_max <= adjacent_scale_limit and track_ratio <= track_scale_limit
        scale_detail = (
            f"adjacent_max={adjacent_max:.5f} limit={adjacent_scale_limit:.5f}; "
            f"track={track_ratio:.5f} limit={track_scale_limit:.5f}"
        )
    else:
        scales_pass = False
        scale_detail = "; ".join(scale_errors) or "scale count does not match frames"
    gates.append(Gate("explicit_body_scales", scales_pass, scale_detail))

    raw_evidence = metadata.get("evidence", [])
    if isinstance(raw_evidence, list):
        evidence_specs = [item for item in raw_evidence if isinstance(item, dict)]
    else:
        gates.append(Gate("metadata_evidence_shape", False, "metadata.evidence must be an array"))
    return gates, metrics, current_hashes, evidence_specs


def validate_evidence(
    cli_paths: Iterable[Path],
    metadata_specs: list[dict[str, object]],
    metadata_path: Path | None,
    frame_hashes: list[str],
    newest_frame_mtime_ns: int,
) -> tuple[list[Gate], list[dict[str, object]]]:
    base = metadata_path.parent if metadata_path else Path.cwd()
    entries: list[tuple[Path, object]] = []
    for spec in metadata_specs:
        value = spec.get("file")
        if isinstance(value, str) and value:
            entries.append((resolve_path(value, base), spec.get("frame_sha256")))
        else:
            entries.append((base / "<missing-evidence-file>", spec.get("frame_sha256")))
    declared = {path for path, _ in entries}
    entries.extend((path.resolve(), None) for path in cli_paths if path.resolve() not in declared)

    gates: list[Gate] = []
    reports: list[dict[str, object]] = []
    if not entries:
        gates.append(Gate("evidence_fresh", False, "no evidence declared in metadata or with --evidence"))
        return gates, reports

    all_fresh = True
    details: list[str] = []
    for path, declared_hashes in entries:
        report: dict[str, object] = {"file": str(path), "exists": path.is_file()}
        if not path.is_file():
            report.update({"passed": False, "method": "missing"})
            all_fresh = False
            details.append(f"missing: {path}")
            reports.append(report)
            continue
        stat = path.stat()
        report.update({"sha256": sha256(path), "bytes": stat.st_size, "mtime_ns": stat.st_mtime_ns})
        if declared_hashes is not None:
            valid_list = (
                isinstance(declared_hashes, list)
                and all(isinstance(item, str) and SHA256_RE.fullmatch(item) for item in declared_hashes)
            )
            passed = bool(valid_list and declared_hashes == frame_hashes)
            method = "frame_sha256"
            detail = "ordered source frame hashes match" if passed else "declared source frame hashes do not match current frames"
        else:
            passed = stat.st_mtime_ns >= newest_frame_mtime_ns
            method = "mtime"
            delta = (stat.st_mtime_ns - newest_frame_mtime_ns) / 1_000_000_000
            detail = f"evidence minus newest frame mtime={delta:.6f}s"
        report.update({"passed": passed, "method": method, "detail": detail})
        all_fresh &= passed
        details.append(f"{path.name}: {method} {'PASS' if passed else 'FAIL'} ({detail})")
        reports.append(report)
    gates.append(Gate("evidence_fresh", all_fresh, "; ".join(details)))
    return gates, reports


def load_metadata(path: Path | None) -> tuple[dict[str, object] | None, str | None]:
    if path is None:
        return None, None
    try:
        value = json.loads(path.read_text())
    except Exception as exc:
        return None, f"{type(exc).__name__}: {exc}"
    if not isinstance(value, dict):
        return None, "metadata root must be an object"
    return value, None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("frames_dir", type=Path, help="directory containing the authored PNG frame sequence")
    parser.add_argument("--pattern", default="*.png", help="non-recursive frame glob (default: *.png)")
    parser.add_argument("--metadata", type=Path, help="authored v2 landmark, scale, and hash metadata")
    parser.add_argument("--evidence", type=Path, action="append", default=[], help="encoded evidence file; repeat as needed")
    parser.add_argument("--report", type=Path, help="write the complete JSON report here")
    parser.add_argument("--minimum-border", type=int, default=64, help="fallback border gate when metadata is absent")
    args = parser.parse_args()

    frames_dir = args.frames_dir.resolve()
    metadata_path = args.metadata.resolve() if args.metadata else None
    metadata, metadata_error = load_metadata(metadata_path)
    minimum_border = args.minimum_border
    expected_rgb: tuple[int, int, int] | None = None
    if metadata is not None:
        configured_border = metadata.get("minimum_clear_border_px")
        if isinstance(configured_border, int) and not isinstance(configured_border, bool) and configured_border >= 0:
            minimum_border = configured_border
        expected_rgb = parse_rgb(metadata.get("visible_rgb"))

    gates: list[Gate] = []
    if not frames_dir.is_dir():
        gates.append(Gate("frames_directory_exists", False, str(frames_dir)))
        frames: list[Path] = []
    else:
        frames = sorted((path.resolve() for path in frames_dir.glob(args.pattern) if path.is_file()), key=natural_key)
        gates.append(Gate("frames_directory_exists", True, str(frames_dir)))
    gates.append(Gate("frames_present", bool(frames), f"matched {len(frames)} files with {args.pattern!r}"))
    if metadata_path is not None and metadata_error:
        gates.append(Gate("metadata_decodes", False, metadata_error))
    elif metadata_path is not None:
        gates.append(Gate("metadata_decodes", True, str(metadata_path)))
    if metadata is not None:
        gates.append(Gate("metadata_visible_rgb", expected_rgb is not None, f"visible_rgb={metadata.get('visible_rgb')!r}"))

    frame_reports: list[dict[str, object]] = []
    for path in frames:
        frame_report, frame_gates = inspect_frame(path, expected_rgb, minimum_border)
        frame_report["gates"] = [gate.as_dict() for gate in frame_gates]
        frame_report["passed"] = all(gate.passed for gate in frame_gates)
        frame_reports.append(frame_report)
    gates.append(Gate(
        "all_frame_pixel_gates",
        bool(frame_reports) and all(bool(report["passed"]) for report in frame_reports),
        f"{sum(bool(report['passed']) for report in frame_reports)}/{len(frame_reports)} frames passed",
    ))
    bundle_colors = {
        tuple(color)
        for report in frame_reports
        for color in report.get("visible_rgb", [])
        if isinstance(color, list) and len(color) == 3
    }
    bundle_color_pass = len(bundle_colors) == 1 and (expected_rgb is None or next(iter(bundle_colors)) == expected_rgb)
    gates.append(Gate(
        "bundle_one_visible_rgb",
        bundle_color_pass,
        f"colors={[list(color) for color in sorted(bundle_colors)]}",
    ))

    metadata_gates, metrics, frame_hashes, evidence_specs = validate_metadata(
        metadata, metadata_path, frames, frame_reports
    )
    gates.extend(metadata_gates)
    newest_mtime = max((int(report["mtime_ns"]) for report in frame_reports), default=0)
    evidence_gates, evidence_reports = validate_evidence(
        args.evidence, evidence_specs, metadata_path, frame_hashes, newest_mtime
    )
    gates.extend(evidence_gates)

    passed = bool(gates) and all(gate.passed for gate in gates)
    report = {
        "schema_version": "2.0",
        "validator": "animation/validate_motion_v2.py",
        "passed": passed,
        "frames_dir": str(frames_dir),
        "metadata": str(metadata_path) if metadata_path else None,
        "policy": {
            "minimum_clear_border_px": minimum_border,
            "expected_visible_rgb": list(expected_rgb) if expected_rgb else None,
            "landmarks_and_scale": "explicit-authored-metadata-only; no pixel-derived fallback",
            "evidence_freshness": "exact ordered frame hashes when declared, otherwise file mtime",
        },
        "gates": [gate.as_dict() for gate in gates],
        "metrics": metrics,
        "frames": frame_reports,
        "evidence": evidence_reports,
    }
    rendered = json.dumps(report, indent=2) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered)
    else:
        sys.stdout.write(rendered)

    failing = [gate.name for gate in gates if not gate.passed]
    print(f"motion-v2 validation {'PASS' if passed else 'FAIL'}: {len(gates) - len(failing)}/{len(gates)} gates passed", file=sys.stderr)
    if failing:
        print("failing gates: " + ", ".join(failing), file=sys.stderr)
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
