# Master Video Production Blueprint

Built from a full analysis of two reference Shorts from the same channel. Both were covered start to finish: 320 s of video, about 175 shots and 1,088 spoken words.

| ref | story | length | shots | words |
|---|---|---|---|---|
| pirates | Julius Caesar ransomed by pirates | 157.4 s | ~85 | 537 |
| spy | Juan Pujol (Garbo), the WWII double agent who invented his agents | 163.2 s | ~88 | 551 |

The specialist reports behind each section, with timestamped evidence and Observed / Inferred / Assumption labels, are in `reports/`. Where reports disagreed, the resolution is stated below and marked **Resolved**.

---

## 0. The style in one paragraph

These are **true, absurd history stories** told by a fast, deadpan British narrator at about 205 wpm with no pauses. The visuals are **photoreal, cinematic AI-generated period-drama stills**, mostly held with slow 2D camera moves and sometimes animated into short clips. Every real face that looks at the camera gets **flat 2D cartoon googly eyes and a cartoon mouth** stuck on, and those carry all the emotion and comedy. One white caption word at a time sits in the centre of the frame. Cuts land on spoken words about every 1.9 s, and the picture changes about every 1.3 s. A warm golden grade turns cold steel-blue whenever the story turns dark. A quiet, dark music bed runs underneath, with almost no sound effects. The jokes come from the script and the faces, never from the sound.

**What makes it recognisable, in order of importance:**
1. The cartoon eye and mouth overlay on photoreal humans.
2. One-word centred captions, synced to the frame.
3. A deadpan "And that was X being nice" ironic story formula.
4. The warm/cool story-driven grade.
5. A fast word-synced cut rhythm.

---

## 1. Production method (how it is most likely made)

| layer | method | confidence |
|---|---|---|
| Images | Text-to-image, photoreal, generated natively at 9:16; 2–3 pose variants per set-up on the same background | [Inferred]: AI tells such as poreless skin, gibberish small text, cut-out glow edges, and the face changing between shots |
| Motion | About 70 % stills with a 2D creep/push and hard pose swaps; 15–20 % image-to-video clips of 1–3 s for physical verbs (walking, falling, galloping, flapping); 10–15 % light motion | [Inferred] from frame-difference measurements |
| Face overlay | Small reused sticker library, face-tracked, composited **before** transitions and grade (the whites take the scene tint and the blur) | [Inferred]. The tool is an [Assumption] |
| Captions | Speech-recognition output, one token per caption (it mis-hears "one" as "Juan" at spy@67.7) | [Observed] |
| Voice | One narrator for the whole channel, very compressed, breaths and pauses removed. Human vs TTS cannot be determined | [Inferred] / [Assumption] |
| Edit | Cut on word onsets from forced alignment; hard cuts plus a few blur-whips | [Observed] |

**For our skill:** stills, 2D camera moves, overlays, captions and the cut grid are all built in code (Remotion, matching your existing skills). AI image-to-video is optional, limited to the 15–20 % "physical verb" shots.

---

## 2. Story and script

### 2.1 Topic rules
A topic must pass at least 7 of these 9; items 1–3 are mandatory.
1. It is true and documented in 2 or more sources.
2. One protagonist wins through **nerve, audacity or trickery**, not force.
3. The hook can be written as **one expected reaction, inverted**, in 60 words or fewer.
4. It has 3 or more absurd, quotable, *drawable* specifics.
5. Power flips at least twice.
6. An early promise or threat pays off late.
7. The ending fits in one ironic line.
8. It has a "wait, that's real?" trigger (a famous name in a surprising role, or a nobody inside a famous event).
9. It has a visually distinctive era and stays PG-13 when told deadpan.

### 2.2 Script numbers
- 520–560 words, 28–33 sentences, 150–165 s at 200–210 wpm. The hook runs at 220–235 wpm and the last line at about 180.
- Mean sentence 16–19 words (range 5–40). 15–25 % are punches of 8 words or fewer, and about 40 % are over 20 words.
- **Every reversal is a short punch straight after a long sentence.**
- A pivot word (But / So / Instead / Which meant / Then / Until) every 8–10 s, 16–19 per video. 40–50 % of sentences open with And/So/But/Which/Then.
- At least 9 concrete specifics, about one every 15 s. Numbers are spelled out, except years.
- Use "..." 3–13 times, only right before a reveal.
- Voice: third person, past tense, deadpan British (British spelling), contractions, plain words (about 4.3 letters each), at least 4 idioms. No "!", no "?", no hype adjectives, no "you".
- Irony quota: an inverted emotion, dramatic irony, situational irony, and understatement of something brutal.

