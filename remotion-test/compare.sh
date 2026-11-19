#!/bin/bash
# Render stills for each shot and place them beside reference frames.
set -e
REF=/tmp/claude-0/-home-user-Youtube/9926c2a7-180f-5e1e-b5f6-03e9b422de5d/scratchpad/rick/ref
mkdir -p out/cmp
for f in 30 80 130; do
  npx remotion still src/index.ts Test out/cmp/f$f.png --frame=$f --gl=swangle --log=error --timeout=120000
done
ffmpeg -v error -y -i $REF/r01_1.0.png -i out/cmp/f30.png -i $REF/r01_8.5.png -i out/cmp/f80.png -i $REF/r01_3.2.png -i out/cmp/f130.png \
  -filter_complex "[0]scale=360:640[a];[1]scale=360:640[b];[2]scale=360:640[c];[3]scale=360:640[d];[4]scale=360:640[e];[5]scale=360:640[f];[a][b][c][d][e][f]hstack=6" out/cmp/compare.png
