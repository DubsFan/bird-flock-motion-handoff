#!/usr/bin/env bash
set -euo pipefail

DIR="/home/ubuntu/birds_exact_pixels"
INPUT="$DIR/articulated-lineart-flight-on-white.mp4"
MASTER="$DIR/birds-articulated-flight-transparent-prores4444.mov"
WEBM="$DIR/birds-articulated-flight-transparent.webm"
PREVIEW="$DIR/birds-articulated-flight-review.mp4"

# White is converted to transparent alpha. The six-second flight segment begins at 0.75s,
# fades from and to transparent, and sits inside an 8s transparent canvas.
FILTER="[0:v]fps=24,scale=1672:941,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(255-min(min(r(X,Y),g(X,Y)),b(X,Y)),30),255,0)',fade=t=in:st=0:d=0.35:alpha=1,fade=t=out:st=5.25:d=0.75:alpha=1,setpts=PTS+0.75/TB[flight];color=c=black:s=1672x941:r=24:d=8,format=rgba,geq=r=0:g=0:b=0:a=0[blank];[blank][flight]overlay=0:0:eof_action=pass:repeatlast=0:format=auto,trim=duration=8,format=yuva444p10le[v]"

ffmpeg -y -i "$INPUT" -filter_complex "$FILTER" -map "[v]" -an \
  -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le -movflags +faststart "$MASTER"

# Browser VP9 alpha requires an even height; the bottom 1px contains only the transparent field.
ffmpeg -y -i "$MASTER" -vf "crop=1672:940:0:0" -an \
  -c:v libvpx-vp9 -pix_fmt yuva420p -crf 28 -b:v 0 -auto-alt-ref 0 "$WEBM"

ffmpeg -y -f lavfi -i "color=c=#1F2937:s=1672x941:r=24:d=8" -i "$MASTER" \
  -filter_complex "[0:v][1:v]overlay=format=auto,format=yuv420p[v]" -map "[v]" -an \
  -c:v libx264 -crf 18 -movflags +faststart "$PREVIEW"

for file in "$MASTER" "$WEBM" "$PREVIEW"; do
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=codec_name,pix_fmt,width,height,avg_frame_rate,duration:stream_tags=alpha_mode \
    -of default=noprint_wrappers=1 "$file" > "${file}.ffprobe.txt"
done
