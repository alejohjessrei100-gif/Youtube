#!/bin/bash
# usage: tools/stills.sh OUTDIR SCALE frame1 frame2 ...   (renders from the bundle in build/, one GPU render at a time)
out=$1; sc=$2; shift 2; mkdir -p "$out"
for f in "$@"; do
  python3 .claude/skills/inkbeat-shorts/scripts/gpu_lock.py -- npx remotion still build Agloe "$out/f$(printf %04d $f).jpg" --frame=$f --scale=$sc --gl=swangle --timeout=240000 --log=error --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell || echo "FAIL $f"
done
