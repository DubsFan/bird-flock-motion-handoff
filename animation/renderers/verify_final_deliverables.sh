#!/usr/bin/env bash
set -euo pipefail

DIR="/home/ubuntu/birds_exact_pixels"
MASTER="$DIR/birds-only-wing-flap-transparent-prores4444.mov"
WEBM="$DIR/birds-only-wing-flap-transparent.webm"
PREVIEW="$DIR/birds-only-wing-flap-review.mp4"

printf '%s\n' '--- Files ---'
ls -lh "$MASTER" "$WEBM" "$PREVIEW" "$DIR/birds_only_original_pixels_v2.png"
printf '%s\n' '--- Alpha master ---'
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt,width,height,avg_frame_rate,duration -of default=noprint_wrappers=1 "$MASTER"
printf '%s\n' '--- Alpha web delivery ---'
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt,width,height,avg_frame_rate,duration:stream_tags=alpha_mode -of default=noprint_wrappers=1 "$WEBM"
printf '%s\n' '--- Review copy ---'
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt,width,height,avg_frame_rate,duration -of default=noprint_wrappers=1 "$PREVIEW"

# Decode first and last master frames to verify the loop boundary is exact.
ffmpeg -y -v error -i "$MASTER" -vf "select='eq(n\,0)+eq(n\,191)'" -vsync 0 -pix_fmt rgba "$DIR/loop-check-%02d.png"
FIRST=$(sha256sum "$DIR/loop-check-01.png" | awk '{print $1}')
LAST=$(sha256sum "$DIR/loop-check-02.png" | awk '{print $1}')
printf '%s\n' '--- Loop boundary ---'
printf 'first_frame_sha256=%s\nlast_frame_sha256=%s\n' "$FIRST" "$LAST"
if [ "$FIRST" = "$LAST" ]; then
  printf 'loop_boundary=PASS (decoded first and last frames are identical)\n'
else
  printf 'loop_boundary=FAIL\n' >&2
  exit 1
fi
