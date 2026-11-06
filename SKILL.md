---
name: football-comedy-short
description: Make a vertical 3D football comedy short: absurd matchups, absurd challenges, football theories, GOAT debates and fake stat analysis, played completely straight. Uses only the repo's own animation/SFX/VFX code, a locked bean-character design and a retro pixel-overlay style. Use for any football comedy short request.
---

# Football comedy short: premise → script → voiceover → video

Output: 1080x1920, 30 fps, the length of the user's own voiceover.

## Rule 1: Resources come from this repo only
- Every animation, sound effect and visual effect must come from files in this repo. Cite each one by its exact filename (and function) in the script, shot list and prompts, e.g. `football-kit/sfx/football_sfx.py → whistle("full_time")`.
- Allowed sources:
  - `football-kit/sfx/football_sfx.py`: `whistle("pip"|"long"|"full_time")`, `ball_kick(power)`, `net_swish()`, `stadium_chant()`
  - `football-kit/characters/bean.js`: `makeBean()` (hair: cap, bun, old, ponytail), `setFace()`, `pose()` (incl. ponytail `tail` / `tailSwing`), `makeCrowd()`
  - `football-kit/font/pixelfont.js`: `drawPixelText()`, `measurePixelText()`
  - `cartoon-short-kit.zip → templates/audio/sfx_gen.py` (whoosh, oof, whoa, babble, hurrah, applause, push_thump, boot, creak, clink, rattle, wood_crack, splash_big, bird_chirps, crickets, breeze, flag_flutter…), `templates/audio/sfx.py` (_cheer, _murmur, _groans, _oofs, _bounces…), `music.py`, `instruments.py`, `mix.py`
  - `cartoon-short-kit.zip` / `cartoon-audio-short.zip → example/soldier/audio.py` (thunk, rumble, crash, scrape, ting, sting, snap, splash, snore, drum)
  - `engine/motion.js` (`M.back`, `M.anticip`, `M.spring`, `M.easeOut`, `M.smooth`, `camFromKeys`, `spline`, `idle`, `blinkAt`, `walk`)
  - `toon.txt.zip → toon.txt` (fxBurst, fxPuff, fxStars, fxRing, fxSplash, fxCloud, fxSign, fxShadow, fxContact, fxNote), `templates/bridge/grade.ts`, `lensblur.ts`, `ink.ts`, `engine/paint.js`
  - `three.module.js.zip` (three.js)
- Never take animation, SFX or VFX ideas from reference videos. References are only for the character design (Rule 2) and the overlay layout (Rule 3).
- If a needed resource is not in the repo, say so and ask before making it. If the user approves, add it as code in the repo first, then cite it.

## Rule 2: Characters stay the same
Build every character with `football-kit/characters/bean.js`. Never redesign them. Paste this block word for word into every image and video prompt:

> **CHARACTER STYLE:** Soft-shaded 3D toon figures, smooth matte plastic look, no outlines, warm key light, soft round contact shadow. **Head:** an oversized smooth sphere, about 45% of total height, warm beige skin (some characters medium brown). Hair is a smooth solid cap hugging the top and back of the sphere (dark brown or black), or bald with small white side tufts for old characters. No ears, no nose. **Face:** painted flat on the sphere. Two large white oval eyes with thick black rims and small black pupils. Thick black brush-stroke eyebrows that carry the emotion (smug, lidded, angry, slanted). A thin black curved line mouth, or an open dark-red mouth with white teeth. **Body:** a short rounded bean torso as wide as the head, in a red football shirt with a white number on the chest and back, and short rounded white shorts. **Limbs:** very thin straight stick arms in skin tone with rounded tips and no hands. Long thin straight stick legs (about 40% of height) ending in small round black shoe blobs. **Proportions:** head 1 : torso 0.9 : legs 1.1. **Crowd:** rows of simple peg people (a capsule body with a sphere head) in team colours.

