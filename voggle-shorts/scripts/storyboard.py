"""Storyboard: key frames of every shot from the preview render, for review before the final render.

Usage: python storyboard.py <project>
Reads : 08_render/preview.mp4, 04_beats/timeline.json
Writes: 08_render/storyboard/board_NN.jpg (6 shots per sheet) + storyboard/index.html
Frames per shot: just after the cut, at each pose swap / expression change / grade flip, and near the end.
"""
import sys
import html
import cv2
from PIL import Image, ImageDraw, ImageFont
from common import d, project_dir, load_json

TW, TH = 300, 533


def font(sz):
    for f in ("C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf"):
        try:
            return ImageFont.truetype(f, sz)
        except OSError:
            pass
    return ImageFont.load_default()


def main():
    proj = project_dir(sys.argv[1])
    rdir = d(proj, "render")
    tl = load_json(d(proj, "beats") / "timeline.json")
    cap = cv2.VideoCapture(str(rdir / "preview.mp4"))
    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    out = rdir / "storyboard"
    out.mkdir(exist_ok=True)

    def grab(t):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(t * fps)))
        ok, f = cap.read()
        if not ok:
            return Image.new("RGB", (TW, TH), (40, 40, 40))
        return Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB)).resize((TW, TH), Image.LANCZOS)

    cards = []
    for s in tl["shots"]:
        st, en = s["start"], s["end"]
        times = {round(st + min(0.2, (en - st) / 3), 2): "start"}
        for L in s["layers"]:
            for sw in L.get("swaps", []):
                times[round(min(en - 0.05, sw["t"] + 0.2), 2)] = "swap"
            for f in L.get("faces", []):
                for e in f["exprs"][1:]:
                    times.setdefault(round(min(en - 0.05, e["t"] + 0.15), 2), "face")
        if s.get("gradeFlip"):
            times.setdefault(round(min(en - 0.05, s["gradeFlip"]["t"] + 0.15), 2), "grade")
        times.setdefault(round(en - 0.08, 2), "end")
        ts = sorted(times)
        if len(ts) > 3:
            ts = [ts[0], ts[len(ts) // 2], ts[-1]]
        imgs = [grab(t) for t in ts]
        w = TW * len(imgs) + 8 * (len(imgs) - 1)
        card = Image.new("RGB", (max(w, TW * 2 + 8), TH + 70), (24, 24, 24))
        dr = ImageDraw.Draw(card)
        dr.text((6, 4), f"{s['id']}  {st:.1f}-{en:.1f}s  energy {s.get('energy', 1):.2g}", fill=(255, 215, 0), font=font(18))
        dr.text((6, 28), s["text"][:62], fill=(230, 230, 230), font=font(16))
        for i, (im, t) in enumerate(zip(imgs, ts)):
            card.paste(im, (i * (TW + 8), 60))
            dr.text((i * (TW + 8) + 4, 64), f"{t:.1f}s {times[t]}", fill=(0, 255, 120), font=font(14))
        cards.append((s["id"], card))
    per = 6
    names = []
    for n in range(0, len(cards), per):
        grp = cards[n:n + per]
        cw = max(c.width for _, c in grp)
        rows = [grp[i:i + 2] for i in range(0, len(grp), 2)]
        sheet = Image.new("RGB", (cw * 2 + 30, sum(max(c.height for _, c in r) + 14 for r in rows)), (10, 10, 10))
        y = 0
        for r in rows:
            for j, (_, c) in enumerate(r):
                sheet.paste(c, (j * (cw + 30), y))
            y += max(c.height for _, c in r) + 14
        name = f"board_{n // per + 1:02d}.jpg"
        sheet.save(out / name, quality=88)
        names.append((name, [i for i, _ in grp]))
    page = ["<!doctype html><meta charset='utf-8'><title>Storyboard</title>",
            "<body style='background:#111;color:#eee;font-family:system-ui;margin:16px'>",
            f"<h1>Storyboard: {html.escape(proj.name)}</h1>"]
    for name, ids in names:
        page.append(f"<h2>{ids[0]} to {ids[-1]}</h2><img src='{name}' style='max-width:100%'>")
    (out / "index.html").write_text("\n".join(page), encoding="utf-8")
    print(f"{len(cards)} shots -> {len(names)} sheets in {out}")


if __name__ == "__main__":
    main()
