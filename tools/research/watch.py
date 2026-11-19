"""Watch a video properly: every frame decoded, not a few stills.
usage: <venv>/bin/python -I tools/research/watch.py VIDEO.mp4 OUT_DIR
needs: numpy, opencv-python-headless, faster-whisper, Pillow; ffmpeg on PATH.

Writes to OUT_DIR:
  report.json   shots (start, end, duration), per-shot camera motion (pan/tilt px/s, zoom %/s, classification),
                per-shot look (brightness, contrast, saturation, warmth, deep shadow), words with timings,
                sound-effect onsets outside speech, loudness over time
  report.md     the same as a readable timeline
  shots.jpg     contact sheets: first / middle / last frame of every shot
  cuts/         every frame +-3 around each cut (30 fps)
"""
import json, os, subprocess, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
os.makedirs(os.path.join(out, "cuts"), exist_ok=True)

# ------------------------------------------------------------------ decode every frame (small, for analysis)
probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "json", src], capture_output=True, check=True).stdout)["streams"][0]
num, den = map(int, probe["r_frame_rate"].split("/"))
FPS = num / den
W, H = 180, 320
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
frames = np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W, 3)
N = len(frames)
gray = np.array([cv2.cvtColor(f, cv2.COLOR_RGB2GRAY) for f in frames])

# ------------------------------------------------------------------ cuts: a jump in the colour histogram AND the pixel difference vs the local median
def hist(f):
    h = cv2.calcHist([cv2.cvtColor(f, cv2.COLOR_RGB2HSV)], [0, 1], None, [16, 8], [0, 180, 0, 256])
    return cv2.normalize(h, h).flatten()
hd = np.zeros(N); pd = np.zeros(N)
hs = [hist(f) for f in frames]
for i in range(1, N):
    hd[i] = 1 - cv2.compareHist(hs[i - 1], hs[i], cv2.HISTCMP_CORREL)
    pd[i] = np.abs(gray[i].astype(np.int16) - gray[i - 1]).mean()
cuts = [0]
for i in range(1, N):
    lo, hi = max(1, i - 8), min(N, i + 9)
    med_h = np.median(np.r_[hd[lo:i], hd[i + 1:hi]]) if hi - lo > 2 else 0
    med_p = np.median(np.r_[pd[lo:i], pd[i + 1:hi]]) if hi - lo > 2 else 0
    strong_colour = hd[i] > max(0.25, 4 * med_h) and pd[i] > max(12, 3 * med_p)
    strong_pixels = pd[i] > max(30, 6 * med_p) and hd[i] > max(0.05, 6 * med_h)  # same palette, new picture
    if (strong_colour or strong_pixels) and i - cuts[-1] >= 4:
        cuts.append(i)
bounds = cuts + [N]
shots = [(bounds[k], bounds[k + 1]) for k in range(len(cuts))]

# ------------------------------------------------------------------ camera motion per shot: dense optical flow -> fit translation + zoom
def motion(a, b):
    flow = cv2.calcOpticalFlowFarneback(gray[a], gray[b], None, 0.5, 3, 15, 3, 5, 1.2, 0)
    ys, xs = np.mgrid[0:H, 0:W]
    cx, cy = xs - W / 2, ys - H / 2
    dx, dy = flow[..., 0], flow[..., 1]
    tx, ty = np.median(dx), np.median(dy)
    r2 = cx * cx + cy * cy
    zoom = np.sum((dx - tx) * cx + (dy - ty) * cy) / max(1.0, np.sum(r2))  # radial divergence ~ scale change
    return tx, ty, zoom
def look(f):
    a = f.astype(np.float32) / 255
    L = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    s = cv2.cvtColor(f, cv2.COLOR_RGB2HSV)[..., 1].astype(np.float32) / 255
    return dict(brightness=round(float(L.mean()), 3), contrast=round(float(L.std()), 3), saturation=round(float(s.mean()), 3), warmth=round(float((a[..., 0] - a[..., 2]).mean()), 3), deep_shadow=round(float((L < 0.12).mean()), 3))
