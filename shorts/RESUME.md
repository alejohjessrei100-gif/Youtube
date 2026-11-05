# Where we left off (2026-11-05)

## Done
- Jenkins' Ear short: `ear/Over_a_Single_Ear_2K.mp4` and `ear/Over_a_Single_Ear_2K_captions.mp4`.
- Cup short (Lycurgus Cup): script `cup/SCRIPT.md`, voiceover `cup/voice/voice.mp3` (35.2 s), word timings
  `cup/voice/words_asr.json`, captions `cup/captions.ass`, and the 5 s hook test `cup/Cup_hook_2K.mp4`, waiting for
  the user's feedback.

## Next for the cup short
- Wait for the user's verdict on the hook. Then build shots 5+ (frames 150-1056) at the same standard:
  - "No paint. No trick. Just glass." Three denials.
  - The 1,600-year timeline.
  - The electron-microscope zoom into the glass (gold and silver specks).
  - Green light bouncing off the specks, red light passing through them.
  - The museum ending with the shrugging glassmaker.
- Frame the cup higher in the macro shots so the captions (at about 70 % of the height) don't cover it.
- Possibly more detailed carved figures on the cage.
- Full audio: extend `cup/audio/hook_audio.py` to the whole film (or base it on `ear/audio/audio.py`).

## Setting up a fresh session
- `cd shorts && npm ci` (keep `@react-three/postprocessing` at 3.0.4: 3.2.x renders blank frames in Remotion).
- `pip install scipy faster-whisper`. Speech recognition (only needed for a new voiceover): the Whisper small int8
  model comes from npm packages `@skillninja/shortmovie-telop-model-p0..p3` (HuggingFace is blocked here). `npm pack`
  them, join `model.bin.part0..3` and check it against `model.sha256`.
- Stills: `COMP=CupShort node scripts/stills.mjs out/x/s 10,50 0.5`
- Render: `COMP=CupShort node scripts/render.mjs out/cup/final 0 1056 100 2 1.3333333333333333`
  (chunked and resumable, about 6 s per frame at 2K).
- Captions: `python3 scripts/captions.py cup/voice/words_asr.json cup/captions.ass cup/phrases.txt`, then burn them
  in with ffmpeg `ass=...:fontsdir=cup/fonts`.
- All user rules (length, retention, visual hook, motion, no clipping, captions) are in `claude-animated-shorts/SKILL.md`.
