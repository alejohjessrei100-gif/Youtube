"""Split every full-frame plate into a foreground cut-out (people / main subject) and a cleaned background,
so the engine can move them independently (2.5D parallax, character shakes, slides), as the reference does.

Usage: python split_layers.py <project> [--only ID,ID] [--model isnet-general-use]

Reads : 07_layers/<ID>.png for kinds full (and insert with --inserts)
Writes: 07_layers/<ID>__fg.png  RGBA, same size as the plate, subject only
        07_layers/<ID>__bg.png  RGB, subject area inpainted from its surroundings
        07_layers/_debug/<ID>__split.jpg  quick look
The plate's faces.json entry is copied to <ID>__fg so cartoon faces ride on the foreground layer.
"""
import argparse, json, sys
from pathlib import Path
import numpy as np
import cv2
from PIL import Image
from common import d, project_dir, load_json, save_json, MODELS


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--only", default="")
    ap.add_argument("--model", default="isnet-general-use")
    ap.add_argument("--inserts", action="store_true")
    a = ap.parse_args()
    proj = project_dir(a.project)
    ldir = d(proj, "layers")
    kinds = {x["id"]: x["kind"] for x in load_json(d(proj, "prompts") / "manifest.json")["assets"]}
    want = {"full"} | ({"insert"} if a.inserts else set())
    only = set(filter(None, a.only.split(",")))
    import os
    os.environ.setdefault("U2NET_HOME", str(MODELS / "rembg"))
    from rembg import new_session, remove
    sess = new_session(a.model)
    faces_p = ldir / "faces.json"
    faces = load_json(faces_p) if faces_p.exists() else {}
    (ldir / "_debug").mkdir(exist_ok=True)
    for aid, k in kinds.items():
        if k not in want or (only and aid not in only):
            continue
        src = ldir / f"{aid}.png"
        if not src.exists():
            continue
        im = Image.open(src).convert("RGB")
        mask = remove(im, session=sess, only_mask=True, post_process_mask=True)
        m = np.asarray(mask).astype(np.float32) / 255
        frac = float((m > 0.5).mean())
        if frac < 0.01 or frac > 0.85:      # nothing / everything is "subject": no useful split
            print(f"{aid}: skipped (subject covers {frac:.0%})")
            continue
        rgb = np.asarray(im)
        # images that came back on a green screen (generator ignored the scene): remove green spill from the subject
        b = 10
        border = np.concatenate([rgb[:b].reshape(-1, 3), rgb[-b:].reshape(-1, 3), rgb[:, :b].reshape(-1, 3), rgb[:, -b:].reshape(-1, 3)]).astype(int)
        if np.median(border[:, 1] - np.maximum(border[:, 0], border[:, 2])) > 50:
            f = rgb.astype(np.int16)
            g_lim = np.maximum(f[..., 0], f[..., 2])
            f[..., 1] = np.minimum(f[..., 1], g_lim + 8)
            rgb = np.clip(f, 0, 255).astype(np.uint8)
            m = np.where(m > 0.5, m, m * 0.6)   # tighten the soft edge where green bled in
            print(f"{aid}: green screen detected, spill removed")
        fg = np.dstack([rgb, (np.clip(m, 0, 1) * 255).astype(np.uint8)])
        Image.fromarray(fg, "RGBA").save(ldir / f"{aid}__fg.png")
        # background: inpaint a dilated subject mask so small layer moves never reveal a hole
        hole = (m > 0.15).astype(np.uint8) * 255
        hole = cv2.dilate(hole, np.ones((25, 25), np.uint8))
        small = cv2.resize(rgb, (rgb.shape[1] // 2, rgb.shape[0] // 2))
        hs = cv2.resize(hole, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
        filled = cv2.inpaint(cv2.cvtColor(small, cv2.COLOR_RGB2BGR), hs, 9, cv2.INPAINT_TELEA)
        filled = cv2.cvtColor(cv2.resize(filled, (rgb.shape[1], rgb.shape[0])), cv2.COLOR_BGR2RGB)
        hm = (cv2.GaussianBlur(hole, (31, 31), 0).astype(np.float32) / 255)[..., None]
        bg = (rgb * (1 - hm) + filled * hm).astype(np.uint8)
        bg = cv2.GaussianBlur(bg, (0, 0), 1.2) * hm + bg * (1 - hm)
        Image.fromarray(bg.astype(np.uint8)).save(ldir / f"{aid}__bg.png")
        if aid in faces:
            faces[f"{aid}__fg"] = faces[aid]
        dbg = Image.new("RGB", (im.width * 2, im.height))
        chk = Image.new("RGB", im.size, (40, 160, 60)); chk.paste(Image.fromarray(fg, "RGBA"), mask=Image.fromarray(fg[..., 3]))
        dbg.paste(chk, (0, 0)); dbg.paste(Image.fromarray(bg.astype(np.uint8)), (im.width, 0))
        dbg.thumbnail((800, 800)); dbg.save(ldir / "_debug" / f"{aid}__split.jpg", quality=80)
        print(f"{aid}: split (subject {frac:.0%})")
    save_json(faces_p, faces)


if __name__ == "__main__":
    main()
