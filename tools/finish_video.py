"""Final assembly for a Kaggle-rendered video: word-timed captions + synthesized SFX + voice -> one mp4.

    python tools/finish_video.py <VNAME> <script.txt> <vo_clean.wav> <part1.mp4> [part2.mp4 ...] --out final.mp4 [--cues cues.json]

* captions: script words aligned (difflib) to Whisper word times, shown 3 words at a time, current word highlighted
* sfx: tiny synthesized stand-ins (vine boom, whoosh, gasp, pop, ding, scream) mixed under the voice at ~0.35 gain
* the voice is only loudness-normalised (-14 LUFS); it is never stretched or pitched
"""
import sys, os, re, json, wave, subprocess, difflib
import numpy as np
SR = 48000
def words_from_whisper(wav16):
    from faster_whisper import WhisperModel
    w = wave.open(wav16); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    seg, _ = WhisperModel('tiny.en', compute_type='int8').transcribe(a, word_timestamps=True)
    return [(re.sub(r"[^a-z']", '', x.word.lower()), x.start, x.end) for s in seg for x in s.words]
def align(script, W, dur):
    T = script.split(); norm = [re.sub(r"[^a-z']", '', t.lower()) for t in T]
    sm = difflib.SequenceMatcher(None, norm, [w[0] for w in W], autojunk=False); st = [None] * len(T)
    for i, j, n in sm.get_matching_blocks():
        for k in range(n): st[i + k] = W[j + k][1]
    last = -1
    for i in range(len(T) + 1):
        if i == len(T) or st[i] is not None:
            if i - last > 1:
                a = st[last] if last >= 0 else 0.; b = st[i] if i < len(T) else dur
                for k in range(last + 1, i): st[k] = a + (b - a) * (k - last) / (i - last)
            last = i
    for i in range(1, len(T)): st[i] = max(st[i], st[i - 1] + .05)
    return T, st
