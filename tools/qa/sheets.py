# Contact sheets with frame labels. usage: python -I tools/qa/sheets.py FRAME_DIR OUT_DIR [per_sheet=8] [cols=4] [step=1]
#   frames named f0001.jpg... (ffmpeg) or f0044.jpg (websheet); the label shows the file name and, with step, the time.
import glob, os, sys
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
per = int(sys.argv[3]) if len(sys.argv) > 3 else 8
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 4
os.makedirs(out, exist_ok=True)
fs = sorted(glob.glob(os.path.join(src, "f*.jpg")))
for k in range(0, len(fs), per):
    ims = [Image.open(f) for f in fs[k:k + per]]
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    sh = Image.new("RGB", (w * cols, h * rows))
    for i, im in enumerate(ims):
        x, y = (i % cols) * w, (i // cols) * h
        sh.paste(im, (x, y))
        ImageDraw.Draw(sh).text((x + 8, y + 8), os.path.basename(fs[k + i]), fill=(255, 0, 0))
    sh.save(os.path.join(out, "sheet%02d.jpg" % (k // per)), quality=82)
print(len(fs), "frames ->", (len(fs) + per - 1) // per, "sheets in", out)
