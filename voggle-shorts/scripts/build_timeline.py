"""Turn the beat table (word-indexed) into the engine timeline (seconds) and validate it.

Usage: python build_timeline.py <project>

Reads : 03_timing/words.json, 04_beats/beats.json, 07_layers/faces.json (optional)
Writes: 04_beats/timeline.json   (engine input)
        04_beats/beats.md        (human-readable beat table with real times)
Prints validation problems (exit 1 on errors).

Every time in beats.json is a WORD INDEX ("w"), optionally with "dt" seconds offset.
A shot starts on its first word's onset minus one frame, so every cut lands on a word.
"""
import sys
from pathlib import Path
from statistics import mean, median
from common import d, project_dir, load_json, save_json, FPS

DEFAULT_EXPR = {"protagonist": {"eyes": "E3", "mouth": "M1", "gaze": [0.45, 0.05]},
                "other": {"eyes": "E1", "mouth": "M1", "gaze": [0.0, 0.0]}}


def main():
    proj = project_dir(sys.argv[1])
    words = load_json(d(proj, "timing") / "words.json")
    W, dur = words["words"], words["duration"]
    B = load_json(d(proj, "beats") / "beats.json")
    faces_path = d(proj, "layers") / "faces.json"
    faces = load_json(faces_path) if faces_path.exists() else {}
    protagonist = B.get("protagonist", "C1")
    errs, warns = [], []
    frame = 1.0 / FPS

    def T(ref, base=None):
        """word-index reference -> seconds (snapped to frames)."""
        if ref is None:
            return base
        if isinstance(ref, (int, float)):
            ref = {"w": ref}
        k = int(ref["w"])
        if not 0 <= k < len(W):
            errs.append(f"word index {k} out of range (0..{len(W) - 1})")
            return base or 0.0
        t = max(0.0, W[k]["start"] - frame) + float(ref.get("dt", 0))
        return round(round(t * FPS) / FPS, 4)

    # Faces only on MAIN characters (user rule): beats.json "mainFaces": {asset: [face indices]}.
    # Assets not listed: keep all faces when there are 1-2 of them, none when 3+ (crowds stay natural).
    # Faces narrower than 4 % of the image are always dropped.
    mf = B.get("mainFaces", {})
    for a, v in list(faces.items()):
        fl = v.get("faces", [])
        if a in mf:
            keep = []
            for sel in mf[a]:   # an index, or an [x, y] point (fractions): the face nearest that point
                if isinstance(sel, list) and fl:
                    g = min(fl, key=lambda q: (q["center"][0] / v["w"] - sel[0]) ** 2 + (q["center"][1] / v["h"] - sel[1]) ** 2)
                    if g not in keep:
                        keep.append(g)
                elif isinstance(sel, int) and sel < len(fl):
                    keep.append(fl[sel])
        else:
            keep = fl if len(fl) <= 2 else []
        keep = [g for g in keep if g["faceW"] >= 0.04 * v.get("w", 1080)]
        faces[a] = dict(v, faces=keep)
    boxes = {}

    shots = B["shots"]
    starts = [0.0 if i == 0 else T(s["w"]) for i, s in enumerate(shots)]
    end_all = round((dur + 0.25) * FPS) / FPS
    out_shots = []
    for i, s in enumerate(shots):
        st, en = starts[i], (starts[i + 1] if i + 1 < len(shots) else end_all)
        if en - st < 0.2:
            errs.append(f"{s['id']}: shot only {en - st:.2f} s long")
        w0 = s["w"]
        w1 = shots[i + 1]["w"] if i + 1 < len(shots) else len(W)
        text = " ".join(x["text"] for x in W[w0:w1])
        layers = []
        for L in s.get("layers", []):
            L2 = dict(L)
            if L.get("anim"):
                L2["anim"] = dict(L["anim"])
                L2["anim"]["t"] = max(st, T(L["anim"])) if "w" in L["anim"] else st + float(L["anim"].get("dt", 0))
            def at(ref, default=st):
                """word ref {"w":..,"dt":..} -> seconds; {"dt": x} alone = seconds after shot start."""
                if ref is None:
                    return default
                if isinstance(ref, (int, float)):
                    return max(st, T(ref))
                if "w" in ref:
                    return max(st, T(ref))
                return st + float(ref.get("dt", 0))
            L2["swaps"] = [{"t": at(sw), "asset": sw["asset"], "blur": bool(sw.get("blur")), "pop": sw.get("pop", 0),
                            "keepBg": bool(sw.get("keepBg")), "matchFace": bool(sw.get("matchFace", sw.get("keepBg"))),
                            "matchBody": bool(sw.get("matchBody")),
                            "zoom": float(sw.get("zoom", 1))}
                           for sw in L.get("swaps", [])]
            # keyframe track: offsets from the layer's base placement (x/y in frame fractions, s scale, r degrees, o opacity)
            if L.get("keys"):
                L2["keys"] = sorted([dict({k: v for k, v in kf.items() if k not in ("w", "dt")}, t=at(kf)) for kf in L["keys"]],
                                    key=lambda k: k["t"])
            # periodic loops (shake / bob / rock / pulse / jitter), active between two words
            loops = L.get("loops") or ([L["loop"]] if L.get("loop") else [])
            L2["loops"] = [dict({k: v for k, v in lp.items() if k not in ("from", "to")},
                                t0=at(lp.get("from")), t1=at(lp.get("to"), en) if lp.get("to") is not None else en) for lp in loops]
            L2.pop("loop", None)
            if L.get("route"):
                R = dict(L["route"])
                R["t0"], R["t1"] = at(R.get("from")), at(R.get("to"), en)
                R["pins"] = [dict(pn, t=at(pn.get("w") if isinstance(pn.get("w"), dict) else ({"w": pn["w"]} if "w" in pn else None))) for pn in R.get("pins", [])]
                R.pop("from", None); R.pop("to", None)
                L2["route"] = R
            # flip-book: alternate between images every N frames (typing hands, flapping, trembling)
            if L.get("flipbook"):
                fb = L["flipbook"]
                L2["flipbook"] = {"assets": fb["assets"], "every": fb.get("every", 2),
                                  "t0": at(fb.get("from")), "t1": at(fb.get("to"), en) if fb.get("to") is not None else en}
            assets = [L["asset"]] + [sw["asset"] for sw in L.get("swaps", [])]
            # split plates (split_layers.py made <ID>__fg / <ID>__bg): engine moves subject and background apart
            ldir_ = d(proj, "layers")
            L2["split"] = False
            if L["kind"] == "full" and L.get("split") is True:
                L2["split"] = all((ldir_ / f"{a}__fg.png").exists() and (ldir_ / f"{a}__bg.png").exists() for a in assets)
                if L2["split"]:
                    from PIL import Image
                    import numpy as np
                    for a in assets:
                        if a not in boxes:
                            al = np.asarray(Image.open(ldir_ / f"{a}__fg.png").getchannel("A")) > 128
                            ys, xs = np.where(al)
                            hh, ww = al.shape
                            boxes[a] = [round(xs.min() / ww, 4), round(ys.min() / hh, 4), round(xs.max() / ww, 4), round(ys.max() / hh, 4)]
                    b0 = boxes[L["asset"]]
                    L2["base"] = [round((b0[0] + b0[2]) / 2, 4), b0[3]]
            for a in assets:
                if faces and L["kind"] in ("char", "full") and a not in faces:
                    warns.append(f"{s['id']}: no face data for {a} (run faces.py, or the image is missing)")
            # expressions per face index
            nfaces = max([len(faces.get(a, {}).get("faces", [])) for a in assets] + [0])
            spec = {f["face"]: f for f in L.get("faces", [])}
            star = spec.get("*", {})            # "face": "*" = every face not listed (crowds share one emotion)
            fx = []
            for k in range(nfaces):
                role = "protagonist" if (L.get("character") == protagonist and k == 0) else "other"
                if k not in spec and star:
                    spec[k] = star
                ex = spec.get(k, {}).get("exprs") or [dict(DEFAULT_EXPR[role], w=w0)]
                if k in spec and spec[k] is star and k > 0:   # small per-face variation in gaze
                    ex = [dict(e, gaze=[round(((e.get("gaze") or [0, 0])[0] + (0.25 if k % 2 else -0.25)), 2), (e.get("gaze") or [0, 0])[1]]) for e in ex]
                lst = []
                for e in ex:
                    e2 = {kk: vv for kk, vv in e.items() if kk not in ("w", "dt")}
                    e2["t"] = max(st, T(e) if "w" in e else st)
                    lst.append(e2)
                lst.sort(key=lambda e: e["t"])
                fx.append({"face": k, "hidden": bool(spec.get(k, {}).get("hidden")), "exprs": lst})
            L2["faces"] = fx
            layers.append(L2)
        gf = s.get("gradeFlip")
        cam = dict(s.get("camera", {"move": "creep"}))
        if cam.get("keys"):
            cam["keys"] = sorted([dict({k: v for k, v in kf.items() if k not in ("w", "dt")},
                                       t=(max(st, T(kf)) if "w" in kf else st + float(kf.get("dt", 0)))) for kf in cam["keys"]],
                                 key=lambda k: k["t"])
        if cam.get("pulses"):
            cam["pulses"] = [{"t": (max(st, T(p)) if "w" in p else st + float(p.get("dt", 0)))} for p in cam["pulses"]]
        mv = cam.get("move")
        if mv in ("dolly_face", "frame_face") and s.get("layers"):
            L0 = s["layers"][0]
            fv = faces.get(L0["asset"], {})
            if fv.get("faces"):
                g = max(fv["faces"], key=lambda q: q["faceW"])
                fx, fy = g["center"][0] / fv["w"], g["center"][1] / fv["h"]
                ty = cam.get("faceY", 0.3)

                def key(sc, t, ease="inOut"):
                    tx = min(max(0.5 - fx, -(1 - fx) * (sc - 1)), fx * (sc - 1))
                    tyy = min(max(ty - fy, -(1 - fy) * (sc - 1)), fy * (sc - 1))
                    return {"t": round(t, 4), "s": round(sc, 4), "x": round(tx, 4), "y": round(tyy, 4), "ease": ease}
                if mv == "dolly_face":
                    s1 = cam.get("to", 1.45)
                    t1 = max(st + 0.3, T(cam["until"])) if "until" in cam else en
                    cam["keys"] = [key(cam.get("from", 1.0), st), key(s1, t1), key(s1 * 1.03, en, "linear")]
                else:
                    s0 = cam.get("s", 1.35)
                    cam["keys"] = [key(s0, st), key(s0 * (1 + cam.get("creep", 0.04)), en, "linear")]
                cam["focus"] = [round(fx, 4), round(fy, 4)]
            else:
                warns.append(f"{s['id']}: {mv} needs a main face on {L0['asset']}")
        s = dict(s, camera=cam)
        if "energy" in s:
            energy = s["energy"]
        else:
            L0 = layers[0] if layers else {}
            nmain = len(faces.get(L0.get("asset", ""), {}).get("faces", []))
            if L0.get("split"):
                energy = 1.0
            elif L0.get("kind") == "full" and nmain == 1:
                energy = 0.5
            elif nmain == 2:
                energy = 0.4
            else:
                energy = 0.2
        out_shots.append({
            "energy": energy,
            "id": s["id"], "start": st, "end": en, "text": text, "template": s.get("template", ""),
            "grade": s.get("grade", "WARM"),
            "gradeFlip": ({"t": T(gf), "to": gf["to"]} if gf else None),
            "camera": s.get("camera", {"move": "creep"}),
            "transition": s.get("transition", "cut"),     # cut | whip | zoomblur (into this shot)
            "exit": s.get("exit"),                        # None | zoomblur (out of this shot)
            "dof": s.get("dof", 0), "vignette": s.get("vignette", 0.75),
            "layers": layers,
        })
    # captions: one word each, on = onset - 1 frame, off = next on
    caps = []
    for k, x in enumerate(W):
        on = 0.0 if k == 0 else round(max(0.0, x["start"] - frame) * FPS) / FPS
        caps.append({"text": x["text"], "start": on})
    for k in range(len(caps)):
        caps[k]["end"] = caps[k + 1]["start"] if k + 1 < len(caps) else end_all
        if caps[k]["end"] - caps[k]["start"] < 3 * frame and k + 1 < len(caps):
            caps[k + 1]["start"] = caps[k]["end"] = round((caps[k]["start"] + 3 * frame) * FPS) / FPS
    # SFX cues (04_beats/sfx.json): [{"id", "file", "w"|"t", "dt", "dur", "db"}] -> seconds; files live in 02_voice/sfx/
    sfx = []
    sfx_path = d(proj, "beats") / "sfx.json"
    if sfx_path.exists():
        for c in load_json(sfx_path).get("cues", []):
            t0 = (T(c["w"]) if "w" in c else float(c.get("t", 0))) + float(c.get("dt", 0))
            sfx.append({"src": "sfx_" + Path(c["file"]).stem + ".wav", "t": round(max(0.0, t0), 3),
                        "dur": float(c.get("dur", 1.0)), "vol": round(10 ** (float(c.get("db", -8)) / 20), 4)})
    slug = proj.name
    timeline = {"slug": slug, "fps": FPS, "width": 1080, "height": 1920, "duration": end_all,
                "audio": "vo.wav", "sfx": sfx, "shots": out_shots, "captions": caps,
                "faces": {a: v for a, v in faces.items()}, "boxes": boxes}
    save_json(d(proj, "beats") / "timeline.json", timeline)

    # stats + checks
    lens = [s["end"] - s["start"] for s in out_shots]
    # sentence start = previous word ends a sentence and this word is capitalised ("coin... and" is not a new sentence)
    sent_starts = [k for k in range(1, len(W)) if W[k - 1]["text"].endswith((".", "?", "!", '."', '?"', '!"'))
                   and W[k]["text"].lstrip('"“‘\'')[:1].isupper()]
    shot_words = {s["w"] for s in shots}
    missed = [W[k]["text"] for k in sent_starts if k not in shot_words]
    first10 = sum(1 for s in out_shots if s["start"] < 10)
    if lens and max(lens) > 4.8:
        warns.append(f"longest shot {max(lens):.2f} s (> 4.7 s)")
    if missed:
        warns.append(f"{len(missed)} sentence starts without a cut: " + ", ".join(missed[:8]))
    md = ["# Beat table", "", f"{len(out_shots)} shots · mean {mean(lens):.2f} s · median {median(lens):.2f} s · first 10 s: {first10} shots", "",
          "| shot | time | len | template | grade | camera | layers | narration |", "|---|---|---|---|---|---|---|---|"]
    for s in out_shots:
        lay = ", ".join(L["asset"] + ("→" + "→".join(x["asset"] for x in L["swaps"]) if L["swaps"] else "") for L in s["layers"])
        g = s["grade"] + (f"→{s['gradeFlip']['to']}" if s["gradeFlip"] else "")
        md.append(f"| {s['id']} | {s['start']:.2f}–{s['end']:.2f} | {s['end'] - s['start']:.2f} | {s['template']} | {g} | {s['camera'].get('move')} | {lay} | {s['text']} |")
    if warns or errs:
        md += ["", "## Checks", ""] + [f"- ERROR: {e}" for e in errs] + [f"- warning: {w}" for w in warns]
    (d(proj, "beats") / "beats.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print(md[2])
    for e in errs:
        print("ERROR:", e)
    for w in warns:
        print("warning:", w)
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
