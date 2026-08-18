#!/usr/bin/env python3
"""Build one hash-bound approach -> perch -> launch proof reel."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import tempfile
from pathlib import Path


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--metadata", type=Path, required=True)
    parser.add_argument("--output-stem", type=Path, required=True)
    parser.add_argument("--output-fps", type=int, default=60)
    args = parser.parse_args()
    metadata_path = args.metadata.resolve()
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    records = [record for track in ("approach", "perch", "launch") for record in metadata["tracks"][track]]
    frames = [(metadata_path.parent / record["file"]).resolve() for record in records]
    hashes = []
    for frame, record in zip(frames, records):
        actual = digest(frame)
        if actual != record.get("sha256"):
            raise SystemExit(f"authored hash mismatch: {frame}")
        hashes.append(actual)

    # Approach and launch expose every chronological pose at normal speed.
    # Perch settles, holds one quiet midpoint for one second, then advances to
    # its preload frame. This adapts to any valid 8..16-frame action contract.
    count = len(metadata["tracks"]["approach"])
    if any(len(metadata["tracks"][track]) != count for track in ("perch", "launch")):
        raise SystemExit("all action tracks must use the same frame count")
    pose_rate = max(12, count)
    hold_index = max(2, round(count * 0.55))
    perch_durations = [1 / pose_rate] * count
    perch_durations[hold_index] = 1.0
    durations = [1 / pose_rate] * count + perch_durations + [1 / pose_rate] * count
    stem = args.output_stem.resolve()
    stem.parent.mkdir(parents=True, exist_ok=True)
    mp4 = stem.with_suffix(".mp4")
    webm = stem.parent / f"{stem.name}-alpha.webm"
    with tempfile.TemporaryDirectory(prefix="murmur-action-proof-") as temporary:
        listing = Path(temporary) / "frames.txt"
        lines: list[str] = []
        for frame, duration in zip(frames, durations):
            escaped = str(frame).replace("'", "'\\''")
            lines.extend([f"file '{escaped}'", f"duration {duration:.8f}"])
        escaped = str(frames[-1]).replace("'", "'\\''")
        lines.append(f"file '{escaped}'")
        listing.write_text("\n".join(lines) + "\n", encoding="utf-8")
        input_args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(listing)]
        run(input_args + ["-vf", f"fps={args.output_fps},format=rgba", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0", "-b:v", "0", "-crf", "24", str(webm)])
        run(input_args + ["-f", "lavfi", "-i", f"color=c=0xf4f0e6:s=1600x1200:r={args.output_fps}", "-filter_complex", f"[0:v]fps={args.output_fps},format=rgba[fg];[1:v][fg]overlay=shortest=1,format=yuv420p", "-c:v", "libx264", "-crf", "18", "-preset", "medium", str(mp4)])

    metadata["evidence"] = [
        {"file": os.path.relpath(path, metadata_path.parent), "frame_sha256": hashes, "video_sha256": digest(path), "output_fps": args.output_fps}
        for path in (mp4, webm)
    ]
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(mp4)
    print(webm)


if __name__ == "__main__":
    main()
