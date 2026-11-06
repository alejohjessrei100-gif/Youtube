#!/usr/bin/env bash
# Unpack the repo's zipped resources into work/ (needs Node 22.6+, python3 with numpy + scipy, ffmpeg, playwright).
set -euo pipefail
cd "$(dirname "$0")"; Z=../..
mkdir -p work/vendor work/kit
unzip -o -q $Z/three.module.js.zip -d work/vendor
unzip -o -q -j $Z/cartoon-short-kit.zip 'cartoon-short-kit/engine/motion.js' -d work/vendor
unzip -o -q -j $Z/toon.txt.zip toon.txt -d work/vendor
node -e "const m=require('node:module'),fs=require('fs');fs.writeFileSync('work/vendor/toon.js',m.stripTypeScriptTypes(fs.readFileSync('work/vendor/toon.txt','utf8')))"
unzip -o -q $Z/cartoon-short-kit.zip 'cartoon-short-kit/templates/audio/*' 'cartoon-short-kit/example/soldier/audio.py' -d work/kit
echo "work/ ready"
