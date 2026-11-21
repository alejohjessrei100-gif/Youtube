# per-video caption track: one word at a time, yellow + black outline, tiny pop-in; writes PNGs + an ffmpeg concat list (frame-exact)
#   python3 build.py CAPS.json TOTAL_FRAMES 1080 1920 OUT_DIR      (CAPS.json from mapcap.py)
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from capstyle import render_word
from PIL import Image
FPS = 30
def timeline(caps, total):
    tl = [None] * total
    for i, (w, s, e, _) in enumerate(caps):
        nxt = caps[i + 1][1] if i + 1 < len(caps) else e + 0.3
        end = nxt if nxt - e < 0.35 else e + 0.12
        f0, f1 = int(round(s * FPS)), int(round(end * FPS))
        for f in range(max(0, f0), min(total, f1)):
            k = f - f0; tl[f] = (i, 0 if k == 0 else 1 if k == 1 else 2)
    return tl
POP = [1.10, 1.04, 1.0]
def build(capsfile, total, W, H, out):
    caps = json.load(open(capsfile))
    os.makedirs(out, exist_ok=True)
    from capstyle import BAND
    Image.new("RGBA", (W, int(round(H * BAND))), (0, 0, 0, 0)).save(os.path.join(out, "blank.png"), optimize=True)
    tl = timeline(caps, total); need = sorted(set(x for x in tl if x))
    for (i, p) in need:
        fn = os.path.join(out, "w%03d_%d.png" % (i, p))
        if not os.path.exists(fn): render_word(caps[i][0], W, H, POP[p], band=True).save(fn, compress_level=6)
    runs = []
    for x in tl:
        fn = "blank.png" if x is None else "w%03d_%d.png" % x
        if runs and runs[-1][0] == fn: runs[-1][1] += 1
        else: runs.append([fn, 1])
    with open(os.path.join(out, "list.txt"), "w") as f:
        f.write("ffconcat version 1.0\n")
        for fn, n in runs: f.write("file '%s'\nduration %.6f\n" % (fn, n / FPS))
        f.write("file '%s'\n" % runs[-1][0])
    return tl
if __name__ == "__main__":
    name, total, W, H, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
    tl = build(name, total, W, H, out); print(name, "frames", total, "with text", sum(1 for x in tl if x))