# camera motion of EVERY frame pair (fraction of frame width / height per second, zoom per second)
per = np.zeros((N, 3))
for i in range(1, N):
    if i in cuts: continue
    tx, ty, z = motion(i - 1, i)
    per[i] = (tx / W * FPS, ty / H * FPS, z * FPS)
shot_rows = []
for a, b in shots:
    m = per[a + 1:b] if b - a > 2 else np.zeros((1, 3))
    px, py, zz = (float(np.median(m[:, k])) for k in range(3))
    kind = []
    if abs(px) > 0.03: kind.append("pan " + ("left" if px > 0 else "right"))
    if abs(py) > 0.03: kind.append("tilt " + ("up" if py > 0 else "down"))
    if zz > 0.02: kind.append("push in / zoom in")
    if zz < -0.02: kind.append("pull out / zoom out")
    speed = np.hypot(m[:, 0], m[:, 1])
    fast = [round((a + 1 + j) / FPS, 2) for j in np.where(speed > 0.8)[0]]  # faster than 0.8 frame widths per second
    moving = float((speed > 0.03).mean() + 0 * zz)
    shot_rows.append(dict(start=round(a / FPS, 2), end=round(b / FPS, 2), duration=round((b - a) / FPS, 2), pan=round(px, 3), tilt=round(py, 3), zoom=round(zz, 3), camera=", ".join(kind) or "hold", moving_share=round(moving, 2), fast_moves=[fast[0], fast[-1]] if fast else [], look=look(frames[(a + b) // 2])))

# ------------------------------------------------------------------ frames to look at: first / middle / last of each shot, and +-3 frames around each cut (full size)
full = lambda i: Image.open(__import__("io").BytesIO(subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", f"select=eq(n\\,{i})", "-vframes", "1", "-f", "image2pipe", "-vcodec", "mjpeg", "-"], capture_output=True).stdout))
tiles = []
for k, (a, b) in enumerate(shots):
    for i in (a, (a + b) // 2, b - 1):
        im = Image.fromarray(frames[i]).resize((270, 480)); ImageDraw.Draw(im).text((4, 4), f"shot {k} f{i} {i / FPS:.2f}s", fill=(255, 0, 0)); tiles.append(im)
cols = 6
for p in range(0, len(tiles), cols * 3):
    page = tiles[p:p + cols * 3]
    sheet = Image.new("RGB", (270 * cols, 480 * ((len(page) + cols - 1) // cols)))
    for j, im in enumerate(page): sheet.paste(im, ((j % cols) * 270, (j // cols) * 480))
    sheet.save(os.path.join(out, f"shots_{p // (cols * 3):02d}.jpg"), quality=82)
for c in cuts[1:]:
    strip = Image.new("RGB", (270 * 7, 480))
    for j, i in enumerate(range(c - 3, c + 4)):
        if 0 <= i < N: strip.paste(Image.fromarray(frames[i]).resize((270, 480)), (j * 270, 0))
    strip.save(os.path.join(out, "cuts", f"cut_{c:05d}.jpg"), quality=80)

# ------------------------------------------------------------------ sound: narration words, effect onsets outside speech, loudness
pcm = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], capture_output=True).stdout, dtype=np.float32)
words = []
if len(pcm):
    from faster_whisper import WhisperModel
    segs, _ = WhisperModel("small", device="cpu", compute_type="int8").transcribe(pcm, word_timestamps=True)
    words = [dict(w=w.word.strip(), t0=round(w.start, 2), t1=round(w.end, 2)) for s in segs for w in s.words]
hop = 160  # 10 ms
env = np.array([np.sqrt(np.mean(pcm[i:i + hop] ** 2) + 1e-12) for i in range(0, len(pcm) - hop, hop)]) if len(pcm) else np.zeros(1)
db = 20 * np.log10(env + 1e-9)
flux = np.maximum(0, np.diff(db, prepend=db[0]))
speech = np.zeros(len(env), bool)
for w in words: speech[int(w["t0"] * 100):int(w["t1"] * 100) + 1] = True
onsets = [round(i / 100, 2) for i in range(5, len(flux) - 5) if flux[i] > 9 and flux[i] == flux[i - 5:i + 5].max() and not speech[i] and db[i] > -45]
loud = [round(float(db[i:i + 50].mean()), 1) for i in range(0, len(db), 50)]

# ------------------------------------------------------------------ transitions inside the picture: fast moves and dissolves
# a hard cut is a ONE-frame spike; a fast camera move (snap-push / whip) is a short run of high frame differences that
# ramps up and down (motion blur); a dissolve is a run of moderate differences with no optical-flow structure.
moves = []
i = 1
while i < N:
    if pd[i] > 8 and i not in cuts:
        j = i
        while j + 1 < N and pd[j + 1] > 6 and (j + 1) not in cuts: j += 1
        dur = j - i + 1
        if 4 <= dur <= 45:
            seg = per[i:j + 1]
            sp = np.hypot(seg[:, 0], seg[:, 1]); zm = seg[:, 2]
            peak = float(pd[i:j + 1].max())
            kind = "push / zoom" if abs(np.median(zm)) > 0.6 * max(1e-6, np.median(sp)) else ("whip / pan" if np.median(sp) > 0.4 else "move")
            land = (j + 1) / FPS
            w_at = next((w["w"] for w in words if w["t0"] - 0.15 <= land <= w["t1"] + 0.05), "")
            moves.append(dict(start=round(i / FPS, 2), land=round(land, 2), duration=round(dur / FPS, 2), kind=kind, peak_diff=round(peak, 1), lands_on_word=w_at))
        i = j + 1
    else:
        i += 1
holds = []
calm = [k for k in range(N) if pd[k] < 4]
rep = dict(fast_moves=moves, video=os.path.basename(src), fps=round(FPS, 2), frames=N, seconds=round(N / FPS, 2), cuts=len(cuts) - 1, mean_shot=round(N / FPS / len(shots), 2), shots=shot_rows, words=words, sfx_onsets=onsets, loudness_db_per_half_second=loud)
json.dump(rep, open(os.path.join(out, "report.json"), "w"), indent=1)
lines = [f"# {rep['video']}: {rep['seconds']} s, {rep['frames']} frames at {rep['fps']} fps, {rep['cuts']} cuts, mean shot {rep['mean_shot']} s", "", "| shot | time | dur | camera (median) | moving | fast move | bright | contrast | sat | warm | words |", "|---|---|---|---|---|---|---|---|---|---|---|"]
for k, s in enumerate(shot_rows):
    ws = " ".join(w["w"] for w in words if s["start"] <= w["t0"] < s["end"])
    L = s["look"]
    fm = f"{s['fast_moves'][0]}-{s['fast_moves'][1]} s" if s['fast_moves'] else ""
    lines.append(f"| {k} | {s['start']}-{s['end']} | {s['duration']} | {s['camera']} | {int(s['moving_share'] * 100)}% | {fm} | {L['brightness']} | {L['contrast']} | {L['saturation']} | {L['warmth']} | {ws} |")
lines += ["", f"## Fast camera moves inside shots: {len(moves)} (mean {np.mean([m['duration'] for m in moves]) if moves else 0:.2f} s)", "", "| start | lands | dur | kind | lands on word |", "|---|---|---|---|---|"]
lines += [f"| {m['start']} | {m['land']} | {m['duration']} | {m['kind']} | {m['lands_on_word']} |" for m in moves]
beats = sorted([s['start'] for s in shot_rows][1:] + [m['land'] for m in moves])
gaps = np.diff([0] + beats + [N / FPS])
lines += ["", f"Picture changes (hard cuts + fast-move landings): {len(beats)} in {N / FPS:.1f} s = one every {N / FPS / max(1, len(beats)):.2f} s (median gap {np.median(gaps):.2f} s)"]
lines += ["", f"Effect onsets outside speech (s): {onsets}"]
open(os.path.join(out, "report.md"), "w").write("\n".join(lines))
print("\n".join(lines[:3]))
