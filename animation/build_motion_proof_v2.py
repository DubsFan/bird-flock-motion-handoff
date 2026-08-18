#!/usr/bin/env python3
"""Encode hash-bound normal-speed proof from an authored motion-v2 sequence."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--metadata", type=Path, required=True)
    parser.add_argument("--output-stem", type=Path, required=True)
    parser.add_argument("--cycle-hz", type=float, required=True)
    parser.add_argument("--output-fps", type=int, default=60)
    parser.add_argument("--duration", type=float, default=3.0)
    args = parser.parse_args()

    metadata_path = args.metadata.resolve()
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    records = metadata.get("frames")
    if not isinstance(records, list) or not records:
        raise SystemExit("metadata.frames must be a nonempty ordered array")

    frames = [(metadata_path.parent / record["file"]).resolve() for record in records]
    for frame, record in zip(frames, records):
        actual = sha256(frame)
        if actual != record.get("sha256"):
            raise SystemExit(f"authored hash mismatch before proof encode: {frame}")
    widths = {len(frame.name.split("_", 1)[0]) for frame in frames}
    if len(widths) != 1 or sorted(frames) != frames:
        raise SystemExit("proof builder requires a zero-padded ordered frame sequence")

    first = frames[0].name
    suffix = first.split("_", 1)[1]
    input_pattern = frames[0].parent / (f"%0{widths.pop()}d_" + suffix)
    input_fps = len(frames) * args.cycle_hz
    stem = args.output_stem.resolve()
    stem.parent.mkdir(parents=True, exist_ok=True)
    mp4 = stem.parent / f"{stem.name}.mp4"
    webm = stem.parent / f"{stem.name}-alpha.webm"

    common = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-stream_loop", "99", "-framerate", f"{input_fps:.8g}",
        "-i", str(input_pattern), "-t", f"{args.duration:.8g}",
        "-r", str(args.output_fps),
    ]
    run(common + ["-vf", "format=yuv420p", "-c:v", "libx264", "-crf", "18", "-preset", "medium", str(mp4)])
    run(common + [
        "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0",
        "-b:v", "0", "-crf", "24", str(webm),
    ])

    frame_hashes = [record["sha256"] for record in records]
    metadata["evidence"] = []
    for video in (mp4, webm):
        metadata["evidence"].append({
            "file": os.path.relpath(video, metadata_path.parent),
            "frame_sha256": frame_hashes,
            "video_sha256": sha256(video),
            "cycle_hz": args.cycle_hz,
            "input_pose_fps": input_fps,
            "output_fps": args.output_fps,
            "duration_seconds": args.duration,
        })
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"wrote hash-bound proof: {mp4}")
    print(f"wrote hash-bound alpha proof: {webm}")


if __name__ == "__main__":
    main()
