---
name: mystery-short
description: The end-to-end workflow for this channel's 3D toon YouTube Shorts, from script to verified render. Covers the "crime that isn't" script formula, camera-led staging (few scenes, handoffs, entrances, follows), the user's voiceover (speed-up only, alignment), world + shots as data, the every-frame checker, detail pass, still checks, the sound mix, publishing to the phone renderer page and the full-timeline review of the user's render. Use it whenever the user asks for new scripts, sends a voiceover, or asks to build, fix or review a Short.
---

# mystery-short: script → voice → build → check → publish → review

The house workflow for this repo's Shorts (Remotion + React Three Fiber toon kit; see the `inkbeat-shorts` skill for
rendering technique). `CLAUDE.md` holds the non-negotiable QA protocol and standing preferences; this skill is the
order of work that satisfies them. Every step below exists because skipping it shipped a bad video.

## 0. Ground rules (from the user)
- Ask before publishing anything to the phone page. Commit and push code as you go (branch in the session's git rules).
- Never call a video clean without inspecting rendered frames. Report exactly what was and was not checked.
- The user's weekly usage is limited: let scripts do the checking, look at images only where they matter, no
  speculative re-renders.
- Every film gets its YouTube SEO title in `web/main.tsx` (`title:`); the rendered file is saved under it.

## 1. Scripts
- **Shape that gets views:** a mystery that looks like a crime or something sinister → people investigate and fail →
  a clue → someone caught in the act → a two- or three-line human, innocent backstory → a short callback payoff.
- **Style (the reference channel's format):** first line is an impossible fact; short punchy sentences and fragments
  ("They change the lock. Next morning: ..."); ~105–120 words for 35–40 s; no moral at the end.
- **Written for the camera** (the user's camera rules; list these beats under every script):
  - 2–4 scenes only; cut only for a change of place, time or purpose; one continuous moving lens per scene.
  - One **object handoff** (a thrown / rolling / sliding object the lens follows, then hands to whoever reacts).
  - One **entrance** the lens widens for. One **walk or run** the lens follows. **Held reactions.**
- Original fiction, not always time-related. Give 4–5 options, each a single paragraph, each with a rating out of 10
  and reasons, then recommend.

## 2. The voiceover
The user sends an ElevenLabs mp3 plus a speed ("1.15x").
```bash
F=<upload>; NAME=<film>
cp "$F" public/audio/$NAME-raw.mp3
ffmpeg -v error -y -i "$F" -filter:a atempo=<speed> -ac 1 -ar 48000 public/audio/$NAME-voice.wav   # speed only, never trim pauses
```
- Identify which script it is with a 7 s PocketSphinx decode (cheaper than asking), then save the exact script to
  `tools/script_$NAME.txt`.
- Align: `python3 tools/align_vo.py public/audio/$NAME-voice.wav tools/script_$NAME.txt /tmp/w.json`. Missing words →
  add to `SPOKEN` (numbers, hyphenated words; keys are case-sensitive) or `EXTRA` (phonemes). Check: no gap > 0.6 s
  and no word > 1 s (a misalignment).
- Write `src/$NAME/words.gen.ts` (WORDS, FPS 30, SECONDS = last word end + 1.4).

## 3. Build: world, cast, shots (data first)
`src/$NAME/{world.tsx, cast.ts, shots.ts, $Name.tsx, words.gen.ts}`; register in `web/main.tsx` (with `title`) and
`src/Root.tsx`. Reuse: crow `shots.ts` exports `ik` (human-range arm solve), `keyed`, `C`, `look`, `head`,
`headPosed`, `hand`, `yawTo`, `lerpAng`, `smooth`; gull `Sea`, `Gull` (palette prop), `Lighthouse`, `Tuft`, `Rock`;
biscuit `Dog`; museum `Flashlight`.
- **Word anchors:** `W(word, nth)` — count occurrences carefully ("and", "the", "that", "her" recur).
- **Faces read:** lenses at eye level, within ~30–50° of where the character faces. A lens behind a character facing
  the subject (people facing stones / a board) shows the back of a huge toon head: put the lens on the far side of
  the subject, looking back at faces, and cheat bodies 35–45% toward the lens.
- **Toon proportions:** heads are ~0.47 m wide. Hand-to-chin / head-in-hand targets land inside the head: use other
  gestures. Seated shoulders sit ~0.7 m up: tables ≤ 0.62 m. Keep lean small (it tips the big head at the lens).
- **Portrait frames are narrow** (horizontal FOV ≈ 27° at 46° vertical): groups need distance; check everyone fits.
- **No swoops or whips:** a move that crosses a large angle in < 1 s is a cut. Make it a separate shot.
- **Props:** the authored path is the truth (pawn, king, notebook); the hand is solved onto it and the checker
  verifies the grip. Things pushed by a beak/hand move only while in contact (monotone, contact-driven).
- **Phone GPU:** no coplanar faces — keep ≥ 1–2 cm between parallel surfaces, inset joined solids (e.g. a stone's
  rounded top 1 cm inside the slab front and back), `recv={false}` on large grazing-lit surfaces. Decals are a
  separate solid, never a plane on a face.

## 4. Detail pass (never skip — the user rejects empty sets)
Before the first still: ground cover (tufts, flowers), paths, varied props of the place, signs of life (birds, a
dog, lit windows at night, a lantern), background landmarks (buildings, a far lighthouse), weather (rain, lightning
flash), object details (names, plates, crates, lifebuoys), 2D inserts with texture (aged paper, folds, stains,
drawings). Every added object goes into the checker's obstacle list.

## 5. The every-frame checker (`tools/qa/<film>_check.ts`, run before any render)
`npx esbuild tools/qa/<film>_check.ts --bundle --platform=node --outfile=/tmp/c.js && node /tmp/c.js`
It must cover, every frame: bodies vs each other and every static object; the lens inside or < 0.55–0.6 m from any
head (use `headPosed`, which includes lean); lens→focus sightline vs posed heads (sphere r 0.27), posts, trees,
walls, vehicles, tabletops; arm angles in human range; head yaw ≤ 75°; faces within 50–60° of the lens in their
beats; hand↔prop grip; prop continuity (no jumps inside a scene); turn ≤ 6°/frame, jump ≤ 0.12 m/frame; shadow box
covers the actors. Fix until `OK: no issues`.

## 6. Stills (look-dev) — before the user ever sees it
```bash
(cd web/dist && python3 -m http.server 8765)        # run_in_background, timeout 7200000; it dies at 2 h
npm run -s web:build
COMP=<Id> node tools/t/websheet.js <scratch>/g1 0.5 <one frame mid-scene per scene ...>   # 3–4 parallel workers
python3 -I tools/qa/sheets.py <scratch>/g1 <scratch>/g1/sheets 6 3
```
Look at every scene at half resolution. Hunt: backs of heads, crops, fins/geometry through faces, flat white slabs,
floating bits, z-fighting stripes, empty frames. Fix, re-render only the changed frames, look again. Local rendering
is slow (~20 s/frame): stills only; the full film is reviewed from the user's phone render.

## 7. Sound (`tools/audio_<film>.py`, copied from the latest film's script)
Voice, then cues from `GRAVES_EVENTS`-style word/scene times (scene indices shift when scenes are added — re-check
`cut[i]`), beds per place (surf, wind, crickets, rain), a sparse score that ducks under the voice. Approved balance:
voice ≈ -25…-27 dB RMS, fx ≈ -31…-33, bed ≈ -37…-45, music ≈ -50…-52. Then
`bash tools/master.sh out/<film>/premaster.wav public/audio/<film>-mix.mp3` and copy the mix to `web/dist/audio/`.

## 8. Publish (only after asking)
`npm run -s web:build && cp public/audio/<film>-mix.mp3 web/dist/audio/`, then publish `web/dist/index.html` to the
phone page artifact with `files: {"app.js": ..., "audio/<film>-mix.mp3": ...}`. Tell the user the composition label
and what is and isn't verified.

## 9. Full review of the user's render (the real QA)
```bash
V=<scratch>/v; mkdir -p $V/all $V/half
ffmpeg -v error -i "$MP4" -vf scale=270:480 -q:v 4 $V/all/f%04d.jpg                       # every frame
ffmpeg -v error -i "$MP4" -vf "select=not(mod(n\,5)),scale=540:960" -vsync 0 -q:v 3 $V/half/f%04d.jpg   # 6 fps
python3 -I tools/qa/scan_spikes.py $V/all <cut frames +1, comma-separated>
python3 -I tools/qa/sheets.py $V/half $V/sheets 8 4
```
Every spike → extract those frames at full size and look. Read every contact sheet. List every defect with its
time, find root causes, fix in code, re-check stills of the changed shots, ask before publishing again. Report:
what ran, what was found and fixed, what was not verified (phone GPU, motion between samples).