def ass(T, st, dur, W_=720, H_=1280):
    def tm(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return '%d:%02d:%05.2f' % (h, m, s)
    out = ['[Script Info]', 'ScriptType: v4.00+', 'PlayResX: %d' % W_, 'PlayResY: %d' % H_, 'WrapStyle: 2', '',
           '[V4+ Styles]', 'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding',
           'Style: Cap,DejaVu Sans,64,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,7,3,2,40,40,330,1', '',
           '[Events]', 'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text']
    # groups of up to 3 words, broken after sentence ends
    groups = []; cur = []
    for i, w in enumerate(T):
        if cur and len(' '.join(T[k] for k in cur + [i])) > 15: groups.append(cur); cur = []
        cur.append(i)
        if len(cur) == 3 or re.search(r'[.!?]$', w): groups.append(cur); cur = []
    if cur: groups.append(cur)
    for g in groups:
        for gi, i in enumerate(g):
            a = st[i]; b = st[g[gi + 1]] if gi + 1 < len(g) else (st[g[-1] + 1] if g[-1] + 1 < len(T) else dur)
            b = min(b, a + 1.1) if gi + 1 == len(g) else b
            txt = ' '.join(('{\\c&H00E5FF&}%s{\\c&HFFFFFF&}' % re.sub(r'[,.!?]$', lambda m: m.group(0), T[k])) if k == i else T[k] for k in g).upper()
            out.append('Dialogue: 0,%s,%s,Cap,,0,0,0,,{\\fad(0,0)}%s' % (tm(a), tm(max(b, a + .12)), txt))
    return '\n'.join(out) + '\n'
# ---------------- tiny synthesized SFX
def env(n, a=.005, r=.3): t = np.arange(n) / SR; return np.minimum(t / a, 1) * np.exp(-t / r)
def sfx(kind):
    n = lambda s: int(SR * s); rng = np.random.default_rng(1)
    if kind == 'vine boom':
        N = n(1.2); t = np.arange(N) / SR; f = 55 + 90 * np.exp(-t * 7); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(N, .003, .35) * 1.2
    if kind == 'whoosh':
        N = n(.55); x = rng.standard_normal(N); k = np.hanning(900); y = np.convolve(x, k / k.sum(), 'same') - np.convolve(x, np.hanning(60) / np.hanning(60).sum(), 'same') * 0 
        t = np.arange(N) / SR; return np.sin(np.pi * t / .55) ** 2 * (x * np.linspace(.2, 1, N) * .5 + y * 8)
    if kind == 'gasp':
        N = n(.5); x = rng.standard_normal(N); b = np.convolve(x, np.ones(6) / 6, 'same') - np.convolve(x, np.ones(40) / 40, 'same'); t = np.arange(N) / SR; return b * np.sin(np.pi * t / .5) ** 1.5 * .9
    if kind == 'pop':
        N = n(.18); t = np.arange(N) / SR; return np.sin(2 * np.pi * (900 - 2500 * t) * t) * env(N, .001, .04) * 1.2
    if kind == 'ding':
        N = n(1.0); t = np.arange(N) / SR; return (np.sin(2 * np.pi * 1318 * t) + .4 * np.sin(2 * np.pi * 2637 * t)) * env(N, .002, .35) * .7
    if kind == 'scream':
        N = n(1.1); t = np.arange(N) / SR; f = 700 + 500 * np.sin(2 * np.pi * 6 * t) + 600 * t; ph = np.cumsum(f) / SR; y = sum(np.sin(2 * np.pi * ph * h) / h for h in (1, 2, 3, 4)) * (1 + .3 * rng.standard_normal(N)); return y * np.minimum(t / .03, 1) * np.exp(-np.maximum(t - .7, 0) * 5) * .35
CUES = [['vine boom', .05, .5], ['whoosh', 6.9, .45], ['gasp', 19.45, .4], ['pop', 38.15, .45], ['ding', 40.75, .35], ['scream', 51.35, .35]]
def mix_audio(vo, cues, out, dur):
    w = wave.open(vo); v = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768 if w.getsampwidth() == 2 else None
    sr = w.getframerate(); assert sr == SR and v is not None, 'expected 48k 16-bit mono wav'
    bed = np.zeros(int(SR * dur) + SR); bed[:len(v)] += v
    for k, t0, g in cues:
        s = sfx(k); s = s / (np.abs(s).max() + 1e-9) * g * .6; i = int(t0 * SR); bed[i:i + len(s)] += s[:len(bed) - i]
    bed = bed[:int(SR * dur)]; bed = bed / max(1e-9, np.abs(bed).max()) * .89
    wv = wave.open(out, 'wb'); wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes((bed * 32767).astype(np.int16).tobytes()); wv.close()
def main():
    a = sys.argv[1:]; vn, scr, vo = a[0], a[1], a[2]; out = a[a.index('--out') + 1]
    parts = [x for x in a[3:a.index('--out')]]
    wv = wave.open(vo); dur = wv.getnframes() / wv.getframerate(); wv.close()
    d = os.path.dirname(os.path.abspath(out)); w16 = os.path.join(d, vn + '_vo16.wav')
    if not os.path.exists(w16): subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', vo, '-ac', '1', '-ar', '16000', '-sample_fmt', 's16', w16], check=True)
    T, st = align(open(scr).read(), words_from_whisper(w16), dur)
    asp = os.path.join(d, vn + '_captions.ass'); open(asp, 'w', encoding='utf-8').write(ass(T, st, dur)); print('captions', asp, len(T), 'words')
    cues = json.load(open(a[a.index('--cues') + 1])) if '--cues' in a else CUES
    aud = os.path.join(d, vn + '_mix.wav'); mix_audio(vo, cues, aud, dur)
    lst = os.path.join(d, vn + '_parts.txt'); open(lst, 'w').write(''.join("file '%s'\n" % os.path.abspath(p) for p in parts))
    vf = "ass=%s:fontsdir=/usr/share/fonts/truetype/dejavu" % asp.replace('\\', '/')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-i', aud, '-vf', vf, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11',
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
    print('wrote', out)
if __name__ == '__main__': main()
