# What playback shows: six RicksClips Shorts, watched (2026-11-19)

Source: six recordings the user provided (360×640, 30 fps; kept locally in `media/videos/`, git-ignored). Every frame
was decoded and measured with `tools/research/watch.py`: cuts, frame-to-frame camera motion, the look of each shot,
the narration transcribed with word timings, effect onsets and loudness. All six were also looked at at 2 fps, and
every frame of the opening moves of the Jar video was inspected.

| file | Short | views | length | words | words/s |
|---|---|---|---|---|---|
| v0 | The Ancient Jar That Warned an Empire | 35M | 64.8 s | 235 | 3.63 |
| v1 | Why Perfect Railroads Don't Work | 30M | 65.2 s | 218 | 3.36 |
| v2 | The Job Nobody Wants in Japan | 18M | 60.5 s | 224 | 3.72 |
| v3 | Why Sailors Carried Storm Oil | 16M | 64.6 s | 247 | 3.84 |
| v4 | Your Brain's Secret Idea Zone | 16M | 39.1 s | 145 | 3.75 |
| v5 | The Window That Breaks Japan's Gambling Law | 16M | 45.0 s | 161 | 3.57 |

Not covered: the three others on the priority list (Burglar, Grave Bell, and the weak control "Every Memory Has a
Price"), so there is no low performer to contrast against. Recordings are 360×640: fine texture, line weight and
small facial detail can't be judged.

## Camera and editing (measured on every frame)
- **Almost no hard cuts:** 0–2 per video, only for a jump in place or time. Time skips also use a quick dissolve
  (Job video: 13.5 s, 28.5 s).
- **Instead, fast camera moves inside the set:** 10–33 per video, median 0.45–0.63 s each, eased (accelerate,
  decelerate) with motion blur. Mostly snap-pushes from a medium into a close-up of the thing just named, and swings
  across the set to the next subject. In the Jar video, f19→f28 (0.3 s) pushes from the inventor into the dragon's
  mouth; f57→f72 (0.5 s) swings across the hall to the throne.
- **They land on the word:** 90–100% of moves end while a word is being spoken, and they land on the noun ("dragon's",
  "the emperor", "a jar", "your old desk").
- **The picture changes every 1.1–1.9 s** (median gap between cuts and move landings) — roughly every 4–6 words.
- **Between moves the lens never sits still:** slow drift or push, then the next snap. Holds longer than ~3 s are rare
  and are used for jokes or reactions.
- **Camera flights carry place changes** where a cut would be: Railroads flies down the canyon, over the desert and
  into the city in one move (3.5–10.5 s); Storm Oil follows the poured oil down to the sea, then pans to the pirate
  ship (1–2.5 s) — a literal object handoff.
- **Shot vocabulary seen in motion:** face-filling close-ups for every line of dialogue; extreme low angles (rails at
  lens height); Dutch tilts; POV (phone inbox, the guard's view); top-down; through-the-window and through-doorway
  framing; macro inserts (a soup bowl rippling, the jar's pendulum seen from inside).
- **Explanations get a diagram-like insert:** a cross-section of the jar's pendulum; brain-wave depth chart; corkboard
  of ideas; earthquake cross-section through the ground.

## Acting
- Characters act constantly: lean, bounce, point, gesture; faces switch every line (smug → shocked → grin).
- **Expressions are pushed to cartoon extremes at peaks:** a face turning purple with steam puffs (Railroads 16.5 s),
  sweat drops, eyes popping.
- **Dialogue is acted in close-up**, the speaker's face filling the frame.

## Sound
- Narration starts on frame 0 in every video and the video ends 0.0–0.45 s after the last word: no intro, no outro.
- **Narration is dense and nearly pause-free:** 3.4–3.8 words/s, at most 0–3 pauses over 0.35 s per video (longest
  0.46 s). Ours: Crow ≈ 3.1 words/s, Graves ≈ 3.0, with pauses of 0.6–1.0 s.
- 5–14 sound-effect hits per video outside speech; the voice sits on top (median loudness about −18 dB, peaks −10 to
  −12 dB on the recording).

## How the scripts are built (from the transcripts)
1. **0 s: the strange action, no setup.** "He put a bronze ball in a dragon's mouth and told the emperor, if this
   ever falls out, run!" / "He sawed gaps into a railroad every 39 feet." / "He poured cooking oil into the sea."
   Or a contradiction: "It's impossible to get fired in Japan, but…", "Gambling is illegal in Japan, yet…".
2. **"You see,…": one sentence of context with stakes** (a race to finish first; pirates closing in).
3. **Someone in charge mocks or rages, in quoted dialogue:** "You're wrecking my railroad!", "…and you're making
   soup?", the whole court laughing.
4. **The hero stays calm and cryptic:** "Trust the oil." / "Steer into the storm."
5. **It gets worse for the hero:** the rival wins, the laughter doubles, the inventor is thrown out.
6. **The turn: "Then…"** — a time skip, "something weird happens", the strange thing starts to work.
7. **The explanation, aimed at the viewer, through an everyday analogy:** "Ever blown on a bowl of soup?" —
   one to three sentences over an insert.
8. **The payoff: the doubters are hit by exactly what the hero predicted**, told as a single image ("…kicks sideways
   like a snake, right as a train rolls onto it"). The video ends on that line. No moral.
- Main characters are "he", unnamed. Present tense for the action. Short words; sentences of 6–15 words.
