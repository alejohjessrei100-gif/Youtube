# Crop the emblem out of a logo, drop the outer white background, pixelate.
# usage: python3 pixelate.py in out x0 y0 x1 y1 pixels_wide
import sys
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]; box = tuple(map(int, sys.argv[3:7])); px = int(sys.argv[7])
im = Image.open(src).convert('RGB').crop(box)
# flood-fill near-white background from every border pixel with a marker colour
mark = (255, 0, 255); w, h = im.size
for x in range(w):
    for y in (0, h - 1):
        if sum(im.getpixel((x, y))) > 690: ImageDraw.floodfill(im, (x, y), mark, thresh=40)
for y in range(h):
    for x in (0, w - 1):
        if sum(im.getpixel((x, y))) > 690: ImageDraw.floodfill(im, (x, y), mark, thresh=40)
rgba = im.convert('RGBA'); rgba.putdata([(0, 0, 0, 0) if p[:3] == mark else p for p in rgba.getdata()])
rgba = rgba.crop(rgba.getbbox())
ph = round(px * rgba.height / rgba.width)
small = rgba.resize((px, ph), Image.BOX)
small.putdata([(r, g, b, 255) if a > 110 else (0, 0, 0, 0) for r, g, b, a in small.getdata()])
small.resize((px * 16, ph * 16), Image.NEAREST).save(out)
print(out, small.size)
