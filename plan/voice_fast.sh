#!/usr/bin/env bash
# Speed a narration up for Shorts: trim silences longer than 0.18 s down to ~0.09 s, then speed up by a factor.
# Reference channel (@ricksclips3000) narrates at 3.3 to 3.8 words/s (198 to 226 wpm), median gap 0.24 to 0.30 s.
#   usage: plan/voice_fast.sh in.mp3 out.mp3 [speed=1.4] [words]
set -euo pipefail
IN="$1"; OUT="$2"; SPEED="${3:-1.4}"; WORDS="${4:-}"
ffmpeg -v error -y -i "$IN" -af "silenceremove=stop_periods=-1:stop_duration=0.18:stop_threshold=-45dB:stop_silence=0.09,atempo=$SPEED" -c:a libmp3lame -b:a 192k "$OUT"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
if [ -n "$WORDS" ]; then python3 -c "d=$D;w=$WORDS;print(f'{d:.1f} s, {w/d:.2f} words/s ({w/d*60:.0f} wpm)')"; else echo "$D s"; fi