### 2.3 Beat template (~160 s, ~545 words)

| # | beat | time | words | content |
|---|---|---|---|---|
| 1 | Hook | 0–15 s | 55–60 | Opens in the middle of the action ("The [role] [did X]…"), protagonist unnamed, a number or place. The first "But" lands at 3–7 s. The paradox is stated by 15 s and closes on a 5–6-word punch. |
| 2 | Setup | 15–33 s | 50–70 | The consequence of his audacity. "So…" practical step. He is now stranded or exposed among dangerous people. An obscure hero is named here: "So [Name], a [mundane job], …" |
| 3 | Escalation ladder | 33–65 s | 100–110 | 3 or more escalating absurd details. **Plant** a promise or threat. |
| 4 | Misread | 65–82 s | 50–60 | The antagonists love or underestimate him ("absolutely loved it", "didn't suspect a thing"). |
| 5 | Midpoint turn | 82–100 s (50–55 %) | 55–65 | A flip of 9 words or fewer ("But he wasn't laughing anymore."), then a fast 3-verb action, then "too late". |
| 6 | Complication | 100–122 s | 65–75 | A third party or authority blocks or misreads him. |
| 7 | Climax | 122–145 s | 90–105 | He beats the obstacle; a big-number execution. |
| 8 | Twist payoff | 145–155 s (~94 %) | 20–60 | "…one small mercy..." then a darker or ironic twist that pays off the beat-3 plant. |
| 9 | Kicker | last 3–7 s | 9–25 | One sentence starting with "And": a name reveal or callback, said as understatement. Full stop. **No CTA, no outro.** |

**Name strategy:** a famous hero is withheld until the kicker, using 3–5 rotating epithets. An obscure hero is named at 15–20 s.

**Callbacks:** at least 2 exact phrase callbacks, and the kicker reuses a phrase or a character from the first 20 s.

**Accuracy:** compress timelines and drop secondary actors, but never invent the central event. The references take liberties of this size; for example, Pujol actually invented about 3 agents before MI5 got involved.

---

## 3. Visual style and art direction

### 3.1 Realism
- Every frame is a **photoreal cinematic period-drama still** of real-looking adults.
- Only the overlaid eyes and mouth are cartoon. Never paint, illustrate or render the people or places in 3D-cartoon style.
- Clean, digital, full-bleed 9:16: no grain, no film damage, no letterbox.

### 3.2 Identity kits (the consistency system)
- **Protagonist kit:** age, build, hair, facial hair, plus 3–4 costume items with **two signature colours**. Paste it word for word into every prompt.
- **Antagonist kit:** a second fixed outfit with a contrasting signature colour.
- Faces may drift between shots. The costume colours and the cartoon overlays carry recognition, and this is how the references work.
- **Crowds:** solid, saturated, distinct garment colours (brick red `#9b2f2a`, cobalt `#2f4f9b`, mustard `#c9a032`, bottle green `#3f6b3a`, brown `#6b4a2e`, slate `#5a6470`) and exaggerated comedic body types.

### 3.3 Environment and props
- Each scene gets 3–5 iconic period items, not museum precision.
- 2–4 mid-ground props, with the background defocused.
- Interiors always have a warm practical light (lamp, torch, fire).
- Every video includes:
  - at least 1 **aged-parchment map** (`#d9b77a` paper) with an animated red `#c0201a` route or pins
  - at least 2 **hands-only tabletop inserts**
  - money or reward as a physical prop
- **Never show swastikas or extremist symbols.** Use plain eagles or period flags instead, and show infamous figures from behind.

### 3.4 Colour grade (story-driven)

| grade | share of screen time | look | triggered by |
|---|---|---|---|
| WARM golden-amber | ~43 % | hue 25–45°, mean `#8b7351`–`#aa884d`, median luma 34–40 % | default narration, the hero winning, the final punchline |
| COOL steel blue-grey | 20–30 % | hue 200–230°, mean `#3d4b59`–`#576573`, half the chroma, luma 17–23 % | threat, money as an idea, fakery, night operations, punishment |
| MONO / sepia | small | saturation ≤ 25 %, lifted blacks | "instead of…" counterfactuals, "before…" flashbacks |
| ANGER orange-red | rare | saturated sunset | fury |
| VILLAIN tints | per story | olive `#21220b`, burgundy `#28191d`, teal-green `#454e3f` | the antagonist's spaces |

