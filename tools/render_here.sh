#!/usr/bin/env bash
# Render a whole film in this container through the phone page's own code path (@remotion/web-renderer in headless
# Chromium, software WebGL), then encode with the film's mix. Output: out/render/<YouTube title>.mp4
#   tools/render_here.sh <CompId> [workers=4] [from=0] [to=last]
# Slow: ~20 s/frame/worker on this CPU (a 36 s film = 1092 frames ≈ 1.5 h with 4 workers). Run it in the background.
set -euo pipefail
cd "$(dirname "$0")/.."
ID=$1; W=${2:-4}
read -r TITLE MIX N < <(python3 - "$ID" <<'P'
import re, sys
s = open("web/main.tsx", encoding="utf-8").read()
m = re.search(r'\{ id: "%s",(.*?)\},\n' % sys.argv[1], s)
if not m: sys.exit("no such comp in web/main.tsx")
body = m.group(1)
t = re.search(r'title: "([^"]+)"', body)
title = re.sub(r'[\\/:*?"<>|]', "", t.group(1)).strip() if t else sys.argv[1]
print(title.replace(" ", "\x1f"), "-", "-")
P
)
TITLE=${TITLE//$'\x1f'/ }
FROM=${3:-0}
LAST=${4:-}
if [ -z "$LAST" ]; then
  LAST=$(grep -o "durationInFrames: [A-Z_]*FRAMES\|durationInFrames: [0-9]*" <(grep "id: \"$ID\"" web/main.tsx) | head -1 | awk '{print $2}')
  if ! [[ "$LAST" =~ ^[0-9]+$ ]]; then
    VAR=$LAST; SRC=$(grep -rl "export const $VAR" src | head -1)
    LAST=$(cd /tmp && printf 'import { %s } from "%s";\nconsole.log(%s);\n' "$VAR" "/workspace/Youtube/${SRC%.*}" "$VAR" > rh_n.ts && npx --prefix /workspace/Youtube esbuild rh_n.ts --bundle --platform=node --log-level=error --outfile=rh_n.js && node rh_n.js)
  fi
  LAST=$((LAST - 1))
fi
MIXF=$(grep -rho 'staticFile("audio/[a-z0-9-]*-mix.mp3")' $(grep -rl "id: \"$ID\"" web/main.tsx >/dev/null && grep -o "component: [A-Za-z]*" <(grep "id: \"$ID\"" web/main.tsx) | awk '{print $2}' | xargs -I{} grep -rl "export const {}" src) 2>/dev/null | head -1 | sed 's/staticFile("//;s/")//')
echo "comp $ID frames $FROM..$LAST  mix ${MIXF:-none}  title: $TITLE"
npm run -s web:build >/dev/null
[ -n "$MIXF" ] && cp "public/$MIXF" web/dist/audio/
curl -s -o /dev/null localhost:8765/ || (cd web/dist && setsid nohup python3 -m http.server 8765 >/dev/null 2>&1 < /dev/null &)
sleep 1
FR=out/render/$ID/frames; mkdir -p "$FR"; PIDS=()
for w in $(seq 0 $((W - 1))); do
  L=(); for f in $(seq "$FROM" "$LAST"); do [ $(((f - FROM) % W)) = "$w" ] && [ ! -s "$FR/f$(printf %04d "$f").jpg" ] && L+=("$f"); done
  if [ ${#L[@]} -gt 0 ]; then COMP=$ID node tools/t/websheet.js "$FR" 1 "${L[@]}" > "out/render/$ID/w$w.log" 2>&1 & PIDS+=($!); fi
done
for p in "${PIDS[@]}"; do wait "$p" || true; done
MISS=0; for f in $(seq "$FROM" "$LAST"); do [ -s "$FR/f$(printf %04d "$f").jpg" ] || MISS=$((MISS + 1)); done
[ "$MISS" = 0 ] || { echo "$MISS frames missing: re-run the same command to fill them (logs in out/render/$ID)"; exit 1; }
OUT="out/render/$TITLE.mp4"; [ "$FROM" = 0 ] || OUT="out/render/$ID-$FROM-$LAST.mp4"
A=(); [ -n "$MIXF" ] && A=(-ss "$(python3 -c "print($FROM/30)")" -i "public/$MIXF")
ffmpeg -nostdin -v error -y -framerate 30 -start_number "$FROM" -i "$FR/f%04d.jpg" "${A[@]}" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart ${A:+-c:a aac -b:a 192k -shortest} "$OUT"
echo "wrote $OUT"; ffprobe -v error -show_entries format=duration:stream=width,height -of csv=p=0 "$OUT"
