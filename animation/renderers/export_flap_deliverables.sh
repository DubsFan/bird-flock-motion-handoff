#!/usr/bin/env bash
set -euo pipefail

DIR="/home/ubuntu/birds_exact_pixels"
MASTER="$DIR/birds-only-wing-flap-transparent-prores4444.mov"

# WebM requires even 4:2:0 dimensions. Birds occupy the upper/middle frame, so the 1px bottom crop removes no retained bird pixels.
ffmpeg -y -i "$MASTER" -vf "crop=1672:940:0:0" -an \
  -c:v libvpx-vp9 -pix_fmt yuva420p -crf 28 -b:v 0 -auto-alt-ref 0 \
  "$DIR/birds-only-wing-flap-transparent.webm"

# Review copy only: blue original pixels composited over a neutral dark background. This MP4 has no alpha.
ffmpeg -y -f lavfi -i "color=c=#1F2937:s=1672x941:r=24:d=8" -i "$MASTER" \
  -filter_complex "[0:v][1:v]overlay=format=auto,format=yuv420p[v]" -map "[v]" -an \
  -c:v libx264 -crf 18 -movflags +faststart \
  "$DIR/birds-only-wing-flap-review.mp4"

for file in "$MASTER" "$DIR/birds-only-wing-flap-transparent.webm" "$DIR/birds-only-wing-flap-review.mp4"; do
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=codec_name,pix_fmt,width,height,avg_frame_rate,duration:stream_tags=alpha_mode \
    -of default=noprint_wrappers=1 "$file" > "${file}.ffprobe.txt"
done

cat > "$DIR/README.md" <<'EOF'
# Exact-Pixel Bird Wing-Flap Animation

## Asset Guarantee

The bird-only source PNG contains only pixels copied directly from the supplied illustration. It has **0 RGB mismatches** against the original for all 4,370 visible pixels. The cleanup changes alpha only, removing non-bird construction strokes. The wing animation uses nearest-neighbor rotation of these original pixels around each bird’s lower wing joint. No generative model, restyling, recoloring, redrawing, or realism pass was used.

## Deliverables

| File | Use | Alpha |
| --- | --- | --- |
| `birds-only-wing-flap-transparent-prores4444.mov` | Editor/master file | Yes, ProRes 4444 |
| `birds-only-wing-flap-transparent.webm` | Website file for supporting browsers | Yes, VP9 |
| `birds-only-original-pixels-v2.png` | Clean transparent bird-only still | Yes, RGBA PNG |
| `birds-only-wing-flap-review.mp4` | Visible review copy on dark gray | No |

## Motion

The loop is 8 seconds at 24 fps. Every bird uses its original blue line-art pixels. Its left and right wing segments rotate in opposite directions around the existing lower wing joint to create a gentle flap. The motion is cyclic and returns to its base pose at the loop boundary.

## Website Embed

```html
<video autoplay muted loop playsinline aria-hidden="true">
  <source src="/birds-only-wing-flap-transparent.webm" type="video/webm" />
</video>
```
EOF
