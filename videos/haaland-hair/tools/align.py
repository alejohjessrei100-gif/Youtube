"""Align SCRIPT.txt words to pocketsphinx word times -> work/words.json [{w, t0, t1}]."""
import json, re, subprocess, sys, difflib
asr_line = subprocess.run([sys.executable, '-I', 'tools/asr.py', 'work/voice16.wav'], capture_output=True, text=True).stdout.split()
asr = [(re.sub(r"\(\d\)", "", a.split('@')[0]).lower(), float(a.split('@')[1])) for a in asr_line]
script = open('SCRIPT.txt').read().split()
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())
A = [a[0] for a in asr]; B = [norm(w) for w in script]
t = [None] * len(script)
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
    if tag in ('equal', 'replace'):
        for k in range(j2 - j1):
            ia = i1 + min(k, i2 - i1 - 1) if i2 > i1 else None
            if ia is not None: t[j1 + k] = asr[ia][1]
# fill gaps by interpolation, keep monotonic
known = [i for i, v in enumerate(t) if v is not None]
for i in range(len(t)):
    if t[i] is None:
        a = max([k for k in known if k < i], default=None); b = min([k for k in known if k > i], default=None)
        if a is None: t[i] = t[b] - .3 * (b - i)
        elif b is None: t[i] = t[a] + .3 * (i - a)
        else: t[i] = t[a] + (t[b] - t[a]) * (i - a) / (b - a)
for i in range(1, len(t)): t[i] = max(t[i], t[i - 1] + .05)
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', 'voice/voice.mp3'], capture_output=True, text=True).stdout)
out = [{'w': w, 't0': round(t[i], 2), 't1': round(min(t[i + 1] if i + 1 < len(t) else dur, t[i] + .9), 2)} for i, w in enumerate(script)]
json.dump(out, open('voice/words.json', 'w'), indent=0)
print(len(out), 'words; dur', dur); print(' '.join(f"{o['w']}@{o['t0']}" for o in out))
