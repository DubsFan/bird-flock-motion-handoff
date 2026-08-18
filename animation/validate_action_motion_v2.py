#!/usr/bin/env python3
"""Fail-closed validation for authored approach/perch/launch tracks."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from validate_motion_v2 import Gate, inspect_frame, parse_point, parse_rgb


TRACKS = ("approach", "perch", "launch")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--metadata", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()

    metadata_path = args.metadata.resolve()
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    base = metadata_path.parent
    expected_rgb = parse_rgb(metadata.get("visible_rgb"))
    border = int(metadata.get("minimum_clear_border_px", 64))
    raw_tracks = metadata.get("tracks")
    gates: list[Gate] = [
        Gate("metadata_schema_v2", metadata.get("schema_version") == "2.0" and metadata.get("authored") is True, "authored action metadata"),
        Gate("exact_track_set", isinstance(raw_tracks, dict) and tuple(raw_tracks.keys()) == TRACKS, f"required={TRACKS}"),
    ]
    frame_reports: dict[str, list[dict[str, object]]] = {}
    points: dict[str, list[tuple[float, float]]] = {}
    body_points: dict[str, list[tuple[float, float]]] = {}
    scales: list[float] = []
    hashes: list[str] = []
    track_counts: dict[str, int] = {}

    if not isinstance(raw_tracks, dict):
        raw_tracks = {}
    for track in TRACKS:
        records = raw_tracks.get(track)
        count = len(records) if isinstance(records, list) else 0
        track_counts[track] = count
        track_ok = 8 <= count <= 16
        gates.append(Gate(f"{track}_ordered_frames", track_ok, f"count={count}, required=8..16"))
        frame_reports[track] = []
        points[track] = []
        body_points[track] = []
        if not isinstance(records, list):
            continue
        for index, record in enumerate(records):
            if not isinstance(record, dict) or not isinstance(record.get("file"), str):
                gates.append(Gate(f"{track}_{index + 1:02d}_metadata", False, "invalid frame record"))
                continue
            path = (base / record["file"]).resolve()
            report, pixel_gates = inspect_frame(path, expected_rgb, border)
            frame_reports[track].append(report)
            pixel_ok = all(gate.passed for gate in pixel_gates)
            actual_hash = digest(path)
            hash_ok = actual_hash == record.get("sha256")
            gates.append(Gate(f"{track}_{index + 1:02d}_pixels_and_hash", pixel_ok and hash_ok, f"pixels={pixel_ok}, hash={hash_ok}"))
            hashes.append(actual_hash)
            contact = parse_point(record.get("contact_landmark_px"))
            body = parse_point(record.get("body_landmark_px"))
            scale = record.get("body_scale_px")
            if contact is not None:
                points[track].append(contact)
            if body is not None:
                body_points[track].append(body)
            if isinstance(scale, (int, float)) and float(scale) > 0:
                scales.append(float(scale))

    expected_total = sum(track_counts.values())
    same_count = len(set(track_counts.values())) == 1
    all_explicit = same_count and all(len(points[track]) == track_counts[track] and len(body_points[track]) == track_counts[track] for track in TRACKS) and len(scales) == expected_total
    gates.append(Gate("explicit_authored_landmarks_and_scale", all_explicit, f"{expected_total} contact points, body landmarks, and body scales required"))
    if all_explicit:
        ratio = max(scales) / min(scales)
        gates.append(Gate("body_scale_locked", ratio <= 1.03, f"max/min={ratio:.6f}, limit=1.03"))
        target_y = points["perch"][0][1]
        perch_drift = max(math.dist(points["perch"][0], point) for point in points["perch"])
        approach_contact = max(abs(point[1] - target_y) for point in points["approach"][-3:])
        launch_y = [point[1] for point in points["launch"]]
        launch_direction = metadata.get("launch_contact_direction", "decreasing")
        if launch_direction == "increasing":
            launch_monotone = all(second >= first - 0.01 for first, second in zip(launch_y, launch_y[1:]))
        else:
            launch_monotone = all(second <= first + 0.01 for first, second in zip(launch_y, launch_y[1:]))
        gates.extend([
            Gate("approach_contact_lock", approach_contact <= 1.0, f"last-three max y residual={approach_contact:.4f}px"),
            Gate("perch_contact_lock", perch_drift <= 2.0, f"max contact drift={perch_drift:.4f}px"),
            Gate("launch_releases_monotonically", launch_monotone and math.dist(points["launch"][0], points["perch"][-1]) <= 2.0, f"direction={launch_direction}, launch_y={launch_y}"),
            Gate("approach_to_perch_contact_seam", math.dist(points["approach"][-1], points["perch"][0]) <= 2.0, f"delta={math.dist(points['approach'][-1], points['perch'][0]):.4f}px"),
            Gate("perch_to_launch_contact_seam", math.dist(points["perch"][-1], points["launch"][0]) <= 2.0, f"delta={math.dist(points['perch'][-1], points['launch'][0]):.4f}px"),
        ])
        hold_start = max(2, round(track_counts["perch"] * 0.28))
        hold_end = max(hold_start + 1, round(track_counts["perch"] * 0.82))
        perch_body_hold = max(math.dist(body_points["perch"][hold_start], point) for point in body_points["perch"][hold_start:hold_end])
        gates.append(Gate("perch_body_hold_stable", perch_body_hold <= 2.0, f"hold-range max body landmark drift={perch_body_hold:.4f}px"))

    evidence = metadata.get("evidence")
    evidence_ok = isinstance(evidence, list) and len(evidence) >= 2
    evidence_details: list[str] = []
    if evidence_ok:
        for item in evidence:
            if not isinstance(item, dict) or item.get("frame_sha256") != hashes:
                evidence_ok = False
                evidence_details.append("ordered frame hashes do not match")
                continue
            path_value = item.get("file")
            if not isinstance(path_value, str) or not (base / path_value).resolve().is_file():
                evidence_ok = False
                evidence_details.append(f"missing evidence: {path_value}")
    gates.append(Gate("hash_bound_normal_speed_evidence", evidence_ok, "; ".join(evidence_details) or f"evidence_count={len(evidence) if isinstance(evidence, list) else 0}"))

    passed = all(gate.passed for gate in gates)
    report = {
        "validator": "motion-v2-actions",
        "passed": passed,
        "passed_gate_count": sum(gate.passed for gate in gates),
        "gate_count": len(gates),
        "gates": [gate.as_dict() for gate in gates],
        "frames": frame_reports,
    }
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"{'PASS' if passed else 'FAIL'}: {report['passed_gate_count']}/{report['gate_count']} gates")
    raise SystemExit(0 if passed else 1)


if __name__ == "__main__":
    main()
