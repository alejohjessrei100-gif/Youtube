# Force-align a known script to a 16 kHz mono WAV with PocketSphinx (its English model ships inside the pip package,
# so no model download is needed). Needs: pip install pocketsphinx. usage: python align_vo.py audio16k.wav words.txt raw.json
# words.txt = the script lowercased, digits spelled out; then map raw.json back to the script words for vo/timings.json.
import json, sys, wave
from pocketsphinx import Decoder
wav, txt, out = sys.argv[1:4]
words = open(txt).read().split()
EXTRA = {"grafton": "G R AE F T AH N", "invercauld": "IH N V ER K AO L D", "kilometres": "K IH L AA M AH T ER Z"}
d = Decoder(samprate=16000, bestpath=False)
for w in sorted(set(words)):
    if d.lookup_word(w) is None:
        if w in EXTRA:
            d.add_word(w, EXTRA[w], True)
        else:
            sys.exit(f"missing pronunciation: {w}")
d.set_align_text(" ".join(words))
with wave.open(wav, "rb") as f:
    pcm = f.readframes(f.getnframes())
d.start_utt(); d.process_raw(pcm, full_utt=True); d.end_utt()
d.set_alignment(); d.start_utt(); d.process_raw(pcm, full_utt=True); d.end_utt()
res = [(s.name, s.start / 100, (s.start + s.duration) / 100) for s in d.get_alignment()]
json.dump(res, open(out, "w"))
print(len(res), "segments"); print(res[:12])
