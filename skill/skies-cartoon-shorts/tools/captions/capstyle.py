from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
FONT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "Montserrat-800.ttf")
def font_for(W):
    # size so "gigantic" spans ~35% of the frame width, like the reference
    s = 100; f = ImageFont.truetype(FONT, s); w = f.getlength("gigantic"); return int(s * 0.35 * W / w)
BAND = 0.16
def band_top(H): return int(round(H * 0.686 - H * BAND / 2))
def render_word(word, W, H, scale=1.0, maxw=0.86, band=False):
    size = font_for(W); s = int(size * scale)
    f = ImageFont.truetype(FONT, s)
    while f.getlength(word) > maxw * W and s > 10: s -= 2; f = ImageFont.truetype(FONT, s)
    sw = max(2, round(s * 0.085))
    BH = int(round(H * BAND)); full = (W, H)
    img = Image.new("RGBA", (W, BH), (0, 0, 0, 0)); cx, cy = W / 2, H * 0.686 - band_top(H)
    # soft drop shadow
    sh = Image.new("RGBA", (W, BH), (0, 0, 0, 0)); d = ImageDraw.Draw(sh)
    d.text((cx, cy + s * 0.06), word, font=f, anchor="mm", fill=(0, 0, 0, 150), stroke_width=sw, stroke_fill=(0, 0, 0, 150))
    sh = sh.filter(ImageFilter.GaussianBlur(s * 0.05)); img.alpha_composite(sh)
    d = ImageDraw.Draw(img)
    d.text((cx, cy), word, font=f, anchor="mm", fill=(255, 255, 255, 255), stroke_width=sw, stroke_fill=(0, 0, 0, 255))
    if band: return img
    o = Image.new("RGBA", full, (0, 0, 0, 0)); o.paste(img, (0, band_top(H))); return o
