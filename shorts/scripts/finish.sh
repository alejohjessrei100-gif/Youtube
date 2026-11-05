#!/bin/bash
# join the rendered chunks, add the final mix, encode the delivery file, run frame-by-frame QA
set -e
cd "$(dirname "$0")/.."
D=out/ear/final
ls $D/c_*.mp4 | sort | sed "s#^#file '$PWD/#; s#\$#'#" > $D/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $D/list.txt -c copy $D/video_only.mp4
ffmpeg -v error -y -i $D/video_only.mp4 -i ear/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p \
  -c:a aac -b:a 256k -ar 48000 -t 33.3 -movflags +faststart ear/Over_a_Single_Ear_2K.mp4
python3 scripts/short_qa.py ear/Over_a_Single_Ear_2K.mp4 out/ear/qa ear/shots.json
