"""Gap-free voice-over: cut every pause out of the creator's recording ("no pauses, continuous").

    python tools/vo_clean.py <source video/audio> <VNAME> [--thr -42] [--gap 0.06] [--pre 0.025] [--post 0.055]

Writes (in the current folder):
  <VNAME>_vo_clean.wav   48 kHz mono, the voice exactly as it will sound in the video
  <VNAME>_vo16.wav       16 kHz mono 16-bit copy, read by the engine for lip sync (vo_envelope)
  <VNAME>_cutmap.json    {"cuts": [[src_start, src_end], ...], "map": [[src_a, src_b, new_a, new_b], ...], "dur": seconds}
and prints a table of the kept pieces with their NEW times — use it to time shots and TALK lines.

Method (the one every shipped video used): 5 ms energy envelope, speech = louder than -42 dBFS, gaps shorter than
60 ms are kept (they are inside words), each piece padded 25 ms before / 55 ms after, 4 ms fades, pieces butted together.
Result: about 0.06 s between phrases, nothing chopped mid-word. The post script rebuilds the final voice from the
ORIGINAL file with the same cuts (24-bit), so quality is never lost.
"""
import os, sys, json, subprocess, shutil
import numpy as np

def ff():
    for c in ('ffmpeg', os.environ.get('FFMPEG', '')):
        if c and shutil.which(c): return shutil.which(c)
    raise SystemExit('ffmpeg not found (pip install imageio-ffmpeg, or set FFMPEG)')

def main():
    a = sys.argv[1:]
    if len(a) < 2: print(__doc__); sys.exit(1)
    src, vn = a[0], a[1]
    opt = lambda k, d: float(a[a.index(k) + 1]) if k in a else d
    thr, mgap, pre, post = opt('--thr', -42.), opt('--gap', .06), opt('--pre', .025), opt('--post', .055)
    SR = 48000; F = ff()
    raw = subprocess.run([F, '-v', 'error', '-i', src, '-vn', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).copy(); hop = int(SR * .005)
    n = len(x) // hop; fr = x[:n * hop].reshape(n, hop)
    db = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
    on = db > thr
    segs = []; i = 0
    while i < n:
        if on[i]:
            j = i
            while j < n and on[j]: j += 1
            segs.append([i * .005, j * .005]); i = j
        else: i += 1
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < mgap: merged[-1][1] = s[1]
        else: merged.append(s)
    merged = [s for s in merged if s[1] - s[0] >= .04]           # drop clicks / breaths shorter than 40 ms
    total = len(x) / SR; cuts = []
    for s0, s1 in merged:
        c = [max(0., s0 - pre), min(total, s1 + post)]
        if cuts and c[0] <= cuts[-1][1]: cuts[-1][1] = c[1]
        else: cuts.append(c)
    fade = int(SR * .004); out = []; mp = []; t = 0.
    for s0, s1 in cuts:
        seg = x[int(s0 * SR):int(s1 * SR)].copy()
        if len(seg) > 2 * fade:
            seg[:fade] *= np.linspace(0, 1, fade); seg[-fade:] *= np.linspace(1, 0, fade)
        out.append(seg); d = len(seg) / SR; mp.append([round(s0, 3), round(s1, 3), round(t, 3), round(t + d, 3)]); t += d
    y = np.concatenate(out) if out else x
    pk = np.abs(y).max() or 1.; y = (y / pk * .89).astype(np.float32)
    def wr(path, sr):
        subprocess.run([F, '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-ar', str(sr), '-c:a', 'pcm_s16le', path], input=y.tobytes(), check=True)
    wr(vn + '_vo_clean.wav', 48000); wr(vn + '_vo16.wav', 16000)
    json.dump({'cuts': [[round(a_, 3), round(b_, 3)] for a_, b_ in cuts], 'map': mp, 'dur': round(t, 3)}, open(vn + '_cutmap.json', 'w'), indent=0)
    print('source %.2fs -> clean %.2fs, %d pieces (thr %.0f dB)' % (total, t, len(cuts), thr))
    print('  #   new_start  new_end   (src_start-src_end)')
    for k, (s0, s1, n0, n1) in enumerate(mp): print('%3d   %7.3f  %7.3f   (%.3f-%.3f)' % (k, n0, n1, s0, s1))

if __name__ == '__main__':
    main()
