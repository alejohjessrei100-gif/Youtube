#!/bin/bash
# join the Vasa hook frames (0-159, from the approved hook test) with the full-film chunks (160-1169), add the mix,
# burn in the captions (CAP_MARGINV=950: above the Shorts title overlay, clear of the button column), run QA
set -e
cd "$(dirname "$0")/.."
D=out/vasa/final
ffmpeg -v error -y -i out/vasa/hooktest/video_only.mp4 -vf "trim=end_frame=160,setpts=PTS-STARTPTS" -c:v libx264 -crf 12 -preset fast -pix_fmt yuv420p $D/hook_0_159.mp4
{ echo "file '$PWD/$D/hook_0_159.mp4'"; ls $D/c_*.mp4 | grep -v tmp | sort | sed "s#^#file '$PWD/#; s#\$#'#"; } > $D/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $D/list.txt -c copy $D/video_only.mp4
ffmpeg -v error -y -i $D/video_only.mp4 -i vasa/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p \
  -c:a aac -b:a 256k -ar 48000 -t 39.0 -movflags +faststart vasa/The_Ship_That_Lost_To_A_Breeze_2K.mp4
CAP_MARGINV=950 python3 scripts/captions.py vasa/voice/words_cap.json vasa/captions.ass vasa/phrases.txt > /dev/null
ffmpeg -v error -y -i vasa/The_Ship_That_Lost_To_A_Breeze_2K.mp4 -vf "ass=vasa/captions.ass:fontsdir=vasa/fonts" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p \
  -c:a copy -movflags +faststart vasa/The_Ship_That_Lost_To_A_Breeze_2K_captions.mp4
