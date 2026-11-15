#!/usr/bin/env bash
# Master out/audio/premaster_squares.wav (from plan/audio_squares.py) to public/audio/square-race-mix.mp3:
# +7 dB into a limiter at 0.74, then two-pass linear loudnorm to -14 LUFS / -1 dBTP.
# Result last run: -14.4 LUFS integrated, -1.4 dBTP, LRA 2.8.
set -euo pipefail
cd "$(dirname "$0")/.."
ffmpeg -v error -y -i out/audio/premaster_squares.wav -af "volume=7dB,alimiter=limit=0.74:attack=3:release=60:level=disabled" out/audio/limited_squares.wav
J=$(ffmpeg -hide_banner -i out/audio/limited_squares.wav -af loudnorm=I=-14:TP=-1:LRA=7:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
read I TP LRA TH OFF < <(echo "$J" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
mkdir -p public/audio
ffmpeg -v error -y -i out/audio/limited_squares.wav -af "loudnorm=I=-14:TP=-1:LRA=7:measured_I=$I:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$TH:offset=$OFF:linear=true,aresample=48000" -c:a libmp3lame -b:a 192k public/audio/square-race-mix.mp3
ffmpeg -hide_banner -i public/audio/square-race-mix.mp3 -af loudnorm=I=-14:TP=-1:LRA=7:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p' | python3 -c "import json,sys;d=json.load(sys.stdin);print('master: I', d['input_i'], 'LUFS, TP', d['input_tp'], 'dBTP, LRA', d['input_lra'])"
