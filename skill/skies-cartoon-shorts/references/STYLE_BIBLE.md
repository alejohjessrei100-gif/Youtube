# Style Bible: reference cartoon Shorts

Built from 6 reference Shorts reviewed at their full 30 fps: 10,175 frames, 340 s in total.

- **Picture:** every frame was measured for camera motion (optical flow plus RANSAC), cut and transition detection, sharpness, colour and depth of field. The transitions were also viewed frame by frame on 60-frame contact sheets.
- **Sound:** every voiceover was transcribed with word timings, and the soundtracks were measured for loudness, bed level, tempo and a spectrogram.

| ref | topic | length | words | words/s |
|---|---|---|---|---|
| v0 | Zhang Heng's earthquake jar | 64.9 s | 235 | 3.63 |
| v1 | Railroad expansion gaps | 65.2 s | 218 | 3.36 |
| v2 | Japan's "banishment rooms" | 60.6 s | 225 | 3.74 |
| v3 | Storm oil on the sea | 64.6 s | 246 | 3.82 |
| v5 | Edison's steel-ball naps | 39.1 s | 145 | 3.75 |
| v6 | Pachinko prize loophole | 45.1 s | 225 | 3.57 |

---

## 1. Format
- **Frame:** vertical 9:16 at 30 fps, 39–65 s long (median about 62 s).
- **No padding:** there's no intro, logo, end card or call to action. The first word starts at 0.00 s in all 6 videos, and the video ends 0.05–0.5 s after the last word.
- **Loudness:** −14 LUFS integrated, with a true peak of about −2 dBTP. The loudness range is only 1.8–3.5 LU, so it is heavily compressed and sounds equally loud throughout.

## 2. Script
These are the same moves in every video:

1. **The hook is a paradox stated as a fact.** It's sentence 1, 9–16 words, with no setup. It sounds dumb, illegal or impossible:
   - "He sawed gaps into a railroad every 39 feet."
   - "It's impossible to get fired in Japan, but companies found something way worse."
   - "Gambling is illegal in Japan, yet there's a gambling hall on almost every street."
   - "If you fall asleep holding two steel balls, you might wake up a genius."
2. **Setting in 1–2 lines, in the present tense.** Use concrete numbers ("every 39 feet", "until 6", "eight dragons"). The protagonist is a nameless "he" or "you" (second-person "Imagine…/you").
3. **Escalation in 3–6 beats.** Others mock or doubt the hero, often in short quoted dialogue in character:
   - "You're wrecking my railroad!"
   - "Hey, it's the toy guy! Did your frogs get hungry again?"

   The stakes climb, and there are 1–2 deadpan jokes ("Even your gaps know you were wrong").
4. **Reversal.** The doubters seem to be right ("At first, it's paradise", "nothing happened").
5. **Pivot on "You see,".** It appears in 5 of 6 videos, then comes the real mechanism, often through an everyday analogy ("Ever blown on a bowl of soup?").
6. **Ironic payoff in the last 1–2 sentences.** The video ends on the punchline:
   - "…so you wake up holding the idea instead of the balls."
   - "…and on paper, nobody gambles."

   The reference videos do **not** loop back into the hook.

- **Language:** plain spoken English with contractions. No jargon unless the next clause explains it.
- **Sentences:** about 13 words on average, with frequent one-word punches ("Then another.", "Nobody.").
- **Length:** 145–246 words. For our 45–55 s target, aim for 165–200 words.

## 3. Voice
- **Narrator:** one adult male, warm and confident, slightly amused deadpan.
- **Pace:** 3.4–3.8 words/s (median 3.7). It's fast but clear.
- **Almost no pauses:** 0–14 gaps over 0.25 s per video, and the longest gap is 0.62 s. Breaths are edited out.
- **Dialogue lines:** the narrator voices them in a slightly different character voice, with no separate actor.

## 4. Captions
- **Grouping:** one word at a time, sometimes 2–3 short words ("ball in", "The whole court"). Each word swaps hard on its onset, with no animation.
- **Style:**
  - **white** heavy sans (Montserrat ExtraBold class) with a thin black outline and a soft shadow;
  - centred horizontally, with the baseline at about **70 % of the frame height**;
  - the word is about 30 % of the frame width.
- **Engine:** `capstyle.py` now draws white text (it was yellow).

## 5. The look
- **World:** a 3D world that looks hand-painted.
  - Saturated, painterly textures (wood grain, brick, rock strata).
  - **Thin black ink lines on 3D edges and creases**, everything slightly chunky and toy-like.
- **Characters:** flat 2D cards.
  - A white circle head with a thin black outline, dot eyes, and expressive brows and mouth.
  - Stick limbs, and a costume that says who they are (chef's hat, bowler, admiral's bicorne).
  - They are **lit by the scene** (warm key, cool shadow side) and cast ground shadows.
- **Colour (per-video medians):**

  | measure | value |
  |---|---|
  | lum mean | 0.24–0.55 |
  | lum std | 0.17–0.24 |
  | p2 | 0.03–0.15 |
  | p98 | 0.83–0.98 |
  | saturation | 0.40–0.61 |

  Darks are rich but never crushed, and highlights reach white on lamps, sky and sun.
- **Lighting follows the story arc:** bright noon → golden sunset → **deep blue night with warm lamps and windows** for the climax or explanation, then morning for the payoff (v0, v3). Night is blue and readable, never black.
- **Glow:** bloom on every light source (lamps, sun, neon, fire).
- **Faces carry the jokes:**
  - a face goes purple from the chin up, with steam puffs from the ears (v1);
  - a sweat drop, eyes snapping open, glowing eyes on the key reveal (v5).

