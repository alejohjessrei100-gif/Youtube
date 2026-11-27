"""Find every face in the processed layers and record where the cartoon eyes and mouth go.

Usage: python faces.py <project> [--debug]

Reads : 07_layers/*.png  (only kinds char / full / bg / ref from the manifest; props and inserts are skipped)
Writes: 07_layers/faces.json   {asset_id: {w, h, faces: [ {...geometry in image pixels...} ]}}
        07_layers/_debug/<ID>.jpg with markers when --debug is given

Geometry per face (image pixel coordinates of the layer PNG):
  eyeL / eyeR : centres of the image-left and image-right eye
  eyeW        : width of one cartoon eye  (0.26 x face width, rule 4.4 of the blueprint)
  mouth       : centre of the cartoon mouth (moved below a moustache if one is detected)
  mouthW      : base width for line mouths (0.24 x face width); open mouths scale from it
  faceW, faceH, roll (degrees, clockwise positive), yaw (-1 left .. +1 right)
  browY       : top limit for the eyes (cartoon eyes must not cover the real brows)
"""
import sys, math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from common import d, project_dir, load_json, save_json, MODELS

SKIP = {"prop", "insert", "bg"}   # empty sets have no people (avoids "faces" in moons and rocks)


def detector():
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python import vision
    opts = vision.FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(MODELS / "face_landmarker.task")),
        running_mode=vision.RunningMode.IMAGE, num_faces=12,
        min_face_detection_confidence=0.3, min_face_presence_confidence=0.3)
    return mp, vision.FaceLandmarker.create_from_options(opts)


def detect_all(mp, det, rgb_img):
    """Find faces at any size: one pass on the whole image plus overlapping zoomed tiles,
    so small faces in full-body and crowd shots are found too. Returns landmark arrays in pixels."""
    W, H = rgb_img.size
    found = []

    def run(x0, y0, tw, th):
        crop = rgb_img.crop((x0, y0, x0 + tw, y0 + th))
        s = 960 / max(tw, th)
        crop = crop.resize((max(1, round(tw * s)), max(1, round(th * s))), Image.LANCZOS)
        res = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(np.asarray(crop))))
        for lms in res.face_landmarks:
            found.append(np.array([[x0 + p.x * tw, y0 + p.y * th] for p in lms]))

    run(0, 0, W, H)
    for frac in (0.5, 0.3):                       # tile sizes relative to the shorter side
        t = int(min(W, H) * frac / 0.5625) if H > W else int(min(W, H) * frac)
        t = max(160, min(t, max(W, H)))
        step = max(1, int(t * 0.5))
        for y0 in range(0, max(1, H - t + step), step):
            for x0 in range(0, max(1, W - t + step), step):
                run(min(x0, max(0, W - t)), min(y0, max(0, H - t)), min(t, W), min(t, H))
    # merge duplicates (same face found in several tiles): keep the one seen largest/most central
    cands = []
    for pts in sorted(found, key=lambda p: -np.linalg.norm(p[454] - p[234])):
        c = pts[[10, 152]].mean(axis=0)
        fw = np.linalg.norm(pts[454] - pts[234])
        if fw < 10:
            continue
        if all(np.linalg.norm(c - q[[10, 152]].mean(axis=0)) > 0.5 * np.linalg.norm(q[454] - q[234]) for q in cands):
            cands.append(pts)
    # zoomed tiles produce false "faces" on knees, fists, dials and wood grain: verify each one
    rgb = np.asarray(rgb_img)
    return [p for p in cands if redetects(mp, det, rgb_img, p) and eyes_darker(p, rgb)]


