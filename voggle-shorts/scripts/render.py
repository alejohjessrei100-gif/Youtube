"""Render a project with the Remotion engine.

Usage: python render.py <project> [--preview | --final] [--frames 0-240]

--preview : half resolution (540x960), fast, writes 08_render/preview.mp4 + preview_sheet.jpg
--final   : 1080x1920, writes 08_render/final.mp4
Before rendering it copies 07_layers/*.png and 03_timing/vo.wav into engine/public/p/<slug>/.
"""
import shutil, subprocess, sys
from pathlib import Path
from common import d, project_dir, load_json, ENGINE, ffmpeg_exe, run


def main():
    proj = project_dir(sys.argv[1])
    final = "--final" in sys.argv
    frames = None
    if "--frames" in sys.argv:
        frames = sys.argv[sys.argv.index("--frames") + 1]
    tl_path = d(proj, "beats") / "timeline.json"
    if not tl_path.exists():
        sys.exit("timeline.json missing: run build_timeline.py first")
    tl = load_json(tl_path)
    pub = ENGINE / "public" / "p" / tl["slug"]
    pub.mkdir(parents=True, exist_ok=True)
    for f in d(proj, "layers").glob("*.png"):
        dst = pub / f.name
        if not dst.exists() or dst.stat().st_mtime < f.stat().st_mtime:
            shutil.copy2(f, dst)
    shutil.copy2(d(proj, "timing") / "vo.wav", pub / "vo.wav")
    # SFX: every file in 02_voice/sfx/ is compressed (short clicky sounds get fuller) and normalised to -12 LUFS (the cue's "db" then sets it under the voice)
    sdir = d(proj, "voice") / "sfx"
    if sdir.exists():
        for f in sdir.iterdir():
            if f.suffix.lower() in (".mp3", ".wav", ".m4a", ".ogg"):
                dst = pub / f"sfx_{f.stem}.wav"
                if not dst.exists() or dst.stat().st_mtime < f.stat().st_mtime:
                    run([ffmpeg_exe(), "-v", "error", "-y", "-i", str(f), "-af", "acompressor=threshold=-30dB:ratio=4:attack=2:release=120:makeup=6,alimiter=limit=0.89,loudnorm=I=-12:TP=-1.5:LRA=7",
                         "-ar", "48000", "-ac", "2", str(dst)])
    props = ENGINE / "props.json"
    props.write_text('{"tl": ' + tl_path.read_text(encoding="utf-8") + "}", encoding="utf-8")
    out = d(proj, "render") / ("final.mp4" if final else "preview.mp4")
    cmd = ["npx", "remotion", "render", "src/index.ts", "Voggle", str(out), f"--props={props}",
           "--codec=h264", "--audio-codec=aac", "--audio-bitrate=192k", "--log=error"]
    cmd += ["--crf=18"] if final else ["--scale=0.5", "--crf=26"]
    if frames:
        cmd.append(f"--frames={frames}")
    print("rendering ->", out)
    r = subprocess.run(cmd, cwd=ENGINE, shell=(sys.platform == "win32"), capture_output=True, text=True)
    if r.returncode != 0:
        # long renders occasionally die (browser memory); show why, then retry once at half concurrency
        print("render failed, retrying at lower concurrency:\n" + (r.stderr or r.stdout)[-1500:])
        r = subprocess.run(cmd + ["--concurrency=50%"], cwd=ENGINE, shell=(sys.platform == "win32"), capture_output=True, text=True)
        if r.returncode != 0:
            sys.exit("render failed:\n" + (r.stderr or r.stdout)[-3000:])
    if not final:
        # contact sheet: one frame every 2 s, 6 columns
        sheet = d(proj, "render") / "preview_sheet.jpg"
        run([ffmpeg_exe(), "-v", "error", "-y", "-i", str(out), "-vf", "fps=0.5,scale=180:-2,tile=6x6", "-frames:v", "1", str(sheet)])
        print("sheet ->", sheet)
    print("done:", out)


if __name__ == "__main__":
    main()
