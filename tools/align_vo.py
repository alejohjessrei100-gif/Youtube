"""Force-align the known script to a voice WAV with PocketSphinx (pip install pocketsphinx).
usage: python tools/align_vo.py voice.wav script.txt out.json   -> [[word, start, end], ...] in script order"""
import json, re, subprocess, sys
from pocketsphinx import Decoder
wav, txt, out = sys.argv[1:4]
SPOKEN = {"9:14": "nine fourteen", "9:13": "nine thirteen", "1876": "eighteen seventy six", "1980": "nineteen eighty", "fourteen-inch": "fourteen inch", "backwards": "backwards", "1930s": "nineteen thirties", "1967": "nineteen sixty seven", "eighty-three": "eighty three", "eighty-one": "eighty one", "right-hand": "right hand", "1931": "nineteen thirty one", "twenty-two": "twenty two", "Twenty-two": "twenty two", "great-grandfather": "great grandfather", "gravestones": "grave stones", "stonemason": "stone mason"}
EXTRA = {"agloe": "AE G L OW", "mcnally": "M AH K N AE L IY", "mapmaker": "M AE P M EY K ER", "pecks": "P EH K S", "waddles": "W AA D AH L Z", "partner's": "P AA R T N ER Z", "neighbours": "N EY B ER Z", "hoodie": "HH UH D IY", "okafor": "OW K AA F AO R", "nobody's": "N OW B AA D IY Z"}
script = open(txt).read().split()
words, owner = [], []
for i, w in enumerate(script):
    for s in SPOKEN.get(w.strip(".,"), re.sub(r"[^a-z' ]", "", w.lower())).split():
        words.append(s); owner.append(i)
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", wav, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
d = Decoder(samprate=16000, bestpath=False)
for w in sorted(set(words)):
    if d.lookup_word(w) is None:
        if w not in EXTRA: sys.exit(f"missing pronunciation: {w}")
        d.add_word(w, EXTRA[w], True)
d.set_align_text(" ".join(words))
d.start_utt(); d.process_raw(pcm, full_utt=True); d.end_utt()
d.set_alignment(); d.start_utt(); d.process_raw(pcm, full_utt=True); d.end_utt()
seg = [(s.name, s.start / 100, (s.start + s.duration) / 100) for s in d.get_alignment() if s.name not in ("<sil>", "<s>", "</s>", "[NOISE]", "sil")]
assert len(seg) == len(words), (len(seg), len(words))
res = {}
for (n, a, b), o in zip(seg, owner):
    r = res.setdefault(o, [script[o], a, b]); r[2] = b
json.dump([res[i] for i in range(len(script))], open(out, "w"))
print(len(script), "words; last ends at", res[len(script) - 1][2])