- **Grade flips:** 1–3 per video, an **instant re-grade of the same image on the turn word** (warm→cool on "bloodthirsty" at pirates@34.3; grey→warm on "Julius" at the end).
- **Tone:** low-key, with overall median luma 28–34 %. Highlights never clip (p99 at 74–89 %). Night shots crush blacks; sunny exteriors lift blacks to 10–17 %. About 50 % of shots have an oval vignette.

### 3.5 Lighting
- Soft key light at about 45° front-side.
- Fill ratio 2:1–3:1 by day and about 4:1 at night.
- A **warm rim light on hair and shoulders** in most character shots.
- Haze or god rays in large interiors.
- Window-blind light patterns in "secret / office" scenes.
- Night exteriors are blue with orange practical lights.
- Golden hour for the good stretches; time of day changes at least 3 times per video.

### 3.6 Image prompt style block (append to every prompt)
> Photorealistic cinematic film still, vertical 9:16 composition, high-budget historical drama look. Real-looking actors with natural proportions, clean smooth skin, pristine period-accurate costumes and props with rich fabric, leather, brass and wood textures. Subject centred and sharp, face fully visible and clearly lit, three-quarter or frontal view. Shallow depth of field, 50–85 mm lens at f/2.8, softly blurred detailed background. Soft large key light from front-side, gentle fill, warm golden rim light on hair and shoulders, subtle atmospheric haze. Low-key cinematic contrast with highlights held below clipping, soft oval vignette. No film grain. Colour grade: {GRADE}.

The `{GRADE}` options are WARM, COOL, NIGHT, MONO, ANGER and VILLAIN; the exact wording for each is in `reports/01`.

**Negative prompt:**
- cartoon, anime, illustration, 3D render
- text, captions, watermark
- swastika, extremist symbols, gore
- film grain, letterbox
- blown highlights
- deformed hands, obscured face, closed eyes
- anachronisms
- fisheye

---

## 4. Cartoon face overlay (the signature)

### 4.1 Coverage
- **Every face turned towards the camera gets an overlay**, including extras, crowds (down to about 12 px wide faces), photos and animal "characters".
- Target 75–85 % of shots and at least 80 % of runtime.
- Skip inserts, backs of heads, silhouettes and true profiles.

### 4.2 Look
- **Eyes and mouth only.** No cartoon brows, tears, sweat or blush. The real brows, nose, hair and moustache stay visible.
- Flat fills: white `#FFFFFF`, black `#000000`, tongue coral `#EA5B4C`, teeth white. No shading or highlights.
- Slightly irregular black outline at 6 % of eye width.

### 4.3 Library
Full SVG geometry is in `reports/02`.
- **Eyes:**
  - E1 round open
  - E2 pin-prick terror
  - E3 half-lid smug
  - E4 angry slant
  - E5 sad slant
  - E6 mischief
  - E7 closed (skin patch)
- **Mouths:**
  - M0 none
  - M1 line
  - M2 smirk
  - M3 frown
  - M4 wavy
  - M5 open D-smile with tongue
  - M6 big grin with teeth
  - M7 gasp with buck teeth
  - M8 grimace
  - M9 shout "O"
  - M10 small "o"
  - M11 sad open
- Pupils are solid, 18–22 % of eye width. Gaze is the same for both eyes and usually off-centre.

### 4.4 Size and tracking
- Each eye is 24–28 % of face width. The pair spans 60–65 %, with a gap of about 0.4 eye widths.
- Mouths: lines are 20–37 % of face width and open mouths 30–40 %. The mouth sits **under** a moustache, never over it.
- Overlays lock to face landmarks every frame: position, scale and tilt. The near eye is up to 1.4× larger in three-quarter views.
- Overlays pick up the plate's motion blur. The drawings never wobble.
- **No mouth when the real mouth is covered** by a hand or a cup.

