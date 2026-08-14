#!/usr/bin/env bash
set -euo pipefail
DIR="/home/ubuntu/birds_exact_pixels"
MASTER="$DIR/three_bird_forward_wingbeat_prores4444.mov"
WEBM="$DIR/three_bird_forward_wingbeat_transparent.webm"
REVIEW="$DIR/three_bird_forward_wingbeat_review.mp4"

ffmpeg -y -i "$MASTER" -vf "crop=1672:940:0:0" -an \
  -c:v libvpx-vp9 -pix_fmt yuva420p -crf 28 -b:v 0 -auto-alt-ref 0 "$WEBM"

ffmpeg -y -f lavfi -i "color=c=white:s=1672x941:r=24:d=12" -i "$MASTER" \
  -filter_complex "[0:v][1:v]overlay=format=auto,format=yuv420p[v]" -map "[v]" -an \
  -c:v libx264 -crf 18 -movflags +faststart "$REVIEW"

for f in "$MASTER" "$WEBM" "$REVIEW"; do
  ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt,width,height,avg_frame_rate,duration:stream_tags=alpha_mode -of default=noprint_wrappers=1 "$f" > "$f.ffprobe.txt"
done
