# Where we left off (2026-11-05, night)

## Vasa short (current)
- Script v3 + facts/sources: `vasa/SCRIPT.md`. Voice `vasa/voice/voice.mp3` (38.77 s), timings `vasa/voice/words_asr.json`.
- Code: `src/videos/vasa/` (copied from cup). New: `ship.ts` (procedural Vasa: hull, ports + lids + guns, masts, sails,
  rigging, lion figurehead, flags), `world.ts` (harbour: sky, sea, quay, far shore + castle), `story.ts` (ship-local
  coords via `shipToWorld`, heel/travel in `shipPose`), `cast.ts` (sailors, crowd, gust/gull/cap fx). Composition `VasaShort`.
  Toon: new hat "brim" (1620s felt hat).
- Hook test (0-168 f) delivered: `vasa/Vasa_hook_2K.mp4`, audio `vasa/audio/hook_audio.py`. Render:
  `COMP=VasaShort node scripts/render.mjs out/vasa/hooktest 0 168 60 4 1.3333333333333333` (~9.5 s/frame, 4 tabs).
- NEXT: wait for the user's verdict on the hook; then plan shots 6+ (frame 170 on): "You see" 1628 king + shipyard,
  30 sailors running the stability test (ship rolls more each run), "sailed anyway", gust 1 / gust 2 / water through
  open gun ports, 1300 m, top-heavy cutaway, raised 1961, the museum button.
- Whisper model: npm-pack the 4 parts into /root/whisper-small (see "Setting up"); faster-whisper here needs the audio
  passed as a 16 kHz float array (av's open() signature mismatch).


## STARTING A NEW SHORT (the user's next request)
The cup short is parked: v1 was delivered, v2 fixes are in code, the user does not want it continued for now.
For a NEW storyline:
1. Copy `src/videos/cup/` to `src/videos/<slug>/`. It is the most advanced engine: line boil, idle life (`alive()`),
   strong shading, the `ZOOM` framing factor, a candle-light preset, the dichroic shader as an example of physical FX.
   Register a new composition in `src/index.ts`.
2. Follow SKILL.md: 10 ideas (fact-checked, retention-first) -> script (80-105 words, retention map + 2 alt hooks)
   -> the user records the ElevenLabs voiceover -> ASR timings -> render the 5 s hook test for approval -> full build
   -> one contact-sheet check -> 2K render -> captions (`scripts/captions.py` + a phrases file) -> send.
3. Lessons from the cup v1 feedback: frame WIDE (subjects no bigger than the cup v2 framings), keep shading clearly
   visible, keep every character fully in frame, keep the camera out of geometry.

## Cup short v2 (parked: feedback applied in code, NOT rendered)
User feedback on the v1 render (`cup/The_Cup_That_Changes_Colour_2K_captions.mp4`):
1. Framing too tight. All cameras now sit `ZOOM = 1.38`x further back (`src/videos/cup/story.ts`), so subjects are
   about 72 % of their old size. The micro-world and the screen push-in are not zoomed. S2, S4 and S7 were widened
   further. The last 3 test stills (frames 50, 145, 215: out/cup/e/u*) were rendered but not reviewed.
2. Shading barely visible. Now stronger: SH_SKIN [0.7, 0.66, 0.84], SH_CLOTH [0.52, 0.54, 0.68], a broad head
   gradient (`shadedFill ..., 0.62, 0.45, 1.55`) and the torso gradient flat at 0.12 (`toon.ts`). Checked: reads clearly.
3. A scientist went out of frame. SCI is now [LBX-0.9] and [LBX+0.95], S10 is wider (fov 50), and S11 starts offset
   so the push-in stays clear of them. Checked: both in frame.
NEXT: check stills 50/145/215, run a 1-in-12 contact sheet, render with
`COMP=CupShort node scripts/render.mjs out/cup/final2 0 1056 100 2 1.3333333333333333`, then run
`scripts/finish_cup.sh` (change D=out/cup/final to final2) and send the captioned MP4.
Keep framings this wide (or wider) and the shading this strong in every future short.


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
