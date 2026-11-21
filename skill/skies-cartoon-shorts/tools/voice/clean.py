# voice file -> clean.wav: dead space removed (silences > 80 ms shrunk to 44 ms, never cutting into words), starts on
# the first word, ends 30 ms after the last.   python3 clean.py voice.mp3 clean.wav cuts.json
import sys; TAKE, OUTW, OUTC = sys.argv[1], sys.argv[2], sys.argv[3]
import json, numpy as np, subprocess, soundfile as sf
sr, hop = 44100, 441
x = np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i",TAKE,"-ac","1","-ar","44100","-f","s16le","-"],capture_output=True).stdout, np.int16).astype(np.float64)/32768
pass
f = np.sqrt(np.convolve(x**2, np.ones(hop)/hop, "same"))[::hop]; db = 20*np.log10(f+1e-9)
sil = db < -50
runs, i = [], 0
while i < len(sil):
    if sil[i]:
        j = i
        while j < len(sil) and sil[j]: j += 1
        runs.append((i, j)); i = j
    else: i += 1
keep, cur = [], 0
for a, b in runs:
    a0, b0 = a*hop, b*hop
    if a == 0: cur = max(0, b0 - int(0.012*sr)); continue          # lead-in: start right on the first word
    if b >= len(sil) - 1: keep.append((cur, min(len(x), a0 + int(0.03*sr)))); cur = None; break  # tail
    if (b - a) >= 8:                                                # >= 80 ms of silence -> keep 22 ms each side
        keep.append((cur, a0 + int(0.022*sr))); cur = b0 - int(0.022*sr)
if cur is not None: keep.append((cur, len(x)))
fade = int(0.004*sr); out = []
for a, b in keep:
    s = x[a:b].copy(); s[:fade] *= np.linspace(0, 1, fade); s[-fade:] *= np.linspace(1, 0, fade); out.append(s)
y = np.concatenate(out)
sf.write(OUTW, y, sr, subtype="PCM_16")
json.dump({"segs": keep, "sr": sr}, open(OUTC, "w"))
print("in", round(len(x)/sr, 2), "out", round(len(y)/sr, 2), "cuts", len(keep)-1)
