---
name: youtube-shorts
description: The whole workflow for this channel's YouTube Shorts (vertical 3D toon films, ~35–45 s), from a fresh container to an uploaded video. Setup and downloads, scripts (the "crime that isn't" formula and the facts/psychology path), the user's ElevenLabs voiceover, building the film in Remotion + React Three Fiber, Poly Haven / Sketchfab assets, the detail gate, the every-frame checker, stills, the sound mix, rendering (phone page, this container), the full review of the render, the YouTube package, upload and the analytics read. Use it for any step: setting up, new scripts, a voiceover arriving, building, fixing, rendering, reviewing, titles, uploading or "how did it do".
---

# youtube-shorts: setup → script → voice → build → check → stills → sound → render → review → package → upload → learn

Every step exists because skipping it cost a video. `CLAUDE.md` in the repo holds the non-negotiable QA protocol and
standing preferences (the key ones are repeated in §1). The `inkbeat-shorts` skill holds rendering technique.
Keep your own reference-channel notes (look, pacing, titles) in `references/style-bible.md` next to this file.

| § | Stage | Who | Output |
|---|---|---|---|
| 0 | Setup | Claude | repo, dependencies, keys, phone page reachable |
| 2 | Scripts | Claude | 4–5 scripts with ratings and camera beats |
| 3 | Voiceover | User, then Claude | ElevenLabs mp3 + speed → sped, aligned voice |
| 4–6 | Build | Claude | world, cast, shots, assets; detail gate passed |
| 7 | Checker | Claude | every-frame checker `OK: no issues` |
| 8 | Stills | Claude | every scene and risky beat looked at and fixed |
| 9 | Sound | Claude | the mix at the approved balance |
| 10 | Render | Claude (ask before publishing) / User | the mp4, named by its YouTube title |
| 11 | Review | Claude | full-timeline QA of the mp4; fix; back to §10 until clean |
| 12–14 | Package, upload, learn | Both | title, description, cover, pinned comment; analytics → CLAUDE.md |

