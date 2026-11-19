#!/usr/bin/env bash
# Pack this project as a private Kaggle dataset (src, public, config, package files; no node_modules / out / research).
#   tools/kaggle/pack.sh MapleStreet [Crow Graves ...]     -> out/kaggle/dataset (+ render.json listing the comps to render)
# Then: python3 tools/kaggle/push.py   (creates/updates the dataset and the render script on Kaggle)
set -euo pipefail
cd "$(dirname "$0")/../.."
[ $# -ge 1 ] || { echo "usage: pack.sh COMP [COMP...]"; exit 1; }
D=out/kaggle/dataset; rm -rf "$D"; mkdir -p "$D"
tar --exclude=node_modules --exclude=out --exclude=research --exclude=.git --exclude=web/dist --exclude=build --exclude=blender --exclude='public/audio/*-raw.mp3' \
  -czf "$D/project.tgz" src public package.json package-lock.json remotion.config.ts tsconfig.json
python3 - "$@" <<'P'
import json, re, sys
titles = {}
for m in re.finditer(r'id: "([A-Za-z0-9]+)", title: "([^"]+)"', open("web/main.tsx", encoding="utf-8").read()):
    titles[m.group(1)] = re.sub(r'[\\/:*?"<>|]', "", m.group(2)).strip()
comps = [{"id": c, "file": (titles.get(c, c) + ".mp4")} for c in sys.argv[1:]]
json.dump({"comps": comps}, open("out/kaggle/dataset/render.json", "w"), ensure_ascii=False, indent=1)
P
cat > "$D/dataset-metadata.json" <<J
{"title": "youtube-shorts-project", "id": "alejohjessrei/youtube-shorts-project", "licenses": [{"name": "CC0-1.0"}]}
J
ls -la "$D"; cat "$D/render.json"
