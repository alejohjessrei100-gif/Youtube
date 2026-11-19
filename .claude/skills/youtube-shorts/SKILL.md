---
name: youtube-shorts
description: The whole workflow for making this channel's YouTube Shorts, from the idea to the upload and learning from the results. Ideas and the "crime that isn't" script formula, the user's ElevenLabs voiceover, building the 3D toon film (camera-led staging, detail pass, every-frame checker, stills), the sound mix, publishing to the phone renderer page, the user's render and the full review loop, the YouTube package (file named by title, SEO title, description, hashtags, cover frame, pinned comment), upload, and the post-upload analytics review that feeds the next script. Use it for any step of making a video: new scripts, a voiceover arriving, building, fixing, reviewing, titles, uploading or "how did it do".
---

# youtube-shorts: idea → script → voice → build → check → render → review → package → upload → learn

The whole pipeline for this channel's Shorts (vertical 3D toon stories, ~35–40 s). `CLAUDE.md` holds the
non-negotiable QA protocol and standing preferences; this skill is the order of work. The `inkbeat-shorts` skill holds
rendering technique. Every step exists because skipping it cost a video.

Look and title rules from the reference channel: [references/style-bible.md](references/style-bible.md).

## The loop at a glance
| § | Stage | Who | Output |
|---|---|---|---|
| 1 | Ideas + scripts | Claude | 4–5 scripts with ratings and camera beats |
| 2 | Voiceover | User, then Claude | the user's ElevenLabs mp3 + speed → sped, aligned voice |
| 3–5 | Build | Claude | world, cast, shots; detail pass; every-frame checker passing |
| 6 | Stills | Claude | every scene looked at and fixed before the user sees it |
| 7 | Sound | Claude | the mix at the approved balance |
| 8 | Publish + render | Claude (after asking), then User | film on the phone page; the user renders the mp4 (named by its title) |
| 9 | Review | Claude | full-timeline QA of that mp4, fixes, back to §8 until clean |
| 10 | Package | Claude | title, description, hashtags, cover frame, pinned comment |
| 11 | Upload | User | the Short on YouTube |
| 12 | Learn | Both | analytics read; lessons written into `CLAUDE.md`; back to §1 |

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
**The user's side:** paste the chosen script into ElevenLabs (voice "Lane – Professional Podcaster"; the files so far
say `pvc s0 sim100 v4`), download the mp3, send it with a speed ("1.15x"). Speeds so far: 1.10–1.25x; use exactly
what they say. **Claude's side:**
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

## 4. Detail pass: a GATE, not advice (the user rejects empty sets, every time)
Nothing goes to stills until every box below is done for EVERY set in the film (tests and samples included; a reused
set must be re-dressed for the new story). Report the list, ticked, with the build.
- [ ] **Ground cover:** grass tufts, flowers, gravel, leaves, dirt: no flat colour fields.
- [ ] **Surface materials:** textures on walls, floors, wood, stone (not plain colour); worn edges, stains, moss.
- [ ] **Set dressing from the story's world:** 15+ props that belong there (tools, signs, crates, plants, furniture),
      at several distances; nothing floating, nothing coplanar.
- [ ] **Readable signs / text** that tell the story (shop names, notices, labels), as in the reference channel.
- [ ] **Background landmarks:** buildings, trees, hills, a skyline or far lights: never a plain backdrop.
- [ ] **Light:** one strong key with cast shadows, a visible light source in the scene, warm vs cool, light shafts
      or glows; grade per the style bible (darker, richer, ~10% real shadow).
- [ ] **Life:** birds, a pet, passers-by, lit windows, drifting particles (dust, leaves, steam, confetti).
- [ ] **Weather / air:** wind in foliage, mist, rain, sparks, smoke where the scene allows.
- [ ] **The key object** has its own detail (engraving, wear, a highlight), and one close-up insert.
- [ ] **Characters:** a costume/hat that says who they are (within the locked look), expressive faces and gestures.
- [ ] **2D inserts** (papers, signs, diagrams) have texture: paper grain, folds, stains, drawings.
- [ ] Every added object is in the every-frame checker's obstacle list.
A sample with an empty background is a failed build even if the camera work is right.

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

## 10. Package for YouTube (once the review is clean)
- **Title** (the user asks "give me the seo title only" → reply with the title alone): curiosity + the impossible fact,
  ≤ 60 characters before the emoji, one fitting emoji, ` #shorts`. Write it from the payoff, never promising more than
  the video delivers. Examples that shipped: "He Broke Into a Museum 11 Times and Stole Nothing 🖼️ #shorts",
  "Nobody in Town Owned a Dog Named Biscuit 🐶 #shorts".
- The same title goes in `web/main.tsx` (`title:`) so the rendered file is already named for upload.
- **Description** (2–3 lines): the hook question restated, no spoilers, 3–5 hashtags (#shorts #story #mystery plus
  one topic tag). **Cover frame:** suggest the frame number with the clearest face + the mystery object.
- **Pinned comment:** a question that invites guesses or opinions ("Would you have pressed charges?").

## 11. Upload (the user)
Upload the mp4 as a Short from the phone; paste the title and description; set the cover frame; post the pinned
comment. Note the upload time so the analytics read is fair.

## 12. Learn from the results (after ~48 h, again at ~7 days)
- Ask for screenshots of YouTube Studio: **stayed-to-watch vs swiped away**, average view duration / % viewed, the
  retention graph, views and the traffic source split. Never invent numbers or benchmarks.
- Read it against the script: where the retention graph drops, look at that exact second of the film (the words, the
  shot, the cut) and name the likely cause. Separate what the data confirms from creative judgment.
- Compare with the channel's other Shorts (the user's baseline matters more than outside benchmarks).
- Write what was learned into `CLAUDE.md` standing preferences (e.g. "crime-like mystery + innocent twist gets views";
  "too many cuts"; "voice 1.15x"), so the next script and build start from it. Then back to stage 1.
