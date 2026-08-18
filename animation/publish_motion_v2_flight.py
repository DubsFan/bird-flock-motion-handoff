#!/usr/bin/env python3
"""Publish an approved hash-validated V2 flight track into packaged artwork."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--metadata", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True)
    args = parser.parse_args()

    metadata_path = args.metadata.resolve()
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    validation_path = metadata_path.parent / "validation-v2.json"
    validation = json.loads(validation_path.read_text(encoding="utf-8"))
    if validation.get("passed") is not True:
        raise SystemExit(f"refusing to publish failed validation: {validation_path}")

    records = metadata.get("frames")
    if not isinstance(records, list) or not records:
        raise SystemExit("authored metadata has no frames")
    sources: list[Path] = []
    for record in records:
        source = (metadata_path.parent / record["file"]).resolve()
        if sha256(source) != record.get("sha256"):
            raise SystemExit(f"source changed after validation: {source}")
        sources.append(source)

    destination = args.destination.resolve()
    flight_dir = destination / "flight"
    flight_dir.mkdir(parents=True, exist_ok=True)
    for source in sources:
        shutil.copy2(source, flight_dir / source.name)
    shutil.copy2(sources[0], destination / "preview.png")

    manifest_path = destination / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    artwork_set = manifest["sets"][0]
    artwork_set["tracks"]["flight"] = [source.name for source in sources]
    first_landmark = records[0]["body_landmark_px"]
    artwork_set["canvases"]["flight"]["anchor"] = {
        "x": round(float(first_landmark[0])),
        "y": round(float(first_landmark[1])),
    }
    artwork_set["source_method"] = (
        "V2 layered identity rig baked offline to chronological one-color true-alpha PNGs; "
        "published only after explicit body-landmark, body-scale, clear-border, frame-hash, "
        "and hash-bound normal-speed proof validation"
    )
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"published {len(sources)} validated V2 flight frames to {destination}")


if __name__ == "__main__":
    main()
