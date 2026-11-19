"""Post: bloom + vignette + one-word captions, upscale to 1080x1920, encode MP4.

Usage: python3 post.py frames_full out/blender_5s.mp4
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30
W, H = 1080, 1920

LINE = "She traded her only lantern for the moon, and the whole village laughed."
START, WPS = 0.15, 3.6
WORDS = [(w, START + i / WPS, START + (i + 1) / WPS if i < len(LINE.split()) - 1 else 5.0)
         for i, w in enumerate(LINE.split())]
FONT = ImageFont.truetype(os.path.join(HERE, "Poppins-ExtraBold.ttf"), 82)


def bloom(img):
    a = np.asarray(img).astype(np.float32) / 255
    lum = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    mask = np.clip((lum - 0.72) / 0.28, 0, 1)[..., None]
    bright = Image.fromarray((a * mask * 255).astype(np.uint8))
    glow = np.zeros_like(a)
    for r, wgt in ((8, 0.5), (24, 0.35), (60, 0.3)):
        glow += np.asarray(bright.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255 * wgt
    out = 1 - (1 - a) * (1 - glow)  # screen blend
    return out


def vignette(a):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H * 0.47) / (H * 0.6)) ** 2)
    v = 1 - 0.45 * np.clip((d - 0.55) / 0.6, 0, 1) ** 1.5
    return a * v[..., None]


VIG = None


def caption(img, t):
    word = next((w for w, s, e in WORDS if s <= t < e), None)
    if not word:
        return img
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    bbox = d.textbbox((0, 0), word, font=FONT, stroke_width=8)
    x = (W - (bbox[2] - bbox[0])) / 2 - bbox[0]
    y = 1290
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).text((x, y + 5), word, font=FONT, fill=(0, 0, 0, 150), stroke_width=8, stroke_fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    d.text((x, y), word, font=FONT, fill="white", stroke_width=8, stroke_fill="black")
    out = Image.alpha_composite(img.convert("RGBA"), shadow)
    return Image.alpha_composite(out, layer).convert("RGB")


def main():
    src, dst = sys.argv[1], sys.argv[2]
    tmp = os.path.join(HERE, "post_frames")
    os.makedirs(tmp, exist_ok=True)
    os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)
    files = sorted(f for f in os.listdir(src) if f.endswith(".png"))
    for i, f in enumerate(files):
        img = Image.open(os.path.join(src, f)).convert("RGB").resize((W, H), Image.LANCZOS)
        a = vignette(bloom(img))
        img = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
        img = caption(img, int(f[1:5]) / FPS)
        img.save(os.path.join(tmp, f"p{i:04d}.png"))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(tmp, "p%04d.png"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "slow", dst], check=True)
    print("wrote", dst)


if __name__ == "__main__":
    main()