### 4.5 Expression logic
- Expression mix: about 25 % laughing, 20 % smug, 15 % terrified, 15 % angry and 25 % other.
- **The protagonist's resting state is E3 half-lid with M1 or M0, calm and smug**, set against extreme side characters. The protagonist still uses at least 4 eye types per video.
- Each new shot gets an expression that fits its line. Inside a shot, 0–1 changes (2 at most), as a **hard one-frame swap on a narration word**, held at least 0.8 s.
- **No blinking, no lip-sync.**
- Crowds share one emotion, with small variations from face to face.

---

## 5. Camera and shots

### 5.1 Mix (per video, ±5 points)
- **Shot size:** LS 28 %, MLS 26 %, MS 20 %, insert/ECU 12 % (up to 20 % for object-heavy stories), MCU 10 %, ELS 3 %, CU 1 %.
- **Angle:** eye level about 50 %, low 20–30 % (whoever dominates), high 15–20 % and top-down 10 % (victims, crowds, maps, tables). Over-the-shoulder and back views make up 15–20 %.

### 5.2 Size by story role
| line type | shot |
|---|---|
| explanation or action | LS/MLS |
| reaction or feeling | MS/MCU/CU of the person feeling it |
| number or object | insert/ECU, top-down or POV hands |
| new place or duration | ELS/LS, entered with a blur-whip |
| abstract joke | a literal sight gag, MS |

### 5.3 Camera moves on stills
- **Default:** a creep-in of +1.5–3 % over the shot (about 1.4 %/s). Never fully locked unless the freeze is the joke.
- **Push-in:** about 1 in 3 shots, +10–18 % at 5–10 %/s.
- **Zoom punch** on punch words: +15–25 % in 0.8–1.2 s, or a punch-in cut 1.3–1.6× tighter. About one every 8–10 s.
- Pull-outs and pans are 10 % of shots or fewer.

### 5.4 Composition
- Single subjects are centred, with eyes at **28–38 % of frame height** and headroom of 5–15 %.
- **Faces never enter the caption band (44–56 % of height).** The caption may sit over a torso or an object.
- Medium shots and tighter always have shallow depth of field; wide and top-down shots are deep.

### 5.5 Staging patterns
- **Numbers become objects:** sacks fall or pins multiply in 3–5 steps about 0.3 s apart, plus a scale shot of a person next to the pile.
- **Maps:** a red line or arrows grow over 1.5–2.5 s, about once every 20–30 s of travel or strategy.
- **Imagined or hypothetical shots** are graded MONO or COOL. Flashbacks repeat an earlier composition in mono.
- **Passage of time:** 2–3 bored tableaux, or a top-down walk over falling leaves.
- **Ending:** an ironic wide payoff (ELS, 2.5–3 s), then a **smug close-up of the hero looking toward the lens** under the kicker.

### 5.6 Shot menu
There are 19 templates, T1–T19, in `reports/03`: hook tableau, establishing place, action, hero low-angle, reaction MCU, punch-in, crowd reaction, over-the-shoulder pair, object insert, number build-up, scale shot, map route, imagined scene, flashback echo, time tableau, grade-flip turn, back-view walk-off, ironic wide payoff and outro smug MCU. **The storyboard step picks from this menu.**

---

## 6. Editing, captions and sync

### 6.1 Rhythm
- **One cut every 1.85–1.95 s** (median about 1.75 s, SD about 0.8, range 0.25–4.7 s), about 85–90 shots per 160 s.
- **Something changes on screen every 1.3 s or less**: a cut, pose swap, face swap, grade flip or object appearing.
- **Hook:** 8–9 shots in the first 10 s (about 1.1–1.3 s each, first cut at 0.6–0.9 s). The first 3.5 s holds 4 shots.
- **Body:** about 1.9–2.1 s per shot, slowest in the middle third.
- **Ending:** either a slow-down (about 2.3 s) or a quick payoff montage (about 1.5 s). The last shot holds about 3 s.
- Any shot over 2.5 s must contain a pose or face swap or some motion.

### 6.2 Cut grid
- **Every cut lands on a word onset** (the caption frame, or +1 frame), never mid-word.
- Cut on **100 % of sentence starts** and on 70–85 % of after-comma phrases. Otherwise cut on the noun or verb that names the next picture.
- Pose swaps, face swaps and grade flips also land on the **payload word**, at 0 or +1 frame.