def eyes_darker(pts, rgb):
    """Real eyes (pupils, lashes, eye sockets) are darker than the cheeks; knees and fists are not."""
    H, W = rgb.shape[:2]
    lum = lambda xy, r: float(np.mean(0.299 * rgb[max(0, int(xy[1]) - r):int(xy[1]) + r + 1, max(0, int(xy[0]) - r):int(xy[0]) + r + 1, 0]
                                      + 0.587 * rgb[max(0, int(xy[1]) - r):int(xy[1]) + r + 1, max(0, int(xy[0]) - r):int(xy[0]) + r + 1, 1]
                                      + 0.114 * rgb[max(0, int(xy[1]) - r):int(xy[1]) + r + 1, max(0, int(xy[0]) - r):int(xy[0]) + r + 1, 2]))
    fw = np.linalg.norm(pts[454] - pts[234])
    r = max(1, int(fw * 0.04))
    eyes = (lum(pts[468] if len(pts) > 468 else (pts[33] + pts[133]) / 2, r) + lum(pts[473] if len(pts) > 473 else (pts[263] + pts[362]) / 2, r)) / 2
    cheeks = (lum(pts[205], r * 2) + lum(pts[425], r * 2)) / 2
    # On dark skin pupils and cheeks are both dark, so the contrast test means nothing there;
    # rely on the re-detection check alone in that case.
    return eyes < cheeks * 0.9 or cheeks < 95


def looks_like_skin(pts, rgb):
    H, W = rgb.shape[:2]
    idx = (205, 425, 50, 280, 4, 151)                         # cheeks, nose, forehead
    px = np.array([rgb[int(np.clip(pts[i][1], 0, H - 1)), int(np.clip(pts[i][0], 0, W - 1))] for i in idx]).astype(float)
    r, g, b = np.median(px, axis=0)
    mx, mn = max(r, g, b), min(r, g, b)
    sat = (mx - mn) / (mx + 1e-6)
    # skin: red >= green >= blue-ish, warm, not grey/blue/green; allow dim (night) and cool-lit skin
    return r >= g * 0.95 and r > b * 1.05 and 0.08 <= sat <= 0.75 and mx > 35


def redetects(mp, det, rgb_img, pts):
    """A real face is found again in a crop centred on it; a knee or a dial usually isn't."""
    W, H = rgb_img.size
    c = pts[[10, 152]].mean(axis=0)
    fw = np.linalg.norm(pts[454] - pts[234])
    s = fw * 2.6
    x0, y0 = int(max(0, c[0] - s / 2)), int(max(0, c[1] - s / 2))
    x1, y1 = int(min(W, c[0] + s / 2)), int(min(H, c[1] + s / 2))
    crop = rgb_img.crop((x0, y0, x1, y1)).resize((512, max(1, round(512 * (y1 - y0) / max(1, x1 - x0)))), Image.LANCZOS)
    res = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(np.asarray(crop))))
    for lms in res.face_landmarks:
        cx = x0 + np.mean([lms[10].x, lms[152].x]) * (x1 - x0)
        cy = y0 + np.mean([lms[10].y, lms[152].y]) * (y1 - y0)
        if np.hypot(cx - c[0], cy - c[1]) < 0.35 * fw:
            return True
    return False


def geometry(pts, w, h, rgb):
    P = lambda i: pts[i]
    eye_r_img_left = (P(33) + P(133) + P(159) + P(145)) / 4     # subject's right eye = image left
    eye_l_img_right = (P(263) + P(362) + P(386) + P(374)) / 4
    face_w = float(np.linalg.norm(P(454) - P(234)))
    face_h = float(np.linalg.norm(P(152) - P(10)))
    dx, dy = eye_l_img_right - eye_r_img_left
    roll = math.degrees(math.atan2(dy, dx))
    mid = (P(234) + P(454)) / 2
    # yaw from eye-to-nose distances (robust when the far cheek contour is hidden): ~0.5 = three-quarter view
    # yaw from the two eyes' widths: the far eye looks narrower; unaffected by the head tipping back
    wl, wr = np.linalg.norm(P(33) - P(133)), np.linalg.norm(P(263) - P(362))
    yaw = float(np.clip((wl - wr) / (wl + wr + 1e-6) * 2.4, -1, 1))   # >0: face turned toward image right
    mouth = (P(61) + P(291) + P(0) + P(17)) / 4
    real_mouth_w = float(np.linalg.norm(P(291) - P(61)))
    # moustache check: dark pixels between nose base (2) and upper lip (0)
    nb, ul = P(2), P(0)
    ys = np.linspace(nb[1], ul[1], 6)[1:-1]
    xs = np.linspace(P(61)[0], P(291)[0], 7)[1:-1]
    samples = [rgb[int(np.clip(y, 0, h - 1)), int(np.clip(x, 0, w - 1))] for y in ys for x in xs]
    lum = np.mean([0.299 * s[0] + 0.587 * s[1] + 0.114 * s[2] for s in samples])
    cheek = rgb[int(np.clip(P(205)[1], 0, h - 1)), int(np.clip(P(205)[0], 0, w - 1))]
    cheek_lum = 0.299 * cheek[0] + 0.587 * cheek[1] + 0.114 * cheek[2]
    moustache = bool(lum < cheek_lum * 0.55)
    if moustache:
        mouth = mouth + np.array([0, face_h * 0.025])
    # size basis: three-quarter faces are foreshortened in width, so also use the face height
    size = max(face_w, face_h * 0.85)
    brow_y = float(min(P(105)[1], P(334)[1]))
    sk = [rgb[int(np.clip(P(i)[1], 0, h - 1)), int(np.clip(P(i)[0], 0, w - 1))] for i in (205, 425, 50, 280)]
    skin = "#%02x%02x%02x" % tuple(int(v) for v in np.median(np.array(sk), axis=0))
    return {
        "eyeL": [round(float(v), 1) for v in eye_r_img_left],
        "eyeR": [round(float(v), 1) for v in eye_l_img_right],
        "eyeW": round(size * 0.26, 1),   # eye size relative to the face
        "mouth": [round(float(v), 1) for v in mouth],
        "mouthW": round(max(size * 0.25, real_mouth_w * 1.1), 1),
        "faceW": round(face_w, 1), "faceH": round(face_h, 1),
        "center": [round(float(v), 1) for v in (P(10) + P(152)) / 2],
        "roll": round(roll, 1), "yaw": round(yaw, 2),
        "browY": round(brow_y, 1), "moustache": moustache, "skin": skin,
    }