## 0. Setup in a new container
**First, ask the user for these (never guess, never reuse values from another person's setup):**
| Placeholder | Ask the user | Used in |
|---|---|---|
| `<REPO>` | "Which GitHub repo holds your project (owner/name), and which branch should I work on?" | §0.1, commits |
| `<PHONE_PAGE_URL>` | "Do you already have a phone renderer page? Send its link, or I'll create a new private one." | §0.6, §10 |
| `<VOICE>` | "Which ElevenLabs voice and model do you use?" | §3 |
| `<VOICE_SPEED>` | "What speed should I apply to your voiceovers (e.g. 1.15x)?" | §3 |
| `<CHANNEL_TITLES>` | "Send 2–3 of your best-performing titles so new titles match your style." | §12 |
| API keys | Only through the secure credential form (`request_credential`) — never typed into chat. | §0.5 |

1. **Repo:** `<REPO>` (ask the user). Work on the branch they name; commit and push only where you are allowed.
2. **Node project:** `npm ci` (Node 20+; Remotion 4.0.540, three, @react-three/fiber, @remotion/web-renderer, esbuild,
   playwright). `npx tsc --noEmit -p .` must pass.
3. **System tools:** `ffmpeg` (6.x), Python 3 with `numpy scipy pillow pocketsphinx`
   (`pip install numpy scipy pillow pocketsphinx`). Chromium + Playwright are used for stills (`require('playwright')`;
   in Claude cloud containers they are pre-installed — never run `playwright install` there).
4. **Research tooling (optional, for watching reference videos the user provides):**
   `python3 -m venv <scratch>/asrenv && <scratch>/asrenv/bin/pip install faster-whisper opencv-python-headless Pillow`,
   then `<scratch>/asrenv/bin/python -I tools/research/watch.py VIDEO.mp4 OUT_DIR`. Never download other creators'
   videos; only analyse files the user provides.
5. **Keys — always through the secure credential form (`request_credential`), never pasted in chat.** If the user
   pastes a key anyway, don't use it from chat: store it through the form and tell them to regenerate it.
   - Sketchfab (optional): ask the user for their own token through the form (host `api.sketchfab.com`, prefix
     `Token`). Test: `GET /v3/me` → 200.
   - Poly Haven: no key (`api.polyhaven.com`; files from `dl.polyhaven.org`).
   - Never take or use the user's cookies or logins. Never bypass YouTube bot checks.
6. **Phone page (the renderer the user renders on):** `<PHONE_PAGE_URL>` (ask the user; if they have none, publish
   `web/dist/index.html` once to create a private page and give them the link; index.html + app.js + audio/<film>-mix.mp3). Before republishing from a new session, `read` the artifact (and any
   published file the publish touches, e.g. `path: "app.js"`), and check the new build still contains every film.
7. **Smoke test:** `npm run -s web:build`, start `(cd web/dist && python3 -m http.server 8765)` in the background,
   `COMP=<AnyCompId> node tools/t/websheet.js <scratch>/smoke 0.5 300` → a JPEG appears.

## 1. Ground rules (the user's, from CLAUDE.md)
- **Ask before publishing** to the phone page. Commit and push code as you go. Commit messages end with the
  attribution lines the session gives.
- **QA protocol:** a video is finished only when the RENDERED output was inspected, fixed and re-verified. Never call
  it clean from samples; list exactly what ran and what didn't; disclose known issues and that phone-GPU output was
  not verified (if it wasn't).
- **COMPLETE DETAIL on every film, tests included** (§6 gate), reported with every build.
- **Locked character look:** squircle heads, wide clavicles, sharp elbows, straight arms at rest, hands.
- **Voice:** use the user's speed (`<VOICE_SPEED>` unless they say otherwise); speed up only, never trim pauses.
- **Mix:** SFX audible, music well under the voice (§9 numbers).
- **Every film registered on the phone page gets its YouTube SEO title** (`title:` in `web/main.tsx`); renders are
  saved under that title.
- **Usage is limited:** let scripts check; look at images only where they matter; no speculative re-renders.

## 2. Scripts
Deliver 4–5 options; each a single narration paragraph (the user pastes it into ElevenLabs as-is), its camera beats,
and a rating out of 10 with reasons; then recommend one. ~110–130 words → ~35–45 s at the user's speed.
**Reference pacing:** 3.4–3.8 words/s, almost no pauses; narration starts on frame 0, ends ≤ 0.5 s before the end.

**Path A — the crime that isn't (default):** a mystery that looks like a crime or something sinister
(e.g. break-ins where nothing is stolen, something strange falling from the sky) → people investigate and fail →
someone caught in the act → "You see, …" a two- or three-line human, innocent backstory → "Then…" → a single-image payoff.

**Path B — interesting facts / psychology:** a real, published, well-replicated finding told as a story about one
person. Shape: 0 s the strange action or a "you" hook → "You see," the mechanism in one sentence → an everyday
analogy aimed at the viewer ("Ever walk into the kitchen and forget why?") → the name of the effect → a twist or
practical last line. Name the study (authors, year) in the notes under the script; never invent statistics; say
"about half" rather than a number you can't source. Examples of solid findings: change blindness (Simons & Levin 1998), the Benjamin Franklin effect (Jecker & Landy 1969), spotlight effect (Gilovich et al. 2000), doorway effect (Radvansky et al. 2011), decoy effect (Huber, Payne & Puto 1982), IKEA effect (Norton, Mochon & Ariely 2012).

**Both paths are written for the camera** — list these beats under every script:
- 2–4 places only; cut only for a change of place, time or purpose; one continuous moving lens per scene.
- One **object handoff** (a thrown / rolling / sliding object the lens follows, then hands to whoever reacts).
- One **entrance** the lens widens for. One **walk or run** the lens follows. **Held reactions.**
- Original fiction and characters; never copy or paraphrase another creator's script or art.

## 3. The voiceover
**User:** pastes the script into ElevenLabs (`<VOICE>`), sends the mp3 with a speed (default `<VOICE_SPEED>`).
**Claude:**
```bash
F=<upload.mp3>; NAME=<film>; SPEED=<1.25>
cp "$F" public/audio/$NAME-raw.mp3
ffmpeg -v error -y -i "$F" -filter:a atempo=$SPEED -ac 1 -ar 48000 public/audio/$NAME-voice.wav
mkdir -p out/$NAME && cp public/audio/$NAME-voice.wav out/$NAME/vo.wav
```
- Identify which script it is with a short PocketSphinx / faster-whisper decode (cheaper than asking); save the
  exact text to `tools/script_$NAME.txt`. If no speed was given, use the latest one the user used and say so.
- Align: `python3 tools/align_vo.py public/audio/$NAME-voice.wav tools/script_$NAME.txt /tmp/w.json`. Unknown words →
  add to `SPOKEN` (numbers, hyphenated words; case-sensitive keys) or `EXTRA` (phonemes). Check: no gap > 0.6 s, no
  word > 1 s.
- Write `src/$NAME/words.ts` (WORDS, FPS 30, SECONDS = last word end + ~0.4–1.4).
- **Word lookups:** `W(word, nth)` normalises punctuation away, so "Walt," and "Walt" are the same word — count
  every occurrence when choosing nth (a wrong nth silently moves a whole beat).

## 4. Build: world, cast, shots (data first)
Files: `src/$NAME/{world.tsx, cast.ts, shots.ts, $Name.tsx, words.ts}`; register in `web/main.tsx` (with `title`)
and `src/Root.tsx`. Stack: Remotion 4 + React Three Fiber + three.js + the inkbeat toon kit (`View`, `moodOf`
day/dusk/night/cold/lamp/golden, `CastLight`, `Captions`/`makeChunks`, `M`, `boxG/cylG/sphG/coneG/torG`, `coreMat`,
`canvasTex`, `Label`, `Character3D`). Reuse the shared helpers already in the user's repo (camera keys `C`/`keyed`, arm IK `ik`, `hand`, `head`,
`headPosed`, `look`, `lerpAng`, `yawTo`, `smooth`; `walkAt`, `window01`, `mixArm`) and props from their earlier films —
ask the user or search the repo for them; don't rebuild what exists.

**Camera grammar (from the reference channel, measured frame by frame):** 0–2 hard cuts per video, only for place or
time; inside a scene, fast eased moves of 0.45–0.6 s that land on the spoken noun; the picture changes every
1.1–1.9 s; between moves the lens drifts, never sits dead still; close-ups for dialogue; cartoon-extreme expressions
at peaks (sweat, huge eyes); characters act constantly (anticipation, crouch with the knees, bounce, point).

**Staging lessons (each cost a render):**
- **Portrait frames are narrow:** horizontal FOV ≈ 2·atan(tan(vfov/2)·9/16) ≈ 29° at 50°. Two people 2 m apart need
  ~4 m of distance, or stand them closer. A head (~0.48 m wide) fits the width only if `distance·tan(vfov/2) ≥ 0.53`
  (≈ fov 46–50 at 1.2–1.3 m).
- **Faces read:** lens within ~30–50° of where the face points; cheat bodies 35–45% toward the lens using a FIXED cheat
  point (cheating toward a moving lens makes snapping turns). A lens behind a character shows a huge back of head.
- **A head that looks UP is seen from below as a chin:** keep the lens at or above eye height of someone reaching up.
- **Lying actors:** compute the head from the lying rotation; never put the lens past the crown (the crown fills the
  frame). Low lens from the side shows both a face-up profile and the kneeling person's face.
- **`keyed` interpolates look POINTS:** a 180° swing between two far targets passes the look point through the lens
  and tilts the view into the ground. Route whips through a side-look key (`"in"` then `"out"` easing).
- **Lens near walls:** a 180° whip next to a facade always crosses it — keep the lens ≥ 1.4 m off the wall.
- **Fly-throughs** (window, door): add an intermediate key in the opening's centre, past sills and plants.
- **Props:** the authored path is the truth; the hand is IK-solved onto it; the checker verifies the grip. A held
  object must reach its mount (stools/steps if the reach fails — measure the IK error).
- **Toon proportions:** heads ~0.47 m wide; tables ≤ 0.62 m; small lean (it tips the big head into the lens).
- **Phone GPU:** ≥ 2 cm between parallel surfaces (no coplanar faces); decals are separate solids; `recv={false}` on
  large grazing-lit surfaces; safe shadow bias/normalBias; tight near/far planes.
- **Transparent meshes don't survive the ink pass**, and street fog washes far emissive objects: glows are opaque toon
  shapes (disc + rays) with an unfogged material (`fog: false, toneMapped: false`), in a saturated colour that
  contrasts with the wall behind.
- **Hardcoded offsets drift:** derive render offsets from the exported constant (e.g. `SECCAM`), never retype numbers.

## 5. Assets: Poly Haven and Sketchfab (adopted for the next film; first use still to be proven)
- **Poly Haven** (CC0, no credit needed): `GET https://api.polyhaven.com/assets?t=models|textures|hdris`,
  `GET https://api.polyhaven.com/files/<id>` for download URLs (glTF + textures at 1k/2k). Use for ground, path, wood,
  plaster and rock textures, props and furniture, sky HDRIs.
- **Sketchfab** (token): search `GET /v3/search?type=models&q=<q>&downloadable=true&license=cc0` (or `by`), download
  `GET /v3/models/<uid>/download` → a temporary glTF/zip URL. Only CC0 or CC-BY; never NC/ND/editorial. Keep
  `assets/CREDITS.md` per film (model, author, licence, link) and paste CC-BY credits into the YouTube description.
- **Fit the toon look:** load with three's `GLTFLoader` behind `delayRender`/`continueRender`; replace materials with
  flat toon colours (keep the base colour, drop PBR/roughness maps), let the ink pass outline them; decimate heavy
  meshes; textures ≤ 1k. Assets ship to the phone page as extra published files (watch the 16 MB page / file limits).
- Characters stay code-built (locked look). Every imported prop goes into the checker's obstacle boxes.

## 6. Detail pass: a GATE (the user rejects empty sets, every time)
Nothing goes to stills until every box is done for EVERY set (reused sets re-dressed). Report it, ticked, with the build.
- [ ] **Ground cover:** grass tufts, flowers, gravel, leaves, dirt — no flat colour fields.
- [ ] **Surface materials:** textured walls, floors, wood, stone; worn edges, stains, moss.
- [ ] **Set dressing:** 15+ props from the story's world at several distances; nothing floating or coplanar.
- [ ] **Readable signs / text** that tell the story.
- [ ] **Background landmarks:** buildings, trees, hills, skyline, far lights — never a plain backdrop.
- [ ] **Light:** one strong key with cast shadows, a visible source, warm vs cool, shafts or glows; ~10% real shadow.
- [ ] **Life:** birds, a pet, passers-by, lit windows, particles (dust, leaves, steam).
- [ ] **Weather / air:** wind in foliage, mist, rain, smoke where the scene allows.
- [ ] **The key object** has its own detail and one close-up insert.
- [ ] **Characters:** costume/hat that says who they are; expressive faces and gestures.
- [ ] **2D inserts** have texture (grain, folds, stains).
- [ ] Every added object is in the checker's obstacle list.

## 7. The every-frame checker (`tools/qa/<film>_check.ts`; template: the most recent film's checker in `tools/qa/`)
`npx esbuild tools/qa/<film>_check.ts --bundle --platform=node --log-level=error --outfile=/tmp/c.js && node /tmp/c.js`
Run before any stills and after every change; fix until `OK: no issues` (INFO lines allowed). Every frame:
- Lens inside/grazing any box (pad 0.1), near the floor, < 0.55 m from a posed head (`headPosed`).
- Actors inside furniture; actors overlapping; jumps > 0.15 m/frame; turns > 7°/frame.
- Arm angles in human range; head yaw ≤ 75°; speakers' faces within 45–60° of the lens in their beats.
- Hand↔prop distance (flips, held props, mounts); prop continuity.
- **FRAME CHECK (the one that matters; added after stills showed curtain/wall/leg/belly frames the old checks passed):**
  cast a 9×15 ray grid through the lens against the real boxes (include curtains, sills, door leaves, ceilings, deck,
  ground) and body spheres (head r = 0.16·h, torso, legs; lying actors rotated). Flag: > 30% of rays hit within
  max(0.5 m, 0.3·focus distance) ("blocked near the lens"); > 40% hit within 0.7·focus distance ("foreground fills
  the frame"); the lens→focus ray hits something first ("focus hidden"); a focus face cropped at the top, wider than
  the frame, or off the side — only on landed frames (skip while the view turns > 1.5°/frame, fov changes, or the lens
  moves > 3 cm/frame). Whip frames (> 8°/frame) that pass close scenery are reported as INFO.
- Two-shots: every intended actor's head fully inside the frame.
- The checker's boxes must mirror the real geometry — copy dimensions from the component, re-check when the set changes.

## 8. Stills (look-dev) — before the user sees anything
```bash
npm run -s web:build && cp public/audio/<film>-mix.mp3 web/dist/audio/
(cd web/dist && python3 -m http.server 8765)        # background; restart it if it died (curl localhost:8765)
COMP=<Id> node tools/t/websheet.js <dir> 0.5 <frames...>   # 3–4 parallel workers, ~20 s/frame; frames < duration
python3 -I tools/qa/sheets.py <dir> <dir>/sheets 8 4
```
Look at half resolution (540×960 per frame), never smaller. Cover every scene plus the risky beats (entrances,
handoffs, flips, whips, fly-throughs, the payoff). Hunt: blocked lenses, cropped faces, backs/crowns of heads, props
not in hands, floating bits, z-fighting, washed-out glows, empty frames. Fix → re-run the checker → re-render only
the changed frames → look again. For a suspicious element, render one debug frame with it bright red.

## 9. Sound (`tools/audio_<film>.py`, copied from the latest film's)
- Cue times: `tools/t/<film>_events.ts` prints word times, scene cuts, footfalls (walk phase crossing π), prop
  moments → `out/<film>/events.json`. Re-run it after any timing change; re-mix only if it changed.
- Voice; beds per place (crickets at night, birds by day, surf, wind, rain, a clock); SFX on cues (steps, whoosh on
  big moves, thuds, glass, doors, beeps); a sparse score that ducks under the voice.
- Approved balance (stem RMS): voice ≈ −25…−27 dB, fx ≈ −31…−33, bed ≈ −37…−45, music ≈ −50…−52.
- Master: `bash tools/master.sh out/<film>/premaster.wav public/audio/<film>-mix.mp3` (−14 LUFS, −1 dBTP).

## 10. Render — two ways (ask before publishing to the phone page)
1. **Phone page (the user's usual render, real phone GPU):** `npm run -s web:build && cp public/audio/<film>-mix.mp3
   web/dist/audio/`, then publish `web/dist/index.html` to the artifact with
   `files: {"app.js": "web/dist/app.js", "audio/<film>-mix.mp3": "web/dist/audio/<film>-mix.mp3"}`. The user picks
   the film and renders; the file saves under the YouTube title. Tell them the label and what's verified.
2. **This container:** the same code path as the phone page, but software WebGL: render every frame with
   `COMP=<Id> node tools/t/websheet.js out/render/<Id>/frames 1 <frames...>` split across 4 workers (~20 s/frame/
   worker: a 36 s film ≈ 1.5 h — run in the background, re-run to fill missing frames), then
   `ffmpeg -nostdin -framerate 30 -i out/render/<Id>/frames/f%04d.jpg -i public/audio/<film>-mix.mp3 -c:v libx264
   -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "out/render/<YouTube title>.mp4"`.
   (`tools/render_here.sh <Id> [workers] [from] [to]` automates this; it's new — test it on 8 frames before a full run.)
Different GPUs can render shadows, depth and glows differently; only the phone render verifies the phone.

## 11. Full review of the render (the real QA)
```bash
V=<dir>; mkdir -p $V/all $V/half
ffmpeg -v error -i "$MP4" -vf scale=270:480 -q:v 4 $V/all/f%04d.jpg                                   # every frame
ffmpeg -v error -i "$MP4" -vf "select=not(mod(n\,5)),scale=540:960" -vsync 0 -q:v 3 $V/half/f%04d.jpg  # 6 fps
python3 -I tools/qa/scan_spikes.py $V/all <cut frames +1, comma-separated>
python3 -I tools/qa/sheets.py $V/half $V/sheets 8 4
```
Review every spike at 30 fps (full size), every contact sheet, and crops of faces, hands and props at full
resolution. `watch.py` on the render checks cuts, fast moves landing on words, and audio sync. List each defect with
its time, find the root cause, fix in code, re-check the changed shots, ask before republishing. Report what ran, what
was found and fixed, and what was not verified.

## 12. Package for YouTube
- **Title** ("give me the seo title only" → reply with the title alone): curiosity + the impossible fact, ≤ 60
  characters before one fitting emoji, then ` #shorts`. Never promise more than the video delivers. Match the style of
  `<CHANNEL_TITLES>` (ask the user). Example shape: "He Broke Into the Same House 9 Times and Took Nothing 🏠 #shorts".
- Same title in `web/main.tsx` (`title:`) so the render is already named for upload.
- **Description:** 2–3 lines restating the hook without spoilers, 3–5 hashtags, CC-BY asset credits, the study for
  Path B. **Cover frame:** the clearest face + the key object. **Pinned comment:** a question inviting opinions.

## 13. Upload (the user)
Upload as a Short; title, description, cover frame, pinned comment; note the upload time.

## 14. Learn (after ~48 h and ~7 days)
Ask for YouTube Studio screenshots (stayed vs swiped, average view duration, retention graph, traffic sources). Never
invent numbers. Match each drop on the retention graph to that second of the film. Compare with the channel's own
Shorts. Write the lessons into `CLAUDE.md` standing preferences, then back to §2.
