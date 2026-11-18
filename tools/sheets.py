"""Contact sheet of a stills round, to show the creator in one image.

    python tools/sheets.py <folder of stills jpg/png> <out.jpg> [--cols 5] [--w 300]
Each tile is labelled with its file name (01_intro_wide ...). Vertical 9:16 tiles.
"""
import os, sys, glob
from PIL import Image, ImageDraw, ImageFont

def main():
    a = sys.argv[1:]
    if len(a) < 2: print(__doc__); sys.exit(1)
    src, out = a[0], a[1]
    cols = int(a[a.index('--cols') + 1]) if '--cols' in a else 5
    W = int(a[a.index('--w') + 1]) if '--w' in a else 300; H = int(W * 16 / 9); LB = 26
    fs = sorted(glob.glob(os.path.join(src, '*.jpg')) + glob.glob(os.path.join(src, '*.png')))
    if not fs: raise SystemExit('no stills in ' + src)
    rows = (len(fs) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * W + (cols + 1) * 6, rows * (H + LB) + (rows + 1) * 6), (24, 24, 28))
    try: font = ImageFont.truetype('DejaVuSans-Bold.ttf', 15)
    except Exception: font = ImageFont.load_default()
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(fs):
        im = Image.open(f).convert('RGB'); im.thumbnail((W, H)); x = 6 + (i % cols) * (W + 6); y = 6 + (i // cols) * (H + LB + 6)
        sheet.paste(im, (x + (W - im.width) // 2, y)); d.text((x + 4, y + H + 4), os.path.splitext(os.path.basename(f))[0][:34], fill=(235, 235, 235), font=font)
    sheet.save(out, quality=88); print('sheet', out, len(fs), 'stills')

if __name__ == '__main__':
    main()
