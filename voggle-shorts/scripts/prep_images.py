"""Check uploaded images against the prompt manifest and turn them into engine layers.

Usage: python prep_images.py <project>

Reads : 05_prompts/manifest.json, 06_images/*.(png|jpg|jpeg|webp)
Writes: 07_layers/<ID>.png      bg / full / insert -> 1080x1920 opaque plate (cover-cropped)
                                char / prop / ref  -> RGBA cut-out, green removed, trimmed
        07_layers/image_report.md   missing / extra / misnamed / flagged images
Exit code 1 if anything blocks assembly (missing images).
"""
import difflib, re, sys
from pathlib import Path
import numpy as np
from PIL import Image
from common import d, project_dir, load_json, W, H

EXTS = (".png", ".jpg", ".jpeg", ".webp")
CUTOUT = {"char", "prop", "ref"}
PLATE = {"bg", "full", "insert"}


def key_green(img):
    """Chroma-key a (near) green background. Returns RGBA image and stats."""
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # sample the key colour from a 12 px border
    m = 12
    border = np.concatenate([a[:m].reshape(-1, 3), a[-m:].reshape(-1, 3), a[:, :m].reshape(-1, 3), a[:, -m:].reshape(-1, 3)])
    kr, kg, kb = np.median(border, axis=0)
    key_strength = kg - max(kr, kb)
    gness = g - np.maximum(r, b)                      # how green each pixel is
    lo, hi = key_strength * 0.25, key_strength * 0.60  # soft edge band
    alpha = np.clip((hi - gness) / max(1.0, hi - lo), 0, 1)
    # despill: pull green down to the max of red/blue where it dominates
    spill = np.clip(gness, 0, None)
    g2 = np.where(gness > 0, np.minimum(g, np.maximum(r, b) + spill * 0.15), g)
    out = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(out, "RGBA")
    # light edge clean-up: shrink alpha by 1 px via min filter
    from PIL import ImageFilter
    al = im.getchannel("A").filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    im.putalpha(al)
    bbox = al.point(lambda v: 255 if v > 24 else 0).getbbox()
    stats = {
        "key_rgb": [int(kr), int(kg), int(kb)],
        "key_strength": float(key_strength),
        "touches_edge": bool(bbox and (bbox[0] <= 2 or bbox[1] <= 2 or bbox[2] >= im.width - 3 or bbox[3] >= im.height - 3)),
        "subject_frac": float((np.asarray(al) > 128).mean()),
    }
    if bbox:
        pad = 8
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(im.width, bbox[2] + pad), min(im.height, bbox[3] + pad))
        im = im.crop(bbox)
    return im, stats


def cover(img):
    img = img.convert("RGB")
    s = max(W / img.width, H / img.height)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    x, y = (img.width - W) // 2, (img.height - H) // 2
    return img.crop((x, y, x + W, y + H))


def main():
    proj = project_dir(sys.argv[1])
    man = load_json(d(proj, "prompts") / "manifest.json")["assets"]
    src_dir, out_dir = d(proj, "images"), d(proj, "layers")
    # Google Flow downloads add a hash suffix ("BG_01_a3579710.jpg"); strip it so the ID matches
    strip = lambda s: re.sub(r"[_\- ](?:[0-9a-f]{6,12}|\(\d+\)|copy|\d)$", "", s, flags=re.I)
    files = {}
    for p in sorted(src_dir.iterdir(), key=lambda x: x.stat().st_mtime):   # newest wins on duplicates
        if p.suffix.lower() in EXTS:
            files[strip(p.stem)] = p
    norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
    by_norm = {norm(k): k for k in files}
    want = {a["id"]: a for a in man}
    missing, flagged, done, renamed = [], [], [], []
    used_files = set()
    for aid, a in want.items():
        f = files.get(aid)
        if f is None and norm(aid) in by_norm:          # e.g. "s07_bg (1).png" or case differences
            f = files[by_norm[norm(aid)]]
            renamed.append(f"`{f.name}` -> `{aid}`")
        if f is None:
            close = difflib.get_close_matches(aid, list(files), n=1, cutoff=0.75)
            if close and close[0] not in want:
                f = files[close[0]]
                renamed.append(f"`{f.name}` -> `{aid}` (guessed, check)")
        if f is None:
            missing.append(aid)
            continue
        used_files.update(k for k, v in files.items() if v == f)   # files is keyed by the suffix-stripped ID
        img = Image.open(f)
        notes = []
        if img.width * img.height < 600 * 1000:
            notes.append(f"low resolution {img.width}x{img.height}")
        ratio = img.width / img.height
        if abs(ratio - 9 / 16) > 0.08:
            notes.append(f"not 9:16 (is {img.width}x{img.height}); will be cropped")
        if a["kind"] in CUTOUT:
            cut, st = key_green(img)
            if st["key_strength"] < 60:
                notes.append("background is not clean green; cut-out may fail. Regenerate with a flat green background")
            if st["touches_edge"] and a["kind"] != "prop":
                notes.append("subject touches the image edge (cropped body?)")
            if st["subject_frac"] < 0.03:
                notes.append("almost nothing left after keying")
            cut.save(out_dir / f"{aid}.png")
        else:
            cover(img).save(out_dir / f"{aid}.png")
        done.append(aid)
        if notes:
            flagged.append((aid, notes))
    extra = sorted(set(files) - used_files)
    rep = ["# Image check", "", f"- expected: {len(want)}  processed: {len(done)}  missing: {len(missing)}  extra: {len(extra)}", ""]
    if missing:
        rep += ["## Missing (generate these)", ""] + [f"- `{m}`" for m in missing] + [""]
    if renamed:
        rep += ["## Matched by similar name", ""] + [f"- {r}" for r in renamed] + [""]
    if flagged:
        rep += ["## Check / regenerate", ""] + [f"- `{a}`: " + "; ".join(n) for a, n in flagged] + [""]
    if extra:
        rep += ["## Not in the prompt list (ignored)", ""] + [f"- `{x}`" for x in extra] + [""]
    (out_dir / "image_report.md").write_text("\n".join(rep), encoding="utf-8")
    print("\n".join(rep))
    sys.exit(1 if missing else 0)


if __name__ == "__main__":
    main()
