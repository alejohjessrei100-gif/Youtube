import sys, wave, json
from pocketsphinx import Decoder
d = Decoder(samprate=16000)
w = wave.open(sys.argv[1], 'rb'); d.start_utt(); d.process_raw(w.readframes(w.getnframes()), full_utt=True); d.end_utt()
words = [(s.word, s.start_frame / 100, s.end_frame / 100) for s in d.seg() if s.word not in ('<s>', '</s>', '<sil>', '[NOISE]')]
print(' '.join(f"{w}@{a:.1f}" for w, a, b in words))
