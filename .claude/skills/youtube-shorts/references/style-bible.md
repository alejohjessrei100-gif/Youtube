# Style bible: lessons from the reference channel (RicksClips3000)

> **STATUS (2026-11-19):** "Look", "Measured" and "Structure seen in the 80 stills" come from still images. "Motion,
> editing, sound and script (watched)" comes from six user-provided recordings watched frame by frame
> (`research/ricksclips/watched.md`). Not yet watched: a low performer, so nothing here is contrasted against a flop.

Sources: the public titles + view counts of his last 20 Shorts (read 2026-11-19) and 80 official stills from
YouTube's public image server (each video's cover + automatic stills at ~25/50/75%), measured and looked at. No video
was downloaded. Raw research: `research/ricksclips/` (dataset, per-video notes; images kept locally, git-ignored).
Stills show light, colour, sets, framing, shot sizes and structure; they say NOTHING about motion, cut timing, camera
moves or script beats — that needs screen recordings the user makes (priority list in `research/ricksclips/notes.md`).

## Measured (mean of 20 cover frames vs our Graves stills, 0..1)
| | his | ours | action |
|---|---|---|---|
| mean luminance | 0.43 | 0.61 | darker overall |
| 5th percentile (blacks) | 0.13 | 0.24 | real blacks, not grey |
| saturation | 0.45 | 0.28 | ~+60% saturation |
| deep shadow (L < 0.12) | 10% | 2% | let ~10% of the frame go to shadow |
| warmth (R-B) | +0.03 | -0.06 | slight warm bias |
| contrast (std) | 0.21 | 0.20 | same, over a wider range |

## Look
- **Light:** one strong key with real cast shadows; a motivated source in every scene (window shaft, desk lamp,
  torches, moon, lit shop windows); warm/cool contrast (orange/purple dusk, deep-blue night + warm windows).
- **Sets:** simple characters in RICH, textured worlds — brick, planks, grass blades, patterned rugs and wallpaper,
  dense props, readable signage. This contrast is the signature.
- **Camera:** lens low (~chest height), often looking slightly up, wide-lens perspective; a big foreground character
  filling the frame with a smaller one behind (depth staging); strong vanishing lines (tracks, corridors, walls).
- **Effects:** light shafts, floating particles (money, confetti), glowing practicals, exaggerated props.
- **Characters:** costume/hat = identity at a glance; brows carry the acting. (Ours keep the user's locked look.)
- **Captions:** 1–2 words per chunk, white with black outline, ~70% down the frame (ours already match).

## Structure seen in the 80 stills
- **Home set + cutaways:** one main set (the characters talking; also the cover) that the video keeps returning to
  (13/20 are back home at 50% or 75%), with illustrative cutaways in between — a blast, a crash, an army, a wave.
- **Shot variety:** medium two-shots most; face-filling close-ups; POV shots (hands on a phone, a rifle on a cart,
  the driver's seat); extreme wides (armies, races); big object inserts (gold pot, dragon jar, giant red button).
- **One spectacle beat per video:** explosion, crash, electrocution, giant wave, flying debris.
- **A colour identity per set:** pink cell, gold mine, blue night street, purple dusk, yellow store.
- **Signs carry story:** "DON'T", "FIRST LINE IN GETS IT ALL!", "MEMORIES bought & sold", "SOLD".
- **Two-handers:** a straight character + a reactor, one bigger in the foreground. Faces mostly deadpan-smug; big
  emotion saved for peaks (glowing eyes, sweat drops).

## Applying it to our films (with the user's camera rules)
- Keep the user's rule of one continuous lens inside a set; add his structure around it: a **home set** we return
  to, and **cutaways** that illustrate the narration (each its own small, rich set with a colour identity).
- Plan per film: 1 home set, 2–4 cutaways, at least one **spectacle beat**, one **POV shot**, one **big object
  insert**, one **extreme wide**, and signs that say something.
- Grade, light and set dressing as in "Look" above.

## Titles and stories
- Biggest hits pay off a clever mechanism or loophole: "The Ancient Jar That Warned an Empire" (35M), "Why Perfect
  Railroads Don't Work" (30M), "The Job Nobody Wants in Japan" (18M). Crime-like ones win when the twist is clever:
  "The Burglar Who Only Moved Furniture" (10M).
- Weakest: plain science explainers (147–327K), meme titles (55–413K), abstract premises (574K).
- Title formula: 4–7 words, no emoji, no #shorts; "Why…", "How…", "The [object] That/Who…", "This [object]…";
  one concrete object + an odd effect.

## Motion, editing, sound and script (watched: 6 videos, every frame measured)
Full notes: `research/ricksclips/watched.md`.
- **Inside a set: no cuts, fast camera moves.** 10–33 eased moves per video, 0.45–0.63 s each, with motion blur:
  snap-pushes into the thing just named, swings across the set to the next subject. Hard cuts (0–2 per video) only
  for a jump in place or time; time skips may use a quick dissolve.
- **Moves land on the spoken noun** (90–100% land during a word). **The picture changes every 1.1–1.9 s.**
- **Between moves the lens drifts;** it is never parked. Holds > 3 s only for a joke or a reaction.
- **Place changes by camera flight or object follow** (down a canyon into a city; along poured oil to the sea).
- **Shot vocabulary:** face-filling close-up for every line of dialogue, extreme low angles, Dutch tilts, POV,
  top-down, through-a-window/doorway, macro inserts, and a diagram-like insert for the explanation.
- **Acting:** constant gesture; faces change every line; cartoon extremes at peaks (purple face + steam, sweat).
- **Sound:** narration from frame 0, video ends on the last word (no outro); 3.4–3.8 words/s with almost no pauses
  (longest ≈ 0.46 s); 5–14 effect hits outside speech.
- **Script:** strange action at 0 s → "You see," context with stakes → authority mocks in quoted dialogue → hero calm
  and cryptic → it gets worse → "Then…" turn / time skip → explanation by an everyday analogy addressed to "you" →
  the doubters hit by exactly what was predicted, in one image; end on that line. Unnamed "he", present tense.

## Applying the motion rules to our films
- **Camera:** keep one continuous lens per set (the user's rule — his videos confirm it), but replace our slow drifts
  with **beats**: every 1.1–1.9 s an eased 0.4–0.6 s move (snap-push or swing) that lands on the noun being spoken,
  with a light drift in between. Build the camera from the word timings: list the nouns, give each a framing.
- **Cuts** only at changes of place or time (a quick dissolve is fine for a time skip); prefer a camera flight or an
  object follow to carry the viewer between places.
- **Dialogue in close-up,** the speaker's face filling the frame; one cartoon-extreme reaction per film.
- **An insert for the twist/explanation** (a cross-section, a diagram, a macro of the clue).
- **Ending:** cut out on the last word.
- **Narration pace (the user's call):** his narration runs 3.4–3.8 words/s with almost no pauses; ours runs about 3.0
  with 0.6–1.0 s pauses. The standing rule is to keep pauses; matching him would mean a faster or tighter read.
- **Our script shape stays** (the user's proven "crime that isn't"), told his way: strange act at 0 s, someone in
  charge reacting in quoted dialogue, a "Then…" turn, an everyday-analogy explanation, end on the payoff image.