### 6.3 Transitions
- 90–94 % hard cuts.
- 6–10 % (5–8 per video) **blur-whips**: 2 frames of directional blur out, the cut on the word, then 2–3 frames of decaying blur in (0.2–0.3 s). Use them only for location or time jumps at sentence starts.
- No dissolves, flashes or white dips.

**Resolved:** the first automatic cut detector missed 48 cuts. The rhythm above uses the corrected lists (`pack/*/shots_v2.csv` plus the 7 whip cuts found by the editing agent).

### 6.4 Captions (renderer-ready)

| property | value |
|---|---|
| unit | exactly **one word per caption**, punctuation attached, never wrapped, never empty |
| font | Nunito Black 900 [Inferred], white `#FFFFFF` |
| outline | black, 0.65 % of frame width (7 px at 1080) |
| shadow | soft black, offset +5/+5 px, blur about 6 px |
| size | 88 px at 1080×1920 (8.1 % of width), centred, **baseline at 53.4 % of height** |
| timing | on = word start − 1 frame; off = the next word's on; minimum 3 frames; the last word holds to the final frame |
| animation | **none**: instant swap, no pop, colour or emphasis |
| text | sentence case, British spelling, "...", commas; no "?" or "!"; 13 characters per token at most |

**Resolved:** the README estimate of 48–50 % was wrong; the measured baseline is 53.4 %, which puts the text centre at about 52 %.

---

## 7. Audio

| element | spec |
|---|---|
| Master | **−17.5 LUFS** integrated (±0.5), loudness range ≤ 2.5 LU, true peak −0.5 dBTP |
| Voice | one consistent channel narrator: low, expressive storyteller (median f0 about 165–180 Hz, span of 18–22 semitones), **200–210 wpm**. Dry, compressed 4:1, de-essed, breaths removed, level within ±1 dB for the whole video |
| Pauses | **Resolved:** gaps between words measure about 0.1 s and **never exceed 0.3 s**, even at sentence ends (frame-accurate caption data outweighs the RMS estimate). Punctuation shows only as a slightly stretched last word |
| Music bed | always on, **14–18 dB under the voice** (about −32 dBFS). Dark, minimal, low-register underscore with no beat (or under 80 BPM) and no melody in the voice band. One cue per story, its texture changed 2–3 times (thinner in the quirky middle, low booms at the climax) |
| Ducking | static, or 3 dB at most |
| SFX | **1–3 per minute**, literal and diegetic only (phone ring, body fall, crash, climax booms), placed on the action, not the cut, and 5–12 dB under the voice. **No whooshes on cuts, no risers, no comedic stings** |
| Start and end | the first word starts at 0–0.1 s; hard stop 0.2–0.4 s after the last word; no fades, no intro or outro music |

---

## 8. Originality rules (for 100 different videos)

What changes per video:
- the story
- the era
- the locations
- the protagonist and antagonist kits
- the grade mix of villain tints
- the music cue
- which shot templates are used

What never changes:
- the overlay library and its rules
- the caption spec
- the cut grid
- the photoreal look and prompt block
- the narrator voice
- the mix spec
- the beat template

**Don't copy the reference channel:**
- Never reuse its stories (Caesar's pirates, Garbo) or recreate its specific compositions.
- Invent every character kit fresh.
- Use our own narrator voice, and our own music and SFX from royalty-free sources.

---

## 9. Style checklist (use it while planning; after a render, run `quick_check.py`)

1. Duration 150–165 s; 520–560 words; wpm 200–210.
2. The hook states the paradox by 15 s; the midpoint turn is at 50–55 %; the kicker starts with "And"; no CTA.
3. Mean shot length 1.8–2.0 s; the first 10 s has 8 or more shots; 100 % of sentence starts are cuts; every cut is on a word onset.
4. A visual change every 1.3 s or less on average; no shot over 4.7 s.
5. At least 75 % of shots carry a face overlay; no mouth over hands or cups; 2 swaps per shot at most; no lip-sync.
6. Captions are one word, the spec font, baseline at 53.4 %; no face inside the 44–56 % band.
7. The grade mix is about 43 % warm and 20–30 % cool, with 1–3 grade flips on turn words.
8. −17.5 LUFS ±0.5; bed 14–18 dB under the voice; 1–3 SFX per minute; no fades.
9. No extremist symbols; the protagonist kit is identical in every prompt.
