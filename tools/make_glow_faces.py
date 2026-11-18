"""Make a 'glow' copy of the face pack for characters with a very dark head (faces2 -> faces2_glow).

Black outlines/brows/mouth lines would vanish on a black head, so they are re-coloured light.
Dark pupils that sit inside the white of an eye stay dark.   python tools/make_glow_faces.py [kit folder]
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter
GLOW = (214, 232, 255)
def main():
    kit = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src, dst = os.path.join(kit, 'faces2'), os.path.join(kit, 'faces2_glow'); os.makedirs(dst, exist_ok=True)
    for fn in sorted(os.listdir(src)):
        if not fn.endswith('.png'): continue
        if fn.startswith('S_'):        # specials: same treatment
            pass
        im = Image.open(os.path.join(src, fn)).convert('RGBA'); a = np.asarray(im).astype(np.float32)
        lum = a[..., :3].mean(-1); op = a[..., 3] > 40
        white = (lum > 215) & op; dark = (lum < 90) & op
        wf = np.asarray(Image.fromarray((white * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(26))).astype(np.float32) / 255.
        wl = np.asarray(Image.fromarray((dark * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(26))).astype(np.float32) / 255.
        pupil = dark & (wf > .3) & (wf > wl * .5)          # mostly surrounded by white and not a long line -> stays dark
        glow = dark & ~pupil
        out = a.copy()
        for c in range(3): out[..., c] = np.where(glow, GLOW[c], out[..., c])
        Image.fromarray(out.astype(np.uint8)).save(os.path.join(dst, fn))
    print('wrote', dst)
if __name__ == '__main__': main()
