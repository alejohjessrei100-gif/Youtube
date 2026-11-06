#!/bin/bash
# join the hotel hook frames (0-119, approved hook test) with the full-film chunks (120-1049) via the concat FILTER,
# add the mix, burn in the captions (baseline ~72 % height), run QA
set -e
cd "$(dirname "$0")/.."
D=out/hotel/final
ls $D/c_*.mp4 | grep -v tmp | sort | sed "s#^#file '$PWD/#; s#\$#'#" > $D/list_new.txt
ffmpeg -v error -y -f concat -safe 0 -i $D/list_new.txt -c copy $D/new.mp4
ffmpeg -v error -y -i out/hotel/hooktest/video_only.mp4 -i $D/new.mp4 -filter_complex \
  "[0:v]trim=end_frame=120,setpts=PTS-STARTPTS,format=yuv420p[a];[1:v]setpts=PTS-STARTPTS,format=yuv420p[b];[a][b]concat=n=2:v=1:a=0,fps=30[v]" \
  -map "[v]" -c:v libx264 -crf 12 -preset fast -pix_fmt yuv420p $D/video_only.mp4
ffmpeg -v error -y -i $D/video_only.mp4 -i hotel/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p \
  -c:a aac -b:a 256k -ar 48000 -t 35.0 -movflags +faststart hotel/Why_You_Cant_Sleep_In_Hotels_2K.mp4
python3 scripts/captions.py hotel/voice/words_asr.json hotel/captions.ass hotel/phrases.txt > /dev/null
ffmpeg -v error -y -i hotel/Why_You_Cant_Sleep_In_Hotels_2K.mp4 -vf "ass=hotel/captions.ass:fontsdir=hotel/fonts" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p \
  -c:a copy -movflags +faststart hotel/Why_You_Cant_Sleep_In_Hotels_2K_captions.mp4