def main():
    proj = project_dir(sys.argv[1])
    debug = "--debug" in sys.argv
    ldir = d(proj, "layers")
    kinds = {a["id"]: a["kind"] for a in load_json(d(proj, "prompts") / "manifest.json")["assets"]}
    mp, det = detector()
    out = {}
    for f in sorted(ldir.glob("*.png")):
        aid = f.stem
        if kinds.get(aid) in SKIP or aid not in kinds:
            continue
        im = Image.open(f)
        if im.mode == "RGBA":          # detect on a neutral grey backdrop
            bg = Image.new("RGB", im.size, (128, 128, 128))
            bg.paste(im, mask=im.getchannel("A"))
            rgb_img = bg
        else:
            rgb_img = im.convert("RGB")
        rgb = np.asarray(rgb_img)
        faces = [geometry(pts, im.width, im.height, rgb) for pts in detect_all(mp, det, rgb_img)]
        if kinds.get(aid) in ("char", "ref") and len(faces) > 1:   # a cut-out shows one person
            faces = [max(faces, key=lambda g: g["faceW"])]
        faces.sort(key=lambda g: g["center"][0])      # face 0 = left-most
        out[aid] = {"w": im.width, "h": im.height, "faces": faces}
        if debug:
            dbg = rgb_img.copy(); dr = ImageDraw.Draw(dbg)
            for k, g in enumerate(faces):
                for e in (g["eyeL"], g["eyeR"]):
                    r = g["eyeW"] / 2
                    dr.ellipse([e[0] - r, e[1] - r, e[0] + r, e[1] + r], outline=(255, 0, 0), width=3)
                m, mw = g["mouth"], g["mouthW"] / 2
                dr.line([m[0] - mw, m[1], m[0] + mw, m[1]], fill=(0, 255, 255), width=3)
                dr.text((g["center"][0], g["center"][1] - g["faceH"] * 0.7), str(k), fill=(255, 255, 0))
            (ldir / "_debug").mkdir(exist_ok=True)
            dbg.convert("RGB").save(ldir / "_debug" / f"{aid}.jpg", quality=85)
        print(f"{aid}: {len(faces)} face(s)")
    # keep the split cut-outs' faces (split_layers copies them; re-running faces.py must not drop them)
    for aid in list(out):
        if (ldir / f"{aid}__fg.png").exists():
            out[f"{aid}__fg"] = out[aid]
    save_json(ldir / "faces.json", out)
    no_face = [k for k, v in out.items() if not v["faces"] and kinds.get(k) in ("char", "full", "ref")]
    if no_face:
        print("WARNING no face found in:", ", ".join(no_face), "(character turned away, too small, or covered)")


if __name__ == "__main__":
    main()
