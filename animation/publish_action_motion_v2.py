#!/usr/bin/env python3
"""Publish approved action V2 tracks while preserving stable public filenames."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--metadata", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True)
    args = parser.parse_args()
    metadata_path = args.metadata.resolve()
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    validation_path = metadata_path.parent / "validation-actions-v3.json"
    if not validation_path.is_file():
        validation_path = metadata_path.parent / "validation-actions-v2.json"
    validation = json.loads(validation_path.read_text(encoding="utf-8"))
    if validation.get("passed") is not True:
        raise SystemExit(f"refusing to publish failed validation: {validation_path}")

    destination = args.destination.resolve()
    manifest_path = destination / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    public_tracks = manifest["sets"][0]["tracks"]
    provenance: dict[str, list[dict[str, str]]] = {}
    for track in ("approach", "perch", "launch"):
        records = metadata["tracks"][track]
        public_names = [f"{index + 1:02d}_{track}.png" for index in range(len(records))]
        public_tracks[track] = public_names
        target_folder = destination / track
        target_folder.mkdir(parents=True, exist_ok=True)
        for stale in target_folder.glob("*.png"):
            stale.unlink()
        provenance[track] = []
        for record, public_name in zip(records, public_names):
            source = (metadata_path.parent / record["file"]).resolve()
            if digest(source) != record.get("sha256"):
                raise SystemExit(f"source changed after validation: {source}")
            target = destination / track / public_name
            shutil.copy2(source, target)
            provenance[track].append({"public_file": public_name, "sha256": digest(target)})

    action_anchor = metadata["tracks"]["perch"][0]["contact_landmark_px"]
    manifest["sets"][0]["canvases"]["action"]["anchor"] = {
        "x": round(float(action_anchor[0])),
        "y": round(float(action_anchor[1])),
    }
    manifest["sets"][0]["source_method"] = (
        "V2 layered identity rig baked offline to chronological one-color true-alpha PNGs; "
        "flight and action tracks published only after explicit landmark/scale, contact-lock, "
        "clear-border, exact frame-hash, and hash-bound normal-speed proof validation"
    )
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (destination / "action-v2-provenance.json").write_text(json.dumps({
        "schema_version": "2.0",
        "validation_gate_count": validation["gate_count"],
        "validation_passed_gate_count": validation["passed_gate_count"],
        "tracks": provenance,
    }, indent=2) + "\n", encoding="utf-8")
    print(f"published {sum(len(track) for track in provenance.values())} validated action frames to {destination}")


if __name__ == "__main__":
    main()
