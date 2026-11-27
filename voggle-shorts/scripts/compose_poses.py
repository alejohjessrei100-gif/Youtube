"""Put a second-pose image that came back on GREEN SCREEN into its scene: key it and composite it onto the
first pose's cleaned background, so the pose swap stays in the same place.

Usage: python compose_poses.py <project> B_ID:A_ID:mode[:x,y,h] [B_ID:A_ID:mode ...]
  modes
    face   scale the new pose so its eyes match the first pose's eyes (same face size and place). For waist-up shots.
    bleed  head where the first pose's head was, body runs off the bottom of the frame. For low-angle / knees-up
           shots, so the new pose never floats.
    feet   stand the new pose on its feet at (x, y) as frame fractions, h = body height as a fraction of the frame,
           for example 0.5,0.92,0.75. Adds a soft contact shadow.
  example: compose_poses.py my-video N17B_FULL:N17A_FULL:bleed N28B_FULL:N28A_FULL:face

Needs: prep_images + faces + split_layers already run (uses 07_layers/<A>.png, <A>__fg.png and faces.json).
Writes: 06_images/<B>.jpg (the composite). The green original is kept in 06_images/_green/<B>.jpg and is always
the input, so re-running is safe. Afterwards: prep_images, faces, split_layers --only <B>, build_timeline.
"""
import shutil, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter
from common import d, project_dir, load_json

W, H = 1080, 1920


def cover(im):
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))


def key_green(path):
    a = np.asarray(cover(Image.open(path).convert("RGB"))).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    al = np.clip(1 - (g - np.maximum(r, b) - 25) / 40, 0, 1)
    al = cv2.GaussianBlur(cv2.erode((al * 255).astype(np.uint8), np.ones((3, 3), np.uint8)), (3, 3), 0)
    a[..., 1] = np.minimum(g, np.maximum(r, b) + 8)      # despill
    return Image.fromarray(np.dstack([a, al]).astype(np.uint8), "RGBA")


def bbox(rgba):
    ys, xs = np.nonzero(np.asarray(rgba.getchannel("A")) > 128)
    return xs.min(), ys.min(), xs.max(), ys.max()


def clean_bg(ldir, a_id):
    """First plate with its subject replaced by a smooth per-row fill of the surrounding background
    (cleaner than inpainting for skies, walls and plain backdrops)."""
    src = np.asarray(Image.open(ldir / f"{a_id}.png").convert("RGB")).astype(np.float32)
    m = np.asarray(Image.open(ldir / f"{a_id}__fg.png").getchannel("A")) > 20
    m = cv2.dilate(m.astype(np.uint8), np.ones((61, 61), np.uint8)) > 0
    out = src.copy()
    for y in range(H):
        row = src[y][~m[y]]
        if len(row):
            out[y][m[y]] = np.median(row, 0)
    out = cv2.GaussianBlur(out, (0, 0), 3) * m[..., None] + src * (~m[..., None])
    return Image.fromarray(out.astype(np.uint8))


def tint(fg, bg, k=0.3):
    """Pull the cut-out's colour part of the way toward the scene's light."""
    a = np.asarray(fg).astype(np.float32)
    m = a[..., 3] > 128
    t = np.clip(np.asarray(bg).reshape(-1, 3).mean(0) / a[m][:, :3].mean(0), 0.6, 1.4) ** k
    a[..., :3] = np.clip(a[..., :3] * t, 0, 255)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def place(bg, fg, s, anchor_fg, anchor_bg, shadow=None):
    fg = fg.resize((round(fg.width * s), round(fg.height * s)), Image.LANCZOS)
    off = (int(round(anchor_bg[0] - anchor_fg[0] * s)), int(round(anchor_bg[1] - anchor_fg[1] * s)))
    out = bg.convert("RGBA")
    if shadow:
        sh = Image.new("RGBA", bg.size, (0, 0, 0, 0))
        cx, cy, rw = shadow
        ImageDraw.Draw(sh).ellipse([cx - rw, cy - rw * 0.12, cx + rw, cy + rw * 0.12], fill=(0, 0, 0, 120))
        out = Image.alpha_composite(out, sh.filter(ImageFilter.GaussianBlur(16)))
    lay = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    lay.paste(fg, off, fg)
    return Image.alpha_composite(out, lay).convert("RGB")


def eye_mid(face):
    return np.mean([face["eyeL"], face["eyeR"]], 0), float(np.linalg.norm(np.subtract(face["eyeR"], face["eyeL"])))


def main():
    proj = project_dir(sys.argv[1])
    idir, ldir = d(proj, "images"), d(proj, "layers")
    faces = load_json(ldir / "faces.json")
    (idir / "_green").mkdir(exist_ok=True)
    for job in sys.argv[2:]:
        parts = job.split(":")
        b_id, a_id, mode = parts[0], parts[1], parts[2]
        src = next(idir.glob(f"{b_id}.*"))
        green = idir / "_green" / (b_id + ".jpg")
        if not green.exists():
            Image.open(src).convert("RGB").save(green, quality=95)
        fg = key_green(green)
        x0, y0, x1, y1 = bbox(fg)
        bg = clean_bg(ldir, a_id)
        fg = tint(fg, bg)
        fa = (faces.get(a_id) or {}).get("faces") or []
        fb = (faces.get(b_id) or {}).get("faces") or []
        if mode in ("face", "bleed") and not (fa and fb):
            sys.exit(f"{job}: needs a detected face in both images (run faces.py), or use mode feet")
        if mode == "face":
            (ca, da), (cb, db_) = eye_mid(fa[0]), eye_mid(fb[0])
            out = place(bg, fg, da / db_, cb, ca)
        elif mode == "bleed":
            (ca, da), (cb, db_) = eye_mid(fa[0]), eye_mid(fb[0])
            s = max(da / db_, (H * 1.04 - ca[1]) / max(1, y1 - cb[1]))   # bottom of the body below the frame
            out = place(bg, fg, s, cb, ca)
        elif mode == "feet":
            x, y, h = (float(v) for v in parts[3].split(","))
            s = h * H / max(1, y1 - y0)
            out = place(bg, fg, s, ((x0 + x1) / 2, y1), (x * W, y * H), shadow=(x * W, y * H, 0.2 * W))
        else:
            sys.exit(f"unknown mode {mode}")
        dst = idir / (b_id + ".jpg")
        out.save(dst, quality=95)
        if src != dst:
            src.unlink()
        print(f"{b_id}: composited on {a_id} ({mode})")


if __name__ == "__main__":
    main()