- Only kit colours, numbers, skin tone, hair (`cap`, `bun`, `old`, `ponytail`) and expression (`FACES`) may change between characters.
- Real players may be the topic (e.g. "Is Ronaldo really the GOAT?"). On screen they are played by bean characters, identified only by a gold name tag (Rule 3) and their shirt number. Never model a real person's likeness or caricature their face or body.
- Jokes about real players stay on football: form, stats, celebrations, injuries, transfers, rivalries. Nothing about private lives, race, religion or family, and nothing that mocks appearance or body (a signature trait used as a superpower, like a ponytail, is fine).
- Fake stats must be obviously comedic (e.g. "SIUUU PER GOAL: 1.00"). Never present a made-up number as a real record.

## Rule 3: Overlay style (retro pixel HUD)
All on-screen text uses `football-kit/font/pixelfont.js`, except captions and big beat words.
- **Score bug, top-left:** a dark navy box with a thin light border and a red team badge, like `MUN 0-0 ANT 40'`.
- **Captions:** one word at a time, lowercase, bold white sans with a soft shadow, centred just below the middle of the screen.
- **Stat cards:** a dark navy panel with a gold border, a gold pixel title and white pixel rows. They come as stat lists, blue/red bar charts with percentages, counters ("ATTENDANCE"), checkboxes ("WORK DONE ✓") and star ratings.
- **Status pills:** small bordered boxes in uppercase pixel text, like "ASSIST: THE WIND".
- **Name tags:** small gold boxes with black pixel text and a pointer, above the character's head.
- **Big beat words:** chunky white extruded comic text with a black outline and a slight tilt ("PENALTY??", "POST!"). Coloured variants: green box, or red tilted box.
- **Extras:**
  - `20' >> FAST FORWARD` time jumps
  - white pixel speech bubbles
  - floating `? ? ?`
  - a FULL TIME card
  - a red end call-to-action: "MOST LIKED COMMENT DECIDES THE NEXT VIDEO"
- **Setting:** blue sky with pixel-art clouds.

## Rule 4: Script (comedy rules)
1. First, give the user exactly 5 premises with a one-line comic angle and the twist for each. Then wait for them to pick one. Mix the formats:
   - **Absurd matchups:** "Can Manchester United beat a dying ant?"
   - **Absurd challenges:** "Can [club/player] do [absurd thing]?", e.g. "Can Arsenal win a match without passing once?" or "Can Haaland score a goal using only his hair?"
   - **GOAT and legacy debates:** "Is Ronaldo really the GOAT?"
   - **Stat analysis:** "Is Eden Hazard better than Messi at dribbling?"
   - **Football theories and investigations:** curses, conspiracies, "why does X always happen?"
2. For the chosen premise:
   - **Hook in the first 2 seconds:** the absurd question or bold claim, asked straight.
   - **A joke or escalation every 5–7 seconds,** with no dead air.
   - **Play it completely seriously:** fake stats, dramatic commentary, "expert" analysis. Back these with stat cards from Rule 3.
   - **End on a twist or punchline that pays off the hook.**
   - **Lines are short and punchy,** written for a voiceover the user records themselves (about 3.7 words/s).
3. Deliver:
   - the script in a copyable block, with word count and estimated length
   - a shot list naming the exact resource file/function for every animation, SFX and VFX cue (Rule 1)
   - the overlays per shot (Rule 3)
4. Ask for the voiceover. Then build, render a stills sheet for approval, and do the full render.

## Build notes
- Render with three.js from `three.module.js.zip`. Composite overlays on a 2D canvas over the WebGL frame, as in `football-kit/preview/preview.js`.
- Preview the cast and overlays with `node football-kit/preview/preview.mjs out.png`.
- Generate SFX preview WAVs with `python3 football-kit/sfx/football_sfx.py <dir>`. Mix with `templates/audio/mix.py` from `cartoon-short-kit.zip`.
