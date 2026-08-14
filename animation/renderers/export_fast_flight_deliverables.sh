#!/usr/bin/env bash
set -euo pipefail

DIR="/home/ubuntu/birds_exact_pixels"
MASTER="$DIR/birds-fast-flight-transparent-prores4444.mov"

# VP9 alpha requires an even frame height. The 1px bottom crop contains no bird pixels.
ffmpeg -y -i "$MASTER" -vf "crop=1672:940:0:0" -an \
  -c:v libvpx-vp9 -pix_fmt yuva420p -crf 28 -b:v 0 -auto-alt-ref 0 \
  "$DIR/birds-fast-flight-transparent.webm"

# Readable review copy only. The master and WebM retain alpha; this MP4 does not.
ffmpeg -y -f lavfi -i "color=c=#1F2937:s=1672x941:r=24:d=8" -i "$MASTER" \
  -filter_complex "[0:v][1:v]overlay=format=auto,format=yuv420p[v]" -map "[v]" -an \
  -c:v libx264 -crf 18 -movflags +faststart \
  "$DIR/birds-fast-flight-review.mp4"

for file in "$MASTER" "$DIR/birds-fast-flight-transparent.webm" "$DIR/birds-fast-flight-review.mp4"; do
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=codec_name,pix_fmt,width,height,avg_frame_rate,duration:stream_tags=alpha_mode \
    -of default=noprint_wrappers=1 "$file" > "${file}.ffprobe.txt"
done

cat > "$DIR/FAST_FLIGHT_README.md" <<'EOF'
# Fast Bird Flight Loop

The animation begins on a fully transparent frame, remains empty for 0.75 seconds, brings the bird group from fully off-screen left across the frame, then exits fully off-screen right at 6.50 seconds. It stays transparent until the 8-second loop boundary.

Every retained bird line uses the original supplied blue line-art pixels. Wings use a symmetric joint-centered flex at approximately 3.00–3.48 cycles per second. This replaces the prior one-sided hinge rotation. No realistic shading, anatomy, fill, texture, or lifelike bird rendering is present.

| File | Use | Alpha |
| --- | --- | --- |
| `birds-fast-flight-transparent-prores4444.mov` | Editor/master | Yes, ProRes 4444 |
| `birds-fast-flight-transparent.webm` | Website delivery | Yes, VP9 alpha |
| `birds-fast-flight-review.mp4` | Review copy on dark gray | No |
EOF
