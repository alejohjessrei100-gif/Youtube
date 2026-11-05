#!/bin/bash
# join the cup chunks, add the mix, burn in the captions, run frame-by-frame QA
set -e
cd "$(dirname "$0")/.."
D=out/cup/final
ls $D/c_*.mp4 | grep -v tmp | sort | sed "s#^#file '$PWD/#; s#\$#'#" > $D/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $D/list.txt -c copy $D/video_only.mp4
ffmpeg -v error -y -i $D/video_only.mp4 -i cup/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p \
  -c:a aac -b:a 256k -ar 48000 -t 35.233 -movflags +faststart cup/The_Cup_That_Changes_Colour_2K.mp4
ffmpeg -v error -y -i cup/The_Cup_That_Changes_Colour_2K.mp4 -vf "ass=cup/captions.ass:fontsdir=cup/fonts" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p \
  -c:a copy -movflags +faststart cup/The_Cup_That_Changes_Colour_2K_captions.mp4
cat > $D/shots.json <<'J'
{"shots": [{"id":1,"a":0,"b":36},{"id":2,"a":36,"b":68},{"id":3,"a":68,"b":138},{"id":4,"a":138,"b":150},{"id":5,"a":150,"b":176},{"id":6,"a":176,"b":209},
 {"id":7,"a":209,"b":238},{"id":8,"a":238,"b":298},{"id":9,"a":298,"b":375},{"id":10,"a":375,"b":442},{"id":11,"a":442,"b":500},{"id":12,"a":500,"b":590},
 {"id":13,"a":590,"b":668},{"id":14,"a":668,"b":735},{"id":15,"a":735,"b":796},{"id":16,"a":796,"b":846},{"id":17,"a":846,"b":874},{"id":18,"a":874,"b":1057}],
 "flash": [500, 504], "xfade": [[233, 243], [371, 379], [791, 801]]}
J
python3 scripts/short_qa.py cup/The_Cup_That_Changes_Colour_2K_captions.mp4 out/cup/qa $D/shots.json