## 6. Camera
- **Never locked off.** A fully static camera appears in only 2–10 % of frames. The rest of the time it is:
  - **pushing in** (55–79 % of frames, median 0.25–0.75 % image scale per frame); or
  - **drifting or orbiting** around the subject.
- **Speed:** median 0.4–1.5 px/frame on a 360 px-wide frame, so the image is always alive but calm.
- **Bursts:** about 1 per second, each lasting 7–14 frames. Speed **peaks mid-move** (ease in and ease out). The peak is about 2–3.5 px/frame, and whips reach 20–57 px/frame (360 px wide).
- **Roll:** dutch tilt or roll is present in 19–50 % of frames, and leans harder during panic beats.
- **Lens:** a wide angle for environments (deep perspective down rails, aisles and corridors). Close-ups go almost nose-to-nose with the cards.
- **Motivated moves:**
  - **follow the object:** the oil stream from pot to sea, a ball dropping into a mouth;
  - **orbit** a character while they react (about 30° over 2 s);
  - **crane** from overhead down to the side (v0, 1580–1592);
  - **fly in** through doors or windows (v6, 137–142);
  - **snap push-in** to a detail (v0, 22–27: from the inventor to the dragon's mouth in 5 frames).

## 7. Transitions: almost never a hard cut
- **Cuts:** ffmpeg's scene detector finds **2 hard cuts in 10,175 frames**. A new angle arrives in one of four ways:
  1. **Camera move** inside the same place, 8–14 frames, ease in and out with motion blur. This is the most common.
  2. **Foreground wipe:** something passes the lens (a pillar, a train, the hero's head) and the camera is somewhere new when it clears (v0 158–166, v1 97–112).
  3. **Short crossfade**, 5–8 frames, when the place changes (v6 137–141, v1 110–112).
  4. **Whip pan** with heavy motion blur, 4–8 frames.
- **Flashes:** a 4-frame white flash is used sparingly on the biggest beat.

## 8. Blur
- **Depth of field everywhere.** The top of the frame (background) measures **4–10× softer** than the centre (subject); the top/middle sharpness ratio is 0.09–0.26.
  - Close-ups have creamy bokeh: lamps turn into soft discs.
  - Wides keep only a mild falloff.
  - Focus pulls: v2 opens blurred and racks into focus over 6 frames.
- **Motion blur on every fast move.** Whips, snap push-ins and passing foregrounds all smear. Sharpness drops 10–25 % during fast frames.

## 9. 2D effects in the 3D world
All of these are flat sprites with ink outlines, composited into the scene and lit:
- speed lines and streaks during panic (v0 143–157);
- steam puffs, sweat drops, Zzz, dust puffs and smoke clouds (v2 ejector seat);
- splash crowns (v3), sparkles, coin flips and music notes;
- **labels and diagrams** for the explanation beat:
  - a "HYPNAGOGIA" lower title (v5);
  - an awake/light/deep sleep depth gauge (v5);
  - an X-ray body with a glowing brain (v5);
  - a cork board with red string (v5);
  - newspaper props ("THE CLICKETY CLACK LINE").
- **In-world signs carry the setting:** "FIRST LINE IN GETS IT ALL!", "PRIZE HALL", "PRIZE COUNTER", "STORM OIL", "FIRE".

## 10. Sound
- **Voice:** dry, close and compressed, sitting on top of everything.
- **Music bed:**
  - **6–13 dB under the voice** (measured in the gaps between words), continuously ducked;
  - sustained pads, plucked strings and bells (horizontal partials in the spectrogram);
  - a soft pulse at about 94–105 bpm, with mood matching the story (mystery for the explanation);
  - near-mono (side channel 24–30 dB below mid).
- **Effects:**
  - about **3 high-frequency transient hits per second**, layered under the voice;
  - every visible action gets a sound: pour, splash, clang, steam hiss, ball drop, whoosh on each camera move or whip, low thumps on impacts;
  - ambience per place (sea, wind, crowd, machines);
  - effects never mask words.
- **Mix:** sidechain-ducked music, a limiter, **−14 LUFS**, and a peak around −2 dBTP.

## 11. What changed in the engine to match this
| area | before | now |
|---|---|---|
| shot changes | hard cut on every phrase (35 cuts) | same place: **camera move** (`MOVE_N` 12 f, smootherstep). New place: **7-frame crossfade** (`DIS`). Per-shot override in `TRANS_OVR` (`move`, `dissolve`, `cut`) |
| camera idle | push-in only | push-in **plus slow orbit drift** (`cu(... { orbit })`, default 0.08°/f toward the front; `orbit: 0` locks it) |
| depth of field | lens pass off (`cInf` 0) | lens pass **on**: `DOF_DEFAULT` 12 px at 1080p, focus on the look point. Per-shot `DOF_OVR` and `FOCUS` |
| motion blur | none | new `MotionBlurEffect`: directional plus radial blur from the real camera motion of each frame (180° shutter) |
| captions | yellow | white, black outline |

## 12. Checklist for every film
- [ ] The hook is a paradox, ≤16 words, with no setup. "You see," pivot. Ironic payoff on the last word.
- [ ] 165–200 words, 3.6–3.8 words/s, no gaps over 0.6 s.
- [ ] Zero accidental hard cuts. Every angle change is a move, wipe, crossfade or whip.
- [ ] The camera always moves: a push-in plus drift, and a motivated move about every second.
- [ ] The background is soft behind the subject, and fast moves smear.
- [ ] The light arc goes from day to golden to blue night, with readable warm lamps.
- [ ] 2D effect sprites on the comedy beats, and a label or diagram on the explanation beat.
- [ ] Effects on every action, the music 6–13 dB under the voice, −14 LUFS.
- [ ] White one-word captions at 70 % height.
- [ ] 2–3 skies marks, in different sets.
