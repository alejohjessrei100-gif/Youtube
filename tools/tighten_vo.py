"""Shrink every pause in a voice-over to KEEP seconds (no change to the speech itself).
usage: python tools/tighten_vo.py in.wav out.wav"""
import sys, wave, numpy as np
KEEP, THR, MIN = 0.12, 10 ** (-40 / 20), 0.15
src, dst = sys.argv[1:3]
with wave.open(src) as f: sr = f.getframerate(); x = np.frombuffer(f.readframes(f.getnframes()), np.int16).astype(np.float64) / 32768
w = int(0.01 * sr); n = len(x) // w
env = np.sqrt((x[: n * w].reshape(n, w) ** 2).mean(1)); loud = env > THR
idx = np.flatnonzero(loud); first, last = idx[0], idx[-1]
segs, i = [], first
while i <= last:
    j = i
    while j <= last and loud[j]: j += 1
    k = j
    while k <= last and not loud[k]: k += 1
    segs.append((i, j, k)); i = k
out = [np.zeros(int(0.05 * sr))]
for a, b, c in segs:
    out.append(x[a * w: b * w])
    gap = (c - b) * w
    if c > last: break
    if gap / sr >= MIN:
        h = int(KEEP * sr / 2); out += [x[b * w: b * w + h], x[c * w - h: c * w]]
    else: out.append(x[b * w: c * w])
out.append(x[(last + 1) * w: (last + 1) * w + int(0.15 * sr)])
y = np.concatenate(out)
with wave.open(dst, "wb") as f: f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr); f.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
print(f"{len(x)/sr:.2f}s -> {len(y)/sr:.2f}s, speech starts at {first*w/sr:.2f}s in the source")
