#!/bin/bash
# join the Vasa hook frames (0-159, from the approved hook test) with the full-film chunks (160-1169), add the mix,
# burn in the captions (CAP_MARGINV=720: above the Shorts title overlay, clear of the button column), run QA
set -e
cd "$(dirname "$0")/.."
D=out/vasa/final
# the hook chunks and the new chunks have different stream params: join them with the concat FILTER (re-encode), never -c copy
ls $D/c_*.mp4 | grep -v tmp | sort | sed "s#^#file '$PWD/#; s#\$#'#" > $D/list_new.txt
ffmpeg -v error -y -f concat -safe 0 -i $D/list_new.txt -c copy $D/new_160_1169.mp4
ffmpeg -v error -y -i out/vasa/hooktest/video_only.mp4 -i $D/new_160_1169.mp4 -filter_complex \
  "[0:v]trim=end_frame=160,setpts=PTS-STARTPTS,format=yuv420p[a];[1:v]setpts=PTS-STARTPTS,format=yuv420p[b];[a][b]concat=n=2:v=1:a=0,fps=30[v]" \
  -map "[v]" -c:v libx264 -crf 12 -preset fast -pix_fmt yuv420p $D/video_only.mp4
ffmpeg -v error -y -i $D/video_only.mp4 -i vasa/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p \
  -c:a aac -b:a 256k -ar 48000 -t 39.0 -movflags +faststart vasa/The_Ship_That_Lost_To_A_Breeze_2K.mp4
CAP_MARGINV=720 python3 scripts/captions.py vasa/voice/words_cap.json vasa/captions.ass vasa/phrases.txt > /dev/null
ffmpeg -v error -y -i vasa/The_Ship_That_Lost_To_A_Breeze_2K.mp4 -vf "ass=vasa/captions.ass:fontsdir=vasa/fonts" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p \
  -c:a copy -movflags +faststart vasa/The_Ship_That_Lost_To_A_Breeze_2K_captions.mp4
