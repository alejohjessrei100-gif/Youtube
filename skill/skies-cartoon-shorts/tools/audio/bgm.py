# © skies — original light, bouncy background loop synthesized from scratch (no samples, no third-party music):
# plucked bass on the roots, vibraphone off-beat chords, a glockenspiel tune from the chord tones, soft brushes.
# The file is cut to EXACTLY the video's length and its head is crossfaded with the music just past the end, so the
# short loops without a jump.   python3 bgm.py DURATION_SECONDS OUT.wav [seed] [bpm] [mood: bright|mystery|cozy]
import sys, numpy as np
from dsp import SR, ns, rng, pan, place, fades, make_ir, convolve_st, integrated, dbg, hp, lp
import instruments as I
dur = float(sys.argv[1]); out = sys.argv[2]; seed = int(sys.argv[3]) if len(sys.argv) > 3 else 7
bpm = float(sys.argv[4]) if len(sys.argv) > 4 else 112; mood = sys.argv[5] if len(sys.argv) > 5 else "bright"
r = rng(seed); q = 60 / bpm; bar = 4 * q
PROG = {"bright": [(48, [60, 64, 67]), (45, [57, 60, 64]), (41, [57, 60, 65]), (43, [55, 59, 62])],
        "mystery": [(45, [57, 60, 64]), (41, [57, 60, 65]), (43, [55, 59, 62]), (40, [55, 59, 64])],
        "cozy": [(41, [57, 60, 65]), (43, [55, 59, 62]), (45, [57, 60, 64]), (48, [55, 60, 64])]}[mood]
total = dur + 3.0; nb = int(np.ceil(total / bar)) + 1
buf = np.zeros((2, ns(nb * bar + 3)))
for b in range(nb):
    root, ch = PROG[b % 4]; t0 = b * bar
    for k, off in enumerate([0, 2]):                                     # bass: root on 1, fifth on 3
        n = root + (7 if k else 0); place(buf, pan(I.pluck(I.m2f(n - 12 + 12), 0.8, r, dur=q * 1.6, bright=0.35), 0.0), t0 + off * q, 0.9)
    for beat in [0.5, 1.5, 2.5, 3.5]:                                   # off-beat vibes chord stabs
        for j, m in enumerate(ch): place(buf, pan(I.vibes(I.m2f(m), 0.32, r, dur=q * 1.2, damp=q * 0.9), -0.3 + 0.3 * j), t0 + beat * q, 0.5)
    for beat in [1, 3]: place(buf, pan(I.brush(0.45, r), 0.15), t0 + beat * q, 0.6)
    for beat in [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]: place(buf, pan(I.brush(0.18, r, dur=0.12), -0.2), t0 + beat * q, 0.35)
    if b % 8 >= 4:                                                      # a light glockenspiel tune on alternate phrases
        notes = [ch[int(r.integers(0, 3))] + 12 for _ in range(4)]
        for i2, m in enumerate(notes): place(buf, pan(I.glock(I.m2f(m), 0.45, r, dur=1.2), 0.25), t0 + (i2 + (0.5 if i2 % 2 else 0)) * q, 0.55)
buf = convolve_st(hp(buf, 40), make_ir(0.9, seed)) * 0.35 + buf * 0.8
n = ns(dur); k = ns(2.5)
y = buf[:, :n].copy(); w = np.linspace(0, np.pi / 2, k)
y[:, :k] = buf[:, :k] * np.sin(w) + buf[:, n:n + k] * np.cos(w)      # seamless loop: the start continues the end
y *= dbg(-20.0 - integrated(y))
import soundfile as sf; sf.write(out, y.T, SR, subtype="PCM_24")
print("bgm", round(n / SR, 3), "s, LUFS", round(integrated(y), 1))
