"""Quick error check after every render (about 15-30 s). Catches the mistakes that break a video,
not matters of taste.

Usage: python quick_check.py <project> [--preview]
Checks:
  files      every image the timeline uses exists (and its split layers / swap images)
  captions   one caption per script word, nothing missing or extra
  faces      shots that ask for a cartoon face but no face was found on that image
  render     the video exists, is newer than the timeline, 1080x1920 (540x960 preview), has sound
  length     video length matches the voice-over (±0.5 s)
  black      no black gaps longer than 0.3 s
  frozen     no frozen picture longer than 3 s (a missing animation or a stuck shot)
  loudness   about -17.5 LUFS (−20 … −15 is fine)
Writes 08_render/quick_check.md and prints it. Exit code 1 when anything FAILS.
"""
import re, subprocess, sys
from pathlib import Path
from common import d, project_dir, load_json, ffmpeg_exe, script_tokens


def ff(args):
    return subprocess.run([ffmpeg_exe(), "-hide_banner", "-nostats", *args], capture_output=True, text=True).stderr


def main():
    proj = project_dir(sys.argv[1])
    preview = "--preview" in sys.argv
    rows, fails = [], 0

    def add(ok, name, detail, warn=False):
        nonlocal fails
        mark = "✅" if ok else ("⚠️" if warn else "❌")
        if not ok and not warn:
            fails += 1
        rows.append(f"| {mark} | {name} | {detail} |")

    tl_path = d(proj, "beats") / "timeline.json"
    if not tl_path.exists():
        sys.exit("timeline.json missing: run build_timeline.py first")
    tl = load_json(tl_path)
    ldir = d(proj, "layers")

    # files
    missing = set()
    for s in tl["shots"]:
        for L in s["layers"]:
            if L.get("kind") == "route":
                continue
            names = [L["asset"]] + [sw["asset"] for sw in L.get("swaps", [])] + list((L.get("flipbook") or {}).get("assets", []))
            for a in names:
                need = [f"{a}.png"] + ([f"{a}__fg.png", f"{a}__bg.png"] if L.get("split") else [])
                missing.update(f"{s['id']}: {n}" for n in need if not (ldir / n).exists())
    add(not missing, "files", "all images present" if not missing else "missing " + ", ".join(sorted(missing)[:6]))

    # captions
    sp = d(proj, "script") / "script.md"
    if sp.exists():
        n_script, n_caps = len(script_tokens(sp.read_text(encoding="utf-8"))), len(tl.get("captions", []))
        add(n_script == n_caps, "captions", f"{n_caps} captions for {n_script} script words")

    # faces asked for but not found
    faces = tl.get("faces", {})
    noface = []
    for s in tl["shots"]:
        for L in s["layers"]:
            if L.get("faces") and not any(f.get("hidden") for f in L["faces"]):
                key = L["asset"] + ("__fg" if L.get("split") else "")
                if not (faces.get(key) or faces.get(L["asset"]) or {}).get("faces"):
                    noface.append(s["id"])
    add(not noface, "faces", "every face shot has a face" if not noface else
        "no face found in " + ", ".join(sorted(set(noface))) + " (turned away? hide it or regenerate)", warn=True)

    # render
    out = d(proj, "render") / ("preview.mp4" if preview else "final.mp4")
    if not out.exists():
        add(False, "render", f"{out.name} not found")
    else:
        info = ff(["-i", str(out)])
        m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info)
        dur = int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]) if m else 0
        res = re.search(r"Video:.*?(\d{3,4})x(\d{3,4})", info)
        want = (540, 960) if preview else (1080, 1920)
        fresh = out.stat().st_mtime >= tl_path.stat().st_mtime
        size_ok = bool(res) and (int(res[1]), int(res[2])) == want
        audio = "Audio:" in info
        add(fresh and size_ok and audio, "render",
            f"{out.name}, {res[1]}x{res[2] if res else '?'}, sound {'yes' if audio else 'NO'}"
            + ("" if fresh else ", OLDER than the timeline: render again"))
        add(abs(dur - tl["duration"]) <= 0.5, "length", f"video {dur:.1f} s, voice-over {tl['duration']:.1f} s")

        # black gaps and frozen picture, on a small copy (fast)
        log = ff(["-i", str(out), "-vf", "scale=180:-2,blackdetect=d=0.3:pix_th=0.08,freezedetect=n=0.003:d=3", "-an", "-f", "null", "-"])
        blacks = re.findall(r"black_start:([\d.]+)", log)
        add(not blacks, "black", "no black gaps" if not blacks else "black at " + ", ".join(f"{float(b):.1f}s" for b in blacks[:5]))
        frozen = re.findall(r"freeze_start: ([\d.]+)", log)
        add(not frozen, "frozen", "picture never freezes > 3 s" if not frozen else
            "frozen from " + ", ".join(f"{float(f):.1f}s" for f in frozen[:5]), warn=True)

        if audio:
            lj = ff(["-i", str(out), "-af", "ebur128", "-vn", "-f", "null", "-"])
            mI = re.findall(r"I:\s+(-?[\d.]+) LUFS", lj)
            lufs = float(mI[-1]) if mI else 0
            add(-20 <= lufs <= -15, "loudness", f"{lufs:.1f} LUFS (aim −17.5)", warn=True)

    rep = ["# Quick check", "", "| | check | result |", "|---|---|---|", *rows, "",
           "All good." if not fails else f"**{fails} problem(s) to fix before sharing.**"]
    (d(proj, "render") / "quick_check.md").write_text("\n".join(rep), encoding="utf-8")
    print("\n".join(rep))
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
