#!/bin/bash
# two-pass loudnorm to -14 LUFS / -1 dBTP. usage: tools/master.sh [premaster.wav] [out.mp3]
set -e
cd "$(dirname "$0")/.."
IN=${1:-out/audio/premaster.wav}; OUT=${2:-public/audio/agloe-mix.mp3}
J=$(ffmpeg -hide_banner -i $IN -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -v error -y -i $IN -af "loudnorm=I=-14:TP=-1:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true" -ar 48000 -ac 2 -b:a 192k $OUT
ffmpeg -hide_banner -i $OUT -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):" | tail -2
