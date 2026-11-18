# Frame-to-frame diff spike scan over every frame (cuts excluded). usage: python -I tools/qa/scan_spikes.py FRAME_DIR CUT_FRAMES(comma)
import sys, glob, numpy as np
from PIL import Image
d, cuts = sys.argv[1], set(int(x) for x in sys.argv[2].split(','))
fs = sorted(glob.glob(d + '/f*.jpg'))
prev = None; diffs = []
for f in fs:
    a = np.asarray(Image.open(f).convert('L'), dtype=np.float32)
    if prev is not None: diffs.append((int(f[-8:-4]), float(np.abs(a - prev).mean())))
    prev = a
v = np.array([x[1] for x in diffs])
for i, (fr, x) in enumerate(diffs):
    if fr in cuts or fr - 1 in cuts or fr + 1 in cuts: continue
    lo, hi = max(0, i - 6), min(len(v), i + 7)
    med = float(np.median(np.concatenate([v[lo:i], v[i + 1:hi]])))
    if x > 2.2 * med + 1.5: print(f"SPIKE f{fr:04d} diff {x:.1f} local {med:.1f}")
print("scanned", len(diffs) + 1)
